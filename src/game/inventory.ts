import { getItem, ITEMS, itemValue, RARITY_INFO } from '../data/items';
import { CHESTS } from '../data/world';
import type { Ctx } from './core';
import { addItem, clampVitals, GameError, gainExp, gainGold, gainStamina, isEquipped, removeEntry, sfx, spendGold, toast } from './core';
import { deriveStats } from './progression';
import { pick, randInt, uid as makeUid, weighted } from './rng';
import { rollItemOfRarity } from './loot';
import type { EquipPosition, GameState, InventoryEntry, Rarity } from './types';
import { RARITIES } from './types';

export const MAX_PLUS = 10;
export const UPGRADE_RATES = [100, 95, 90, 80, 70, 60, 50, 40, 30, 20];

export function upgradeCost(entry: InventoryEntry) {
  const def = getItem(entry.itemId);
  const base = def.price || RARITY_INFO[def.rarity].value;
  return Math.ceil(Math.max(20, base * 0.22) * (entry.plus + 1));
}

export function sellPrice(entry: InventoryEntry) {
  return Math.max(1, Math.floor(itemValue(getItem(entry.itemId), entry.plus) * 0.4));
}

function entryOf(s: GameState, uid: string) {
  const e = s.inventory.find((x) => x.uid === uid);
  if (!e) throw new GameError('아이템을 찾을 수 없습니다.');
  return e;
}

export function positionsFor(slot: string): EquipPosition[] {
  return slot === 'accessory' ? ['acc1', 'acc2'] : [slot as EquipPosition];
}

export function equip(s: GameState, ctx: Ctx, uid: string, pos?: EquipPosition) {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  if (def.category !== 'equipment' || !def.slot) throw new GameError('장착할 수 없는 아이템입니다.');
  if (isEquipped(s, uid)) return;
  const positions = positionsFor(def.slot);
  const target = pos && positions.includes(pos) ? pos : positions.find((p) => !s.player.equipment[p]) ?? positions[0];
  s.player.equipment[target] = uid;
  clampVitals(s);
  toast(ctx, 'item', 'EQUIPPED', def.name);
  sfx(ctx, 'confirm');
}

export function unequip(s: GameState, ctx: Ctx, pos: EquipPosition) {
  const uid = s.player.equipment[pos];
  if (!uid) return;
  s.player.equipment[pos] = null;
  clampVitals(s);
  sfx(ctx, 'cancel');
}

export function sellItem(s: GameState, ctx: Ctx, uid: string, qty = 1) {
  const e = entryOf(s, uid);
  if (isEquipped(s, uid)) throw new GameError('장착 중인 아이템은 판매할 수 없습니다.');
  qty = Math.max(1, Math.min(qty, e.qty));
  const price = sellPrice(e) * qty;
  const def = getItem(e.itemId);
  removeEntry(s, uid, qty);
  gainGold(s, price);
  toast(ctx, 'gold', 'SOLD', `${def.name}${qty > 1 ? ' ×' + qty : ''} → +${price} G`);
  sfx(ctx, 'coin');
  return price;
}

export function upgradeItem(s: GameState, ctx: Ctx, uid: string): boolean {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  if (def.category !== 'equipment') throw new GameError('장비만 강화할 수 있습니다.');
  if (e.plus >= MAX_PLUS) throw new GameError('이미 최대 강화 단계입니다.');
  const cost = upgradeCost(e);
  spendGold(s, cost);
  const rate = UPGRADE_RATES[e.plus];
  const ok = ctx.rng() * 100 < rate;
  if (ok) {
    e.plus += 1;
    s.stats.upgradesSucceeded += 1;
    toast(ctx, 'item', 'UPGRADE SUCCESS', `${def.name} +${e.plus}`);
    sfx(ctx, 'upgradeOk');
  } else {
    toast(ctx, 'warn', 'UPGRADE FAILED', `${def.name} 강화 실패 (장비는 무사합니다)`);
    sfx(ctx, 'upgradeFail');
  }
  clampVitals(s);
  return ok;
}

export interface ChestResult {
  gold: number;
  items: string[];
}

export function openChest(s: GameState, ctx: Ctx, tier: 'bronze' | 'silver' | 'gold'): ChestResult {
  const cfg = CHESTS[tier];
  const gold = gainGold(s, randInt(ctx.rng, cfg.gold[0], cfg.gold[1]), true);
  const items: string[] = [];
  for (let i = 0; i < cfg.items; i++) {
    let rarity = weighted(ctx.rng, cfg.weights);
    if (i === 0 && cfg.guarantee && !cfg.guarantee.includes(rarity)) rarity = cfg.guarantee[0];
    const it = rollItemOfRarity(ctx.rng, rarity, { gacha: true });
    addItem(s, it.id, 1, ctx, false);
    items.push(it.id);
  }
  s.stats.chestsOpened += 1;
  return { gold, items };
}

