import { describe, expect, it } from 'vitest';
import { createInitialState } from '../initialState';
import { executeCommand, type Command } from '../commands';
import { simulate, SIM_STEP } from '../simulation/civilization';
import { processQuests } from '../quests/questSystem';
import { checkPlacement } from '../building/placement';
import { getTechStatus } from '../research/researchSystem';
import { deserialize, serialize, sanitizeGameState } from '../save/saveSystem';
import { ORE_VEINS } from '../../data/world';
import { xpToNext } from '../progression/progression';
import { grantXp } from '../progression/rewards';
import type { GameEvent, GameState } from '../types';

function run(state: GameState, cmd: Command): GameState {
  const r = executeCommand(state, cmd);
  if (!r.ok) throw new Error(`${cmd.type} failed: ${r.reason}`);
  return processQuests(r.state, r.events).state;
}

function sim(state: GameState, seconds: number) {
  let s = state;
  const events: GameEvent[] = [];
  let report;
  for (let t = 0; t < seconds; t += SIM_STEP) {
    const r = simulate(s, SIM_STEP, { playerX: 0, playerZ: 0, prev: report });
    report = r.report;
    const q = processQuests(r.state, r.events);
    s = q.state;
    events.push(...r.events, ...q.events);
  }
  return { state: s, events, report: report! };
}

