import { getItem, RARITY_INFO } from '../data/items';
import { getRank } from '../data/ranks';
import { deriveStats, unlockStage } from './progression';
import type { Rng } from './rng';
import { uid } from './rng';
import type { GameEvent, GameState, InventoryEntry, SfxName, ToastKind } from './types';

/** Context passed to every state-changing action. */
export interface Ctx {
  now: number;
  rng: Rng;
  events: GameEvent[];
}

export function makeCtx(rng: Rng = Math.random, now = Date.now()): Ctx {
  return { now, rng, events: [] };
}

export function toast(ctx: Ctx, kind: ToastKind, title: string, text?: string) {
  ctx.events.push({ type: 'toast', kind, title, text });
}

export function sfx(ctx: Ctx, name: SfxName) {
  ctx.events.push({ type: 'sfx', name });
}

export class GameError extends Error {}

export type ExpSource = 'study' | 'battle' | 'quest' | 'other';

export function gainExp(s: GameState, amount: number, source: ExpSource) {
  amount = Math.max(0, Math.floor(amount));
  if (!amount) return 0;
  s.player.totalExp += amount;
  s.day.expEarned += amount;
  if (source === 'study') s.stats.expFromStudy += amount;
  else if (source === 'battle') s.stats.expFromBattle += amount;
  else if (source === 'quest') s.stats.expFromQuests += amount;
  else s.stats.expFromOther += amount;
  return amount;
}

/** Adds gold. `applyBonus` applies the LUK/equipment gold bonus. Returns gold actually gained. */
export function gainGold(s: GameState, amount: number, applyBonus = false) {
  let g = Math.max(0, amount);
  if (applyBonus) g = g * (1 + deriveStats(s).goldBonus / 100);
  g = Math.floor(g);
  if (!g) return 0;
  s.player.gold += g;
  s.stats.goldEarned += g;
  s.day.goldEarned += g;
  return g;
}

export function spendGold(s: GameState, amount: number) {
  amount = Math.floor(amount);
  if (amount < 0) throw new GameError('잘못된 금액');
  if (s.player.gold < amount) throw new GameError('골드가 부족합니다.');
  s.player.gold -= amount;
  s.stats.goldSpent += amount;
  s.day.goldSpent += amount;
}

export function staminaMax(s: GameState) {
  return getRank(unlockStage(s)).staminaMax;
}

/** Natural stamina gains are capped; bonus sources (quests, items) may exceed the cap. */
export function gainStamina(s: GameState, amount: number, capped: boolean) {
  const before = s.player.stamina;
  if (capped) {
    const max = staminaMax(s);
    if (before >= max) return 0;
    s.player.stamina = Math.min(max, before + amount);
  } else {
    s.player.stamina = before + amount;
  }
  return s.player.stamina - before;
}

export function clampVitals(s: GameState) {
  const d = deriveStats(s);
  s.player.hp = Math.max(0, Math.min(d.maxHp, Math.round(s.player.hp)));
  s.player.mp = Math.max(0, Math.min(d.maxMp, Math.round(s.player.mp)));
}

export function healPct(s: GameState, pct: number) {
  const d = deriveStats(s);
  const before = s.player.hp;
  s.player.hp = Math.min(d.maxHp, s.player.hp + Math.round((d.maxHp * pct) / 100));
  s.player.mp = Math.min(d.maxMp, s.player.mp + Math.round((d.maxMp * pct) / 100));
  return s.player.hp - before;
}

export function fullHeal(s: GameState) {
  const d = deriveStats(s);
  s.player.hp = d.maxHp;
  s.player.mp = d.maxMp;
}

// ── Inventory ────────────────────────────────────────────────
export function isStackable(itemId: string) {
  const def = getItem(itemId);
  return def.category === 'consumable' || def.category === 'special';
}

/**
 * Adds an item. Cosmetics are unlocked into `ownedCosmetics` (duplicates
 * are converted to gold). Returns a short label for notifications.
 */
export function addItem(s: GameState, itemId: string, qty = 1, ctx?: Ctx, notify = true): { label: string; converted?: number } {
  const def = getItem(itemId);
  if (!Array.isArray(s.discovered)) s.discovered = [];
  if (!s.discovered.includes(itemId)) s.discovered.push(itemId);
  if (def.category === 'character' && def.character) {
    if (s.ownedCharacters.includes(def.character)) {
      const refund = Math.round(RARITY_INFO[def.rarity].value * 0.5);
      gainGold(s, refund);
      if (ctx && notify) toast(ctx, 'item', '중복 캐릭터 → 골드 변환', `${def.name} → ${refund} G`);
      return { label: def.name, converted: refund };
    }
    s.ownedCharacters.push(def.character);
    if (ctx && notify) toast(ctx, 'item', 'NEW CHARACTER!', def.name.replace('캐릭터: ', ''));
    return { label: def.name };
  }
  if (def.category === 'cosmetic') {
    if (s.ownedCosmetics.includes(itemId)) {
      const refund = Math.round(RARITY_INFO[def.rarity].value * 0.5);
      gainGold(s, refund);
      if (ctx && notify) toast(ctx, 'item', '중복 외형 → 골드 변환', `${def.name} → ${refund} G`);
      return { label: def.name, converted: refund };
    }
    s.ownedCosmetics.push(itemId);
    if (ctx && notify) toast(ctx, 'item', 'ITEM ACQUIRED', `${def.name} (외형 해금)`);
    return { label: def.name };
  }
  if (isStackable(itemId)) {
    const ex = s.inventory.find((e) => e.itemId === itemId);
    if (ex) ex.qty += qty;
    else s.inventory.push({ uid: uid('i'), itemId, qty, plus: 0, obtainedAt: ctx?.now ?? Date.now() });
  } else {
    for (let i = 0; i < qty; i++) {
      s.inventory.push({ uid: uid('i'), itemId, qty: 1, plus: 0, obtainedAt: ctx?.now ?? Date.now() });
    }
  }
  const label = qty > 1 ? `${def.name} ×${qty}` : def.name;
  if (ctx && notify) toast(ctx, 'item', 'ITEM ACQUIRED', label);
  return { label };
}

export function findEntry(s: GameState, uidOrItem: string): InventoryEntry | undefined {
  return s.inventory.find((e) => e.uid === uidOrItem) ?? s.inventory.find((e) => e.itemId === uidOrItem);
}

export function countItem(s: GameState, itemId: string) {
  return s.inventory.filter((e) => e.itemId === itemId).reduce((a, e) => a + e.qty, 0);
}

export function isEquipped(s: GameState, entryUid: string) {
  return Object.values(s.player.equipment).includes(entryUid);
}

/** Removes qty of an inventory entry (by uid). */
export function removeEntry(s: GameState, entryUid: string, qty = 1) {
  const idx = s.inventory.findIndex((e) => e.uid === entryUid);
  if (idx < 0) throw new GameError('아이템을 찾을 수 없습니다.');
  const e = s.inventory[idx];
  if (e.qty < qty) throw new GameError('수량이 부족합니다.');
  e.qty -= qty;
  if (e.qty <= 0) {
    s.inventory.splice(idx, 1);
    for (const k of Object.keys(s.player.equipment) as (keyof typeof s.player.equipment)[]) {
      if (s.player.equipment[k] === entryUid) s.player.equipment[k] = null;
    }
  }
}

export function recordMonsterSeen(s: GameState, id: string, level: number, now: number) {
  const r = (s.monsters[id] ||= { seen: 0, defeated: 0 });
  r.seen++;
  r.maxLevel = Math.max(r.maxLevel || 0, level);
  if (!r.firstAt) r.firstAt = now;
}