export interface UseResult {
  kind: string;
  text: string;
  chest?: ChestResult;
}

/** Uses a consumable outside of battle. */
export function useItem(s: GameState, ctx: Ctx, uid: string): UseResult {
  const e = entryOf(s, uid);
  const def = getItem(e.itemId);
  const u = def.use;
  if (!u) throw new GameError('사용할 수 없는 아이템입니다.');
  const d = deriveStats(s);
  let res: UseResult;
  switch (u.type) {
    case 'heal': {
      if (s.player.hp >= d.maxHp && s.player.mp >= d.maxMp) throw new GameError('HP와 MP가 이미 가득 찼습니다.');
      const hp0 = s.player.hp;
      const mp0 = s.player.mp;
      if (u.full) {
        s.player.hp = d.maxHp;
        s.player.mp = d.maxMp;
      } else {
        s.player.hp = Math.min(d.maxHp, s.player.hp + (u.hp || 0));
        s.player.mp = Math.min(d.maxMp, s.player.mp + (u.mp || 0));
      }
      res = { kind: 'heal', text: `HP +${s.player.hp - hp0} · MP +${s.player.mp - mp0}` };
      sfx(ctx, 'heal');
      break;
    }
    case 'stamina': {
      const g = gainStamina(s, u.amount, false);
      res = { kind: 'stamina', text: `기력 +${g}` };
      sfx(ctx, 'heal');
      break;
    }
    case 'studyBuff': {
      s.player.studyBuff.expPct = Math.max(s.player.studyBuff.expPct, u.expPct || 0);
      s.player.studyBuff.goldPct = Math.max(s.player.studyBuff.goldPct, u.goldPct || 0);
      res = { kind: 'buff', text: '다음 공부 기록에 보너스가 적용됩니다.' };
      sfx(ctx, 'buff');
      break;
    }
    case 'exp': {
      gainExp(s, u.amount, 'other');
      res = { kind: 'exp', text: `EXP +${u.amount}` };
      sfx(ctx, 'buff');
      break;
    }
    case 'chest': {
      const chest = openChest(s, ctx, u.tier);
      res = { kind: 'chest', text: `+${chest.gold} G`, chest };
      sfx(ctx, 'chest');
      break;
    }
    case 'realReward': {
      if (s.realReward && s.realReward.until > ctx.now) throw new GameError('이미 진행 중인 보상 타이머가 있습니다.');
      s.realReward = { name: u.label, startedAt: ctx.now, until: ctx.now + u.minutes * 60000 };
      res = { kind: 'reward', text: `${u.label} ${u.minutes}분 타이머 시작!` };
      sfx(ctx, 'confirm');
      break;
    }
    default:
      throw new GameError('전투 중에만 사용할 수 있습니다.');
  }
  removeEntry(s, uid, 1);
  s.stats.itemsUsed += 1;
  toast(ctx, 'item', `USED: ${def.name}`, res.text);
  return res;
}

export function setCosmetic(s: GameState, ctx: Ctx, kind: 'title' | 'cape' | 'aura', itemId: string | null) {
  if (itemId && !s.ownedCosmetics.includes(itemId)) throw new GameError('보유하지 않은 외형입니다.');
  s.player.cosmetics[kind] = itemId;
  sfx(ctx, 'confirm');
}

// ── Synthesis (합성) ─────────────────────────────────────────
// 3 unequipped pieces of equipment of the same rarity + gold
// → 1 random piece of equipment of the next rarity.
// If all three materials share a slot, the result has that slot too.
export const SYNTH_COUNT = 3;
export const SYNTH_COST: Record<Rarity, number> = { common: 60, uncommon: 200, rare: 600, epic: 1800, legendary: 6000, mythic: 0 };
export const SYNTH_GREAT_CHANCE = 0.1;

export function nextRarity(r: Rarity): Rarity | null {
  const i = RARITIES.indexOf(r);
  return i >= 0 && i < RARITIES.length - 1 ? RARITIES[i + 1] : null;
}

/** Equipment entries that can be used as synthesis material. */
export function synthCandidates(s: GameState, rarity?: Rarity): InventoryEntry[] {
  return s.inventory.filter((e) => {
    const d = getItem(e.itemId);
    return d.category === 'equipment' && !isEquipped(s, e.uid) && (!rarity || d.rarity === rarity) && d.rarity !== 'mythic';
  });
}

