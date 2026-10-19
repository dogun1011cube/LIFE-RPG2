import { ENEMIES } from '../../data/enemies';
import { ENEMY_SPAWNS, OUTPOST_RESPAWN } from '../../data/world';
import { grantReward } from '../progression/rewards';
import { PROGRESSION, getPlayerStats, mitigate } from '../progression/progression';
import { randInt } from '../../utils/math';
import { terrainHeight } from '../world/terrain';
import type { Cost, GameEvent, GameState, SystemResult } from '../types';

// Combat tuning
export const COMBAT = {
  attackCooldown: 0.5,
  attackRange: 2.9,
  attackArc: Math.PI * 0.75, // total arc in front of the player
  playerInvulnerability: 0.7,
  enemyHitStun: 0.3,
  knockback: 7,
  hazardDps: 5,
  regenDelay: 6,
  regenRate: 2,
  outpostRegenRate: 8,
};

export function rollDrops(type: string, rng: () => number): Cost {
  const def = ENEMIES[type];
  const out: Cost = {};
  if (!def) return out;
  for (const d of def.drops) {
    if (rng() <= d.chance) out[d.id] = (out[d.id] ?? 0) + randInt(rng, d.min, d.max);
  }
  return out;
}

/** Marks an enemy as defeated and grants XP + drops through the central reward system. */
export function defeatEnemy(state: GameState, spawnId: string, rng: () => number): SystemResult & { drops?: Cost } {
  const spawn = ENEMY_SPAWNS.find((s) => s.id === spawnId);
  if (!spawn) return { ok: false, reason: 'unknown enemy' };
  const persist = state.enemies[spawnId];
  if (persist && !persist.alive) return { ok: false, reason: 'already defeated' };
  const def = ENEMIES[spawn.type];
  const drops = rollDrops(spawn.type, rng);
  let s: GameState = {
    ...state,
    enemies: {
      ...state.enemies,
      [spawnId]: { alive: false, respawnIn: def.respawnTime ?? 0, defeats: (persist?.defeats ?? 0) + 1 },
    },
    stats: { ...state.stats, kills: { ...state.stats.kills, [spawn.type]: (state.stats.kills[spawn.type] ?? 0) + 1 } },
  };
  const events: GameEvent[] = [{ type: 'killed', enemy: spawn.type }];
  const r = grantReward(s, { xp: def.xp, stacks: drops }, 'drop');
  s = r.state;
  events.push(...r.events);
  return { ok: true, state: s, events, drops };
}

export function damagePlayer(state: GameState, raw: number, ignoreDefense = false): { state: GameState; died: boolean; dealt: number } {
  const stats = getPlayerStats(state);
  const dealt = ignoreDefense ? Math.max(1, Math.round(raw)) : mitigate(raw, stats.defense);
  const hp = Math.max(0, state.player.hp - dealt);
  return { state: { ...state, player: { ...state.player, hp } }, died: hp <= 0, dealt };
}

export function healPlayer(state: GameState, amount: number): GameState {
  const max = getPlayerStats(state).maxHp;
  if (state.player.hp >= max) return state;
  return { ...state, player: { ...state.player, hp: Math.min(max, state.player.hp + amount) } };
}

/** Death rule: lose 10% of gold, respawn at the outpost with full health. */
export function respawnPlayer(state: GameState): { state: GameState; goldLost: number } {
  const gold = state.inventory.gold ?? 0;
  const goldLost = Math.floor(gold * PROGRESSION.deathGoldPenalty);
  const [x, z] = OUTPOST_RESPAWN;
  const next: GameState = {
    ...state,
    inventory: { ...state.inventory, gold: gold - goldLost },
    player: {
      ...state.player,
      hp: getPlayerStats(state).maxHp,
      deaths: state.player.deaths + 1,
      position: [x, terrainHeight(x, z), z],
    },
  };
  return { state: next, goldLost };
}