describe('core gameplay loop', () => {
  it('collects resources without duplicate collection from depleted nodes', () => {
    let s = createInitialState();
    s = run(s, { type: 'collectNode', nodeId: 'n_iron_1' });
    s = run(s, { type: 'collectNode', nodeId: 'n_iron_1' });
    s = run(s, { type: 'collectNode', nodeId: 'n_iron_1' });
    expect(s.inventory.iron).toBe(9);
    expect(s.nodes.n_iron_1.charges).toBe(0);
    const again = executeCommand(s, { type: 'collectNode', nodeId: 'n_iron_1' });
    expect(again.ok).toBe(false);
    // node regenerates after its regen time
    const later = sim(s, 61).state;
    expect(later.nodes.n_iron_1.charges).toBe(3);
  });

  it('refuses unaffordable buildings and builds a generator that powers the lab', () => {
    let s = createInitialState();
    expect(checkPlacement(s, 'power_generator', 10, 10).ok).toBe(false);
    s = { ...s, inventory: { ...s.inventory, iron: 10, copper: 5 } };
    expect(checkPlacement(s, 'power_generator', 10, 10).ok).toBe(true);
    let r = sim(s, 1);
    expect(r.state.buildings[0].state).toBe('unpowered');
    s = run(r.state, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
    expect(s.inventory.iron).toBe(0);
    expect(s.buildings).toHaveLength(2);
    r = sim(s, 2);
    expect(r.report.generation).toBe(10);
    expect(r.state.buildings.find((b) => b.type === 'research_lab')!.state).toBe('operational');
    // surplus power charges the energy store
    expect(r.state.inventory.energy).toBeGreaterThan(0);
  });

  it('cannot research without prerequisites; research completes with a powered lab', () => {
    let s = createInitialState();
    s = { ...s, inventory: { ...s.inventory, iron: 100, copper: 100, silicon: 100, research: 100 } };
    expect(executeCommand(s, { type: 'startResearch', tech: 'automated_mining' }).ok).toBe(false);
    s = run(s, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
    s = run(s, { type: 'startResearch', tech: 'basic_semiconductors' });
    expect(getTechStatus(s, 'basic_semiconductors')).toBe('researching');
    const r = sim(s, 21);
    expect(r.state.research.completed).toContain('basic_semiconductors');
    expect(getTechStatus(r.state, 'automated_mining')).toBe('available');
  });

  it('automated miner produces only when powered and on a vein; shortage shuts it down', () => {
    let s = createInitialState();
    s = {
      ...s,
      research: { completed: ['basic_semiconductors', 'automated_mining'], active: null },
      inventory: { ...s.inventory, iron: 120, copper: 100, silicon: 50, mining_component: 2 },
    };
    const vein = ORE_VEINS.find((v) => v.resource === 'iron')!;
    expect(checkPlacement(s, 'auto_miner', 30, 30).ok).toBe(false); // not on a vein
    s = run(s, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
    s = run(s, { type: 'placeBuilding', building: 'auto_miner', x: vein.position[0], z: vein.position[1], rotation: 0 });
    // 10 kW generation: lab (6, priority 1) is served first, the miner (8) does not fit
    const states: string[] = [];
    let r = sim(s, 0.25);
    for (let i = 0; i < 120; i++) {
      r = sim(r.state, 0.25);
      states.push(r.state.buildings.find((b) => b.type === 'auto_miner')!.state);
    }
    expect(r.report.deficit || r.report.unpowered > 0).toBe(true);
    expect(states).toContain('unpowered');
    // the higher-priority laboratory is never shut down
    expect(r.state.buildings.find((b) => b.type === 'research_lab')!.state).toBe('operational');
    // battery hysteresis: no tick-by-tick flicker
    let switches = 0;
    for (let i = 1; i < states.length; i++) if (states[i] !== states[i - 1]) switches++;
    expect(switches).toBeLessThan(12);
    const ironLowPower = r.state.inventory.iron;
    const r1 = sim(r.state, 20);
    const producedLowPower = r1.state.inventory.iron - ironLowPower;
    // add another generator -> miner operates continuously and produces more
    s = run(r1.state, { type: 'placeBuilding', building: 'power_generator', x: 14, z: 4, rotation: 0 });
    const before = s.inventory.iron;
    const r2 = sim(s, 20);
    expect(r2.state.buildings.find((b) => b.type === 'auto_miner')!.state).toBe('operational');
    expect(r2.state.inventory.iron - before).toBeGreaterThan(producedLowPower);
    expect(r2.report.deficit).toBe(false);
  });

  it('progression formula levels up with XP', () => {
    const s = createInitialState();
    const r = grantXp(s, xpToNext(1) + 1);
    expect(r.state.player.level).toBe(2);
    expect(r.events.some((e) => e.type === 'levelUp')).toBe(true);
  });

  it('quest 1 completes from real collection events and grants rewards once', () => {
    let s = createInitialState();
    s = run(s, { type: 'discoverZone', zone: 'outpost' });
    for (const id of ['n_iron_1', 'n_iron_2']) for (let i = 0; i < 2; i++) s = run(s, { type: 'collectNode', nodeId: id });
    s = run(s, { type: 'collectNode', nodeId: 'n_copper_1' });
    expect(s.quests.q1_first_contact.status).toBe('active');
    s = run(s, { type: 'collectNode', nodeId: 'n_copper_1' });
    expect(s.quests.q1_first_contact.status).toBe('completed');
    expect(s.quests.q2_restore_power.status).toBe('active');
    expect(s.inventory.gold).toBe(50);
  });

  it('defeating enemies grants rewards and starts respawn timer', () => {
    let s = createInitialState();
    s = run(s, { type: 'defeatEnemy', spawnId: 'e_meadow_1', seed: 42 });
    expect(s.enemies.e_meadow_1.alive).toBe(false);
    expect(s.inventory.gold).toBeGreaterThan(20);
    expect(s.player.xp).toBeGreaterThan(0);
    expect(executeCommand(s, { type: 'defeatEnemy', spawnId: 'e_meadow_1', seed: 1 }).ok).toBe(false);
  });

  it('crafting consumes resources and produces an item via a powered workshop', () => {
    let s = createInitialState();
    s = { ...s, inventory: { ...s.inventory, iron: 100, copper: 100, gold: 100 } };
    expect(executeCommand(s, { type: 'queueCraft', recipe: 'reinforced_sword' }).ok).toBe(false); // no workshop
    s = run(s, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
    s = run(s, { type: 'placeBuilding', building: 'power_generator', x: 16, z: 4, rotation: 0 });
    s = run(s, { type: 'placeBuilding', building: 'workshop', x: 20, z: -6, rotation: 0 });
    s = run(s, { type: 'queueCraft', recipe: 'reinforced_sword' });
    const iron = s.inventory.iron;
    const r = sim(s, 5);
    expect(r.state.inventory.reinforced_sword).toBe(1);
    expect(r.state.inventory.iron).toBe(iron);
    s = run(r.state, { type: 'equip', item: 'reinforced_sword' });
    expect(s.player.equipment.weapon).toBe('reinforced_sword');
    expect(s.inventory.rusty_blade).toBe(1);
  });

  it('save data round-trips and invalid data falls back safely', () => {
    let s = createInitialState();
    s = { ...s, inventory: { ...s.inventory, iron: 10, copper: 5 } };
    s = run(s, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 1 });
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.game.buildings).toHaveLength(2);
      expect(loaded.game.buildings[1].rotation).toBe(1);
    }
    expect(deserialize('not json').ok).toBe(false);
    const bad = sanitizeGameState({ inventory: { iron: -50, fake_item: 9 }, buildings: [{ id: 'x', type: 'nope' }] });
    expect(bad.inventory.iron).toBe(0);
    expect(bad.inventory.fake_item).toBeUndefined();
    expect(bad.buildings.every((b) => b.type !== 'nope')).toBe(true);
  });
});