export function synthResultPool(target: Rarity, slot?: string) {
  const base = ITEMS.filter((i) => i.category === 'equipment' && i.rarity === target && i.gacha && !i.unique);
  if (slot) {
    const same = base.filter((i) => i.slot === slot);
    if (same.length) return same;
  }
  return base;
}

export interface SynthCheck {
  ok: boolean;
  reason?: string;
  rarity?: Rarity;
  target?: Rarity;
  cost?: number;
  slot?: string;
}

export function checkSynthesis(s: GameState, uids: string[]): SynthCheck {
  if (new Set(uids).size !== SYNTH_COUNT || uids.length !== SYNTH_COUNT) return { ok: false, reason: `같은 등급 장비 ${SYNTH_COUNT}개를 넣어 주세요.` };
  const entries = uids.map((u) => s.inventory.find((e) => e.uid === u));
  if (entries.some((e) => !e)) return { ok: false, reason: '아이템을 찾을 수 없습니다.' };
  const defs = entries.map((e) => getItem(e!.itemId));
  if (defs.some((d) => d.category !== 'equipment')) return { ok: false, reason: '장비만 합성할 수 있습니다.' };
  if (entries.some((e) => isEquipped(s, e!.uid))) return { ok: false, reason: '장착 중인 장비는 합성 재료로 쓸 수 없습니다.' };
  const rarity = defs[0].rarity;
  if (defs.some((d) => d.rarity !== rarity)) return { ok: false, reason: '재료는 모두 같은 등급이어야 합니다.' };
  const target = nextRarity(rarity);
  if (!target) return { ok: false, reason: '신화 등급은 더 이상 합성할 수 없습니다.' };
  const slot = defs.every((d) => d.slot === defs[0].slot) ? defs[0].slot : undefined;
  return { ok: true, rarity, target, cost: SYNTH_COST[rarity], slot };
}

export interface SynthResult {
  uid: string;
  itemId: string;
  plus: number;
  great: boolean;
  sameSlot: boolean;
}

export function synthesize(s: GameState, ctx: Ctx, uids: string[]): SynthResult {
  const chk = checkSynthesis(s, uids);
  if (!chk.ok) throw new GameError(chk.reason);
  spendGold(s, chk.cost!);
  const item = pick(ctx.rng, synthResultPool(chk.target!, chk.slot));
  const great = ctx.rng() < SYNTH_GREAT_CHANCE;
  const plus = great ? randInt(ctx.rng, 1, 3) : 0;
  for (const u of uids) removeEntry(s, u, 1);
  const newUid = makeUid('i');
  s.inventory.push({ uid: newUid, itemId: item.id, qty: 1, plus, obtainedAt: ctx.now });
  s.stats.synthesized += 1;
  toast(ctx, 'item', great ? 'SYNTHESIS — 대성공!' : 'SYNTHESIS SUCCESS', `${item.name}${plus ? ' +' + plus : ''} (${RARITY_INFO[item.rarity].ko})`);
  sfx(ctx, great || RARITIES.indexOf(item.rarity) >= 4 ? 'gachaLegend' : 'gachaRare');
  return { uid: newUid, itemId: item.id, plus, great, sameSlot: !!chk.slot };
}

/**
 * Picks three materials of a rarity: prefers three pieces of the same slot (so the
 * result keeps that slot), then the least valuable ones (non-unique, lowest upgrade first).
 */
export function autoPickSynth(s: GameState, rarity: Rarity): string[] {
  const score = (e: InventoryEntry) => {
    const d = getItem(e.itemId);
    return (d.unique ? 1e9 : 0) + e.plus * 1e6 + itemValue(d, e.plus);
  };
  const sorted = synthCandidates(s, rarity).slice().sort((a, b) => score(a) - score(b));
  const bySlot = new Map<string, InventoryEntry[]>();
  for (const e of sorted) {
    const slot = getItem(e.itemId).slot || '';
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot)!.push(e);
  }
  let best: InventoryEntry[] | null = null;
  for (const group of bySlot.values()) {
    if (group.length < SYNTH_COUNT) continue;
    const trio = group.slice(0, SYNTH_COUNT);
    if (!best || trio.reduce((a, e) => a + score(e), 0) < best.reduce((a, e) => a + score(e), 0)) best = trio;
  }
  return (best ?? sorted.slice(0, SYNTH_COUNT)).map((e) => e.uid);
}
