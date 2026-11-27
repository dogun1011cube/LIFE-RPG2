import { produce } from 'immer';
import { useSyncExternalStore } from 'react';
import { getItem } from '../data/items';
import { rankIndex, RANKS } from '../data/ranks';
import { SKILLS } from '../data/skills';
import type { Ctx } from '../game/core';
import { addItem, clampVitals, fullHeal, GameError, gainGold, makeCtx } from '../game/core';
import { currentRank, deriveStats, levelFromExp, unlockStage } from '../game/progression';
import { detectQuestCompletion } from '../game/quests';
import type { GameEvent, GameState } from '../game/types';
import { addSnapshot, writeSave } from './persistence';

// ─────────────────────────────────────────────────────────────
// Game store: a single immutable GameState updated through `act()`.
// Every action runs inside an immer draft → atomic (a thrown GameError
// leaves the state untouched), then post-processing detects level-ups,
// rank-ups and quest completion, then the save is written.
// ─────────────────────────────────────────────────────────────

type Listener = () => void;
let state: GameState | null = null;
const listeners = new Set<Listener>();
const eventListeners = new Set<(events: GameEvent[]) => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedAt = 0;
const saveListeners = new Set<(t: number) => void>();

export function getState(): GameState {
  if (!state) throw new Error('Game not loaded');
  return state;
}

export function hasState() {
  return !!state;
}

/** Replaces the whole state (load / new game / import / restore). The previous save is rotated into the backup slot. */
export function setState(next: GameState | null, save = true) {
  state = next;
  listeners.forEach((l) => l());
  if (next && save) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (writeSave(next, true)) {
      lastSavedAt = Date.now();
      saveListeners.forEach((cb) => cb(lastSavedAt));
    }
  }
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useGame(): GameState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useMaybeGame(): GameState | null {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function onEvents(cb: (events: GameEvent[]) => void) {
  eventListeners.add(cb);
  return () => {
    eventListeners.delete(cb);
  };
}

export function emitEvents(events: GameEvent[]) {
  if (events.length) eventListeners.forEach((cb) => cb(events));
}

export function onSaved(cb: (t: number) => void) {
  saveListeners.add(cb);
  return () => {
    saveListeners.delete(cb);
  };
}

export function saveNow() {
  if (!state) return false;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const ok = writeSave(state);
  if (ok) {
    lastSavedAt = Date.now();
    saveListeners.forEach((cb) => cb(lastSavedAt));
  }
  return ok;
}

export function getLastSavedAt() {
  return lastSavedAt;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 350);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}

export type ActResult<T> = { ok: true; value: T; events: GameEvent[] } | { ok: false; error: string; events: GameEvent[] };

/** Level-ups / rank-ups / quests — run after every action on the draft. */
function postProcess(before: GameState, d: GameState, ctx: Ctx) {
  const lvB = levelFromExp(before.player.totalExp);
  const lvA = levelFromExp(d.player.totalExp);
  if (lvA > lvB) {
    const sb = deriveStats(before);
    const sa = deriveStats(d);
    const gains: Record<string, number> = {
      'MAX HP': sa.maxHp - sb.maxHp,
      'MAX MP': sa.maxMp - sb.maxMp,
      ATK: sa.atk - sb.atk,
      DEF: sa.def - sb.def,
      MATK: sa.matk - sb.matk,
      STR: sa.str - sb.str,
      INT: sa.int - sb.int,
      DEX: sa.dex - sb.dex,
      LUK: sa.luk - sb.luk,
    };
    const rewards: string[] = [];
    let gold = 0;
    for (let L = lvB + 1; L <= lvA; L++) {
      gold += 20 * L;
      if (L % 10 === 0) {
        addItem(d, 'chest_silver', 1, ctx, false);
        rewards.push(`Lv ${L} 달성 보상: 은 보물상자`);
      } else if (L % 5 === 0) {
        addItem(d, 'chest_bronze', 1, ctx, false);
        rewards.push(`Lv ${L} 달성 보상: 청동 보물상자`);
      }
      for (const sk of SKILLS) if (sk.level === L) rewards.push(`새 스킬 습득: ${sk.name}`);
    }
    const g = gainGold(d, gold);
    rewards.unshift(`레벨업 보상: +${g} G`, 'HP·MP 완전 회복');
    fullHeal(d);
    ctx.events.push({ type: 'levelUp', from: lvB, to: lvA, gains, rewards });
    ctx.events.push({ type: 'sfx', name: 'levelUp' });
  }
  // content unlock stages (base thresholds)
  const stage = unlockStage(d);
  if (rankIndex(stage) > rankIndex(d.stageSeen)) {
    for (let i = rankIndex(d.stageSeen) + 1; i <= rankIndex(stage); i++) {
      const def = RANKS[i];
      ctx.events.push({ type: 'toast', kind: 'rank', title: 'NEW CONTENT UNLOCKED', text: def.perks.join(' · ') });
    }
    ctx.events.push({ type: 'sfx', name: 'rankUp' });
    d.stageSeen = stage;
  }
  const rank = currentRank(d);
  if (rankIndex(rank) > rankIndex(d.rankSeen)) {
    ctx.events.push({ type: 'rankUp', from: d.rankSeen, to: rank });
    ctx.events.push({ type: 'toast', kind: 'rank', title: 'RANK UP', text: `${d.rankSeen} → ${rank}` });
    d.rankSeen = rank;
  }
  detectQuestCompletion(d, ctx);
  clampVitals(d);
}

export function act<T>(fn: (d: GameState, ctx: Ctx) => T, opts: { silentErrors?: boolean } = {}): ActResult<T> {
  if (!state) return { ok: false, error: 'not loaded', events: [] };
  const ctx = makeCtx();
  const before = state;
  let value: T | undefined;
  try {
    const next = produce(before, (draft) => {
      value = fn(draft as GameState, ctx);
      postProcess(before, draft as GameState, ctx);
    });
    if (next.day.number !== before.day.number) addSnapshot(before, `DAY ${before.day.number} 종료 시점`);
    state = next;
    listeners.forEach((l) => l());
    scheduleSave();
    emitEvents(ctx.events);
    return { ok: true, value: value as T, events: ctx.events };
  } catch (e) {
    const msg = e instanceof GameError ? e.message : e instanceof Error ? e.message : String(e);
    if (!(e instanceof GameError)) console.error(e);
    const events: GameEvent[] = opts.silentErrors ? [] : [{ type: 'toast', kind: 'warn', title: '알림', text: msg }, { type: 'sfx', name: 'error' }];
    emitEvents(events);
    return { ok: false, error: msg, events };
  }
}

/** Convenience used by the UI to show item names. */
export function itemName(id: string) {
  return getItem(id).name;
}
