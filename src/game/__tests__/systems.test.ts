import { describe, expect, it } from 'vitest';
import { createInitialState } from '../initialState';
import { executeCommand } from '../commands';
import { simulate } from '../simulation/civilization';
import { processQuests } from '../quests/questSystem';
import { checkPlacement } from '../building/placement';
import { getCapacities } from '../research/modifiers';
import { grantStacks } from '../progression/rewards';
import { damagePlayer, respawnPlayer } from '../combat/combatSystem';
import { ORE_VEINS } from '../../data/world';
import type { GameState } from '../types';

const rich = (s: GameState): GameState => ({
  ...s,
  inventory: { ...s.inventory, iron: 150, copper: 150, silicon: 150, alloy: 150, research: 150, gold: 500, mining_component: 3 },
});

describe('building placement validation', () => {
  it('rejects out-of-bounds, overlapping and tech-locked placements', () => {
    const s = rich(createInitialState());
    expect(checkPlacement(s, 'power_generator', 80, 0).ok).toBe(false); // outside build zone
    expect(checkPlacement(s, 'power_generator', 0, -12).ok).toBe(false); // HQ
    expect(checkPlacement(s, 'smelter', 10, 10).reason).toContain('필요 기술');
    const r = executeCommand(s, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(checkPlacement(r.state, 'power_generator', 11, 10).reason).toContain('겹칩니다');
    expect(checkPlacement(s, 'power_generator', 10, 10, { x: 10, z: 10 }).reason).toContain('플레이어');
  });

  it('respects max counts and refunds half on demolition', () => {
    let s = rich(createInitialState());
    for (const [x, z] of [[10, 10], [18, 4], [-20, -14]]) {
      const r = executeCommand(s, { type: 'placeBuilding', building: 'workshop', x, z, rotation: 0 });
      expect(r.ok).toBe(true);
      if (r.ok) s = r.state;
    }
    expect(checkPlacement(s, 'workshop', 28, -4).reason).toContain('최대');
    const iron = s.inventory.iron;
    const r = executeCommand(s, { type: 'demolishBuilding', id: s.buildings[1].id });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.inventory.iron).toBe(iron + 6);
    expect(executeCommand(s, { type: 'demolishBuilding', id: 'b_outpost_lab' }).ok).toBe(false);
  });
});

describe('simulation rules', () => {
  it('disabled buildings stop consuming and producing', () => {
    let s = rich(createInitialState());
    s = { ...s, research: { completed: ['basic_semiconductors', 'automated_mining'], active: null } };
    const vein = ORE_VEINS[1];
    for (const [b, x, z] of [['power_generator', 10, 10], ['power_generator', 16, 4], ['auto_miner', vein.position[0], vein.position[1]]] as const) {
      const r = executeCommand(s, { type: 'placeBuilding', building: b, x, z, rotation: 0 });
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    const miner = s.buildings.find((b) => b.type === 'auto_miner')!;
    const t = executeCommand(s, { type: 'toggleBuilding', id: miner.id });
    if (!t.ok) throw new Error();
    let st = t.state;
    const before = st.inventory[vein.resource];
    for (let i = 0; i < 40; i++) st = simulate(st, 0.25, { playerX: 0, playerZ: 0 }).state;
    expect(st.inventory[vein.resource]).toBe(before);
    expect(st.buildings.find((b) => b.id === miner.id)!.state).toBe('disabled');
  });

  it('production stops at storage capacity', () => {
    let s = createInitialState();
    const caps = getCapacities(s);
    s = { ...s, inventory: { ...s.inventory, iron: caps.iron! } };
    const g = grantStacks(s, { iron: 10 }, 'collect');
    expect(g.state.inventory.iron).toBe(caps.iron);
    expect(Object.keys(g.added)).toHaveLength(0);
  });

  it('smelter reports missing inputs instead of producing', () => {
    let s = rich(createInitialState());
    s = { ...s, research: { completed: ['improved_alloys'], active: null } };
    for (const [b, x, z] of [['power_generator', 10, 10], ['smelter', 18, 2]] as const) {
      const r = executeCommand(s, { type: 'placeBuilding', building: b, x, z, rotation: 0 });
      if (!r.ok) throw new Error(r.reason);
      s = r.state;
    }
    s = { ...s, inventory: { ...s.inventory, iron: 0 } };
    const r = simulate(s, 0.25, { playerX: 0, playerZ: 0 });
    expect(r.state.buildings.find((b) => b.type === 'smelter')!.state).toBe('no_input');
  });

  it('enemies respawn only after the timer and when the player is far away', () => {
    let s = createInitialState();
    const r = executeCommand(s, { type: 'defeatEnemy', spawnId: 'e_meadow_1', seed: 3 });
    if (!r.ok) throw new Error();
    s = r.state;
    for (let i = 0; i < 200; i++) s = simulate(s, 0.25, { playerX: 64, playerZ: 2 }).state; // 50 s, player at spawn
    expect(s.enemies.e_meadow_1.alive).toBe(false);
    s = simulate(s, 0.25, { playerX: 0, playerZ: 0 }).state;
    expect(s.enemies.e_meadow_1.alive).toBe(true);
  });
});

describe('combat and progression', () => {
  it('defense mitigates damage but never below 1; death costs 10% gold', () => {
    let s = createInitialState();
    s = { ...s, player: { ...s.player, equipment: { ...s.player.equipment, armor: 'composite_armor' } } };
    expect(damagePlayer(s, 5).dealt).toBe(1);
    expect(damagePlayer(s, 20).dealt).toBe(13);
    s = { ...s, inventory: { ...s.inventory, gold: 100 } };
    const d = respawnPlayer(s);
    expect(d.goldLost).toBe(10);
    expect(d.state.inventory.gold).toBe(90);
  });

  it('boss kill objective counts lifetime kills', () => {
    let s = createInitialState();
    const r = executeCommand(s, { type: 'defeatEnemy', spawnId: 'e_boss', seed: 9 });
    if (!r.ok) throw new Error();
    s = r.state;
    expect(s.inventory.ancient_core).toBe(1);
    // jump ahead to quest 5
    const quests = { ...s.quests };
    for (const id of ['q1_first_contact', 'q2_restore_power', 'q3_first_discovery', 'q4_automation']) quests[id] = { ...quests[id], status: 'completed' };
    quests.q5_dangerous_territory = { ...quests.q5_dangerous_territory, status: 'active' };
    s = { ...s, quests, discovered: ['corruption'] };
    const q = processQuests(s, []);
    expect(q.state.quests.q5_dangerous_territory.status).toBe('completed');
    expect(q.state.quests.q6_genesis.status).toBe('active');
  });
});
