import { add } from '../resources/inventory';
import { getCapacities } from '../research/modifiers';
import type { Cost, GameEvent, GameState, Reward } from '../types';
import { PROGRESSION, getPlayerStats, xpToNext } from './progression';

type Source = 'collect' | 'reward' | 'production' | 'craft' | 'drop';

/**
 * Centralized reward handling. Every XP gain and every resource/item grant from
 * gameplay (collection, combat drops, quests, production) flows through here.
 */
export function grantStacks(state: GameState, stacks: Cost, source: Source): { state: GameState; events: GameEvent[]; added: Cost } {
  const { inv, added } = add(state.inventory, stacks, getCapacities(state));
  const events: GameEvent[] = Object.entries(added).map(([id, amount]) => ({ type: 'gained', id, amount: amount ?? 0, source }));
  const stats = { ...state.stats, collected: { ...state.stats.collected } };
  if (source === 'collect' || source === 'drop') {
    for (const [id, amount] of Object.entries(added)) stats.collected[id] = (stats.collected[id] ?? 0) + (amount ?? 0);
  }
  return { state: { ...state, inventory: inv, stats }, events, added };
}

export function grantXp(state: GameState, amount: number): { state: GameState; events: GameEvent[] } {
  if (amount <= 0) return { state, events: [] };
  let { level, xp } = state.player;
  const events: GameEvent[] = [];
  xp += Math.round(amount);
  while (level < PROGRESSION.maxLevel && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    events.push({ type: 'levelUp', level });
  }
  if (level >= PROGRESSION.maxLevel) xp = Math.min(xp, xpToNext(level));
  let next: GameState = { ...state, player: { ...state.player, level, xp } };
  if (events.length > 0) {
    // Level up fully restores health
    next = { ...next, player: { ...next.player, hp: getPlayerStats(next).maxHp } };
  }
  return { state: next, events };
}

export function grantReward(state: GameState, reward: Reward, source: Source = 'reward') {
  let s = state;
  const events: GameEvent[] = [];
  if (reward.stacks) {
    const r = grantStacks(s, reward.stacks, source);
    s = r.state;
    events.push(...r.events);
  }
  if (reward.xp) {
    const r = grantXp(s, reward.xp);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}
