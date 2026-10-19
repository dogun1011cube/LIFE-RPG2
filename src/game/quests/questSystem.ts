import { QUESTS } from '../../data/quests';
import { count } from '../resources/inventory';
import { grantReward } from '../progression/rewards';
import type { GameEvent, GameState, QuestDef, QuestObjective, QuestProgress } from '../types';

export function initialQuestState(): Record<string, QuestProgress> {
  const out: Record<string, QuestProgress> = {};
  QUESTS.forEach((q, i) => {
    out[q.id] = { status: i === 0 ? 'active' : 'locked', counters: q.objectives.map(() => 0), done: q.objectives.map(() => false) };
  });
  return out;
}

export function activeQuest(state: GameState): QuestDef | undefined {
  return QUESTS.find((q) => state.quests[q.id]?.status === 'active');
}

/** Event-driven progress for counting objectives. */
function counterDelta(obj: QuestObjective, ev: GameEvent): number {
  switch (obj.type) {
    case 'collect':
      return ev.type === 'gained' && ev.id === obj.resource && (ev.source === 'collect' || ev.source === 'drop') ? ev.amount : 0;
    case 'kill':
      return ev.type === 'killed' && ev.enemy === obj.enemy ? 1 : 0;
    case 'produce':
      return ev.type === 'produced' && ev.building === obj.building ? ev.amount : 0;
    default:
      return 0;
  }
}

/** State-driven checks for non-counting objectives. */
function stateSatisfied(state: GameState, obj: QuestObjective, counter: number): boolean {
  switch (obj.type) {
    case 'reach':
      return state.discovered.includes(obj.zone);
    case 'kill':
      // Lifetime kills count, so defeating the target before the quest is active still counts
      return Math.max(counter, state.stats.kills[obj.enemy] ?? 0) >= obj.amount;
    case 'collect':
    case 'produce':
      return counter >= obj.amount;
    case 'build':
      return state.buildings.filter((b) => b.type === obj.building && !b.prebuilt).length >= obj.amount;
    case 'research':
      return obj.tech === 'any' ? state.research.completed.length > 0 : state.research.completed.includes(obj.tech);
    case 'condition':
      if (obj.condition === 'labPowered') return state.buildings.some((b) => b.type === 'research_lab' && b.state === 'operational');
      if (obj.condition.startsWith('hasItem:')) return count(state.inventory, obj.condition.slice(8)) > 0;
      return false;
  }
}

export function objectiveTarget(obj: QuestObjective) {
  return 'amount' in obj ? obj.amount : 1;
}

/**
 * Applies events to quest counters, evaluates completion, grants rewards through the
 * central reward system, and activates the next quest.
 */
export function processQuests(state: GameState, events: GameEvent[]): { state: GameState; events: GameEvent[] } {
  let s = state;
  const out: GameEvent[] = [];
  // Loop: completing one quest may immediately satisfy the next (e.g. already built)
  for (let guard = 0; guard < QUESTS.length; guard++) {
    const quest = activeQuest(s);
    if (!quest) break;
    const prog = s.quests[quest.id];
    const counters = prog.counters.slice();
    const done = prog.done.slice();
    quest.objectives.forEach((obj, i) => {
      for (const ev of events) counters[i] += counterDelta(obj, ev);
      if (!done[i] && stateSatisfied(s, obj, counters[i])) done[i] = true;
    });
    const complete = done.every(Boolean);
    const quests = { ...s.quests, [quest.id]: { status: complete ? ('completed' as const) : ('active' as const), counters, done } };
    s = { ...s, quests };
    if (!complete) break;
    out.push({ type: 'questCompleted', quest: quest.id });
    const r = grantReward(s, quest.reward, 'reward');
    s = r.state;
    out.push(...r.events);
    const idx = QUESTS.findIndex((q) => q.id === quest.id);
    const next = QUESTS[idx + 1];
    if (next) {
      s = { ...s, quests: { ...s.quests, [next.id]: { ...s.quests[next.id], status: 'active' } } };
      out.push({ type: 'questStarted', quest: next.id });
    }
    // Events already consumed by the finished quest are not re-counted for the next one
    events = [];
  }
  return { state: s, events: out };
}

/** Display helper: current/target progress for an objective (sticky once done). */
export function objectiveStatus(state: GameState, questId: string, index: number): { current: number; target: number; done: boolean } {
  const quest = QUESTS.find((q) => q.id === questId);
  const prog = state.quests[questId];
  if (!quest || !prog) return { current: 0, target: 1, done: false };
  const obj = quest.objectives[index];
  const target = objectiveTarget(obj);
  if (prog.done[index] || prog.status === 'completed') return { current: target, target, done: true };
  let current = 0;
  if (obj.type === 'kill') current = Math.max(prog.counters[index], state.stats.kills[obj.enemy] ?? 0);
  else if (obj.type === 'collect' || obj.type === 'produce') current = prog.counters[index];
  else if (obj.type === 'build') current = state.buildings.filter((b) => b.type === obj.building && !b.prebuilt).length;
  else current = stateSatisfied(state, obj, prog.counters[index]) ? 1 : 0;
  return { current: Math.min(target, Math.floor(current)), target, done: current >= target };
}
