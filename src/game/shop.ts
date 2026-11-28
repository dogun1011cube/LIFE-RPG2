import { getItem, ITEMS } from '../data/items';
import { rankAtLeast, stageReqText } from '../data/ranks';
import { GACHA } from '../data/world';
import type { Ctx } from './core';
import { addItem, GameError, sfx, spendGold, toast } from './core';
import { rollItemOfRarity } from './loot';
import { unlockStage } from './progression';
import { hashStr, pick, seeded, weighted } from './rng';
import type { GameState, GachaRecord, ItemDef, Rarity, ShopTab } from './types';
import { RARITIES } from './types';

export function shopItems(tab: ShopTab): ItemDef[] {
  return ITEMS.filter((i) => i.shop === tab);
}

export function canBuy(s: GameState, def: ItemDef) {
  return rankAtLeast(unlockStage(s), def.minRank);
}

export const DEAL_DISCOUNT = 0.3;

/** A rotating "daily deal" (one per RPG day), seeded by the day number. */
export function dailyDeal(s: GameState): ItemDef {
  const rank = unlockStage(s);
  const pool = ITEMS.filter((i) => i.shop && i.shop !== 'special' && i.category === 'equipment' && rankAtLeast(rank, i.minRank));
  const rng = seeded(hashStr('deal' + s.day.number));
  return pick(rng, pool.length ? pool : ITEMS.filter((i) => i.shop === 'consumables'));
}

export function dealPrice(def: ItemDef) {
  return Math.floor(def.price * (1 - DEAL_DISCOUNT));
}

export function dealBought(s: GameState) {
  return s.tower.flags['deal_day'] === s.day.number;
}

export function buyItem(s: GameState, ctx: Ctx, itemId: string, qty = 1, opts: { price?: number; deal?: boolean } = {}) {
  const def = getItem(itemId);
  if (!def.shop && opts.price === undefined) throw new GameError('판매하지 않는 아이템입니다.');
  if (!canBuy(s, def) && !opts.deal && opts.price === undefined) throw new GameError(`아직 해금되지 않은 아이템입니다. (${stageReqText(def.minRank!)} 달성 시 해금)`);
  if (opts.deal && dealBought(s)) throw new GameError('오늘의 특가는 이미 구매했습니다.');
  qty = Math.max(1, Math.min(99, Math.floor(qty)));
  const unit = opts.price ?? def.price;
  spendGold(s, unit * qty);
  addItem(s, itemId, qty, ctx, false);
  s.stats.itemsBought += qty;
  if (opts.deal) s.tower.flags['deal_day'] = s.day.number;
  toast(ctx, 'item', 'ITEM ACQUIRED', `${def.name}${qty > 1 ? ' ×' + qty : ''} (−${unit * qty} G)`);
  sfx(ctx, 'coin');
}

// ── Gacha ────────────────────────────────────────────────────
export interface GachaResult {
  itemId: string;
  rarity: Rarity;
  converted?: number;
  pity?: boolean;
}

function rollRarity(ctx: Ctx): Rarity {
  return weighted(ctx.rng, GACHA.rates);
}

/** Gacha characters (item ids) the player does not own yet. */
export function unownedCharacterItems(s: GameState): ItemDef[] {
  return ITEMS.filter((i) => i.category === 'character' && i.character && !s.ownedCharacters.includes(i.character));
}

/** One gacha roll (pity, history, item grant). Does not charge gold. */
function rollOnce(s: GameState, ctx: Ctx, forceRare: boolean): GachaResult {
  let item: ItemDef | null = null;
  let pity = false;
  // character summon: independent small chance, with its own hard pity
  const unowned = unownedCharacterItems(s);
  if (unowned.length && (s.gacha.charPity + 1 >= GACHA.charPity || ctx.rng() * 100 < GACHA.charRate)) {
    item = pick(ctx.rng, unowned);
    s.gacha.charPity = 0;
  } else {
    if (unowned.length) s.gacha.charPity += 1;
    let rarity = rollRarity(ctx);
    if (s.gacha.pity + 1 >= GACHA.pity && RARITIES.indexOf(rarity) < RARITIES.indexOf('legendary')) {
      rarity = 'legendary';
      pity = true;
    }
    if (forceRare && RARITIES.indexOf(rarity) < 2) rarity = 'rare';
    item = rollItemOfRarity(ctx.rng, rarity, { gacha: true });
  }
  if (RARITIES.indexOf(item.rarity) >= RARITIES.indexOf('legendary')) s.gacha.pity = 0;
  else s.gacha.pity += 1;
  const res = addItem(s, item.id, 1, ctx, false);
  const rec: GachaRecord = { at: ctx.now, itemId: item.id, rarity: item.rarity, converted: res.converted };
  s.gacha.history.unshift(rec);
  return { itemId: item.id, rarity: item.rarity, converted: res.converted, pity };
}

export function gachaPull(s: GameState, ctx: Ctx, count: 1 | 10): GachaResult[] {
  const cost = count === 10 ? GACHA.multi : GACHA.single;
  spendGold(s, cost);
  const results: GachaResult[] = [];
  for (let i = 0; i < count; i++) {
    // 10-pull guarantee: at least one Rare or better
    const forceRare = count === 10 && i === 9 && !results.some((r) => RARITIES.indexOf(r.rarity) >= 2);
    results.push(rollOnce(s, ctx, forceRare));
  }
  s.gacha.history = s.gacha.history.slice(0, 200);
  s.gacha.pulls += count;
  s.day.gachaPulls += count;
  return results;
}

// ── Auto summon (자동 소환) ──────────────────────────────────
export interface AutoGachaOptions {
  stopAt: Rarity; // stop as soon as an item of this rarity or better appears
  maxPulls: number;
}

export interface AutoGachaResult {
  results: GachaResult[];
  stopReason: 'target' | 'max' | 'gold';
  spent: number;
  bestIndex: number;
}

export function autoGachaMaxCost(maxPulls: number) {
  return GACHA.auto * maxPulls;
}

/**
 * Pulls one at a time at the premium auto price until an item of `stopAt`
 * rarity (or better) appears, `maxPulls` is reached, or gold runs out.
 */
export function autoGacha(s: GameState, ctx: Ctx, opts: AutoGachaOptions): AutoGachaResult {
  const maxPulls = Math.max(1, Math.min(100, Math.floor(opts.maxPulls)));
  if (s.player.gold < GACHA.auto) throw new GameError(`골드가 부족합니다. (자동 소환 1회 ${GACHA.auto} G)`);
  const target = RARITIES.indexOf(opts.stopAt);
  const results: GachaResult[] = [];
  let spent = 0;
  let stopReason: AutoGachaResult['stopReason'] = 'max';
  while (results.length < maxPulls) {
    if (s.player.gold < GACHA.auto) {
      stopReason = 'gold';
      break;
    }
    spendGold(s, GACHA.auto);
    spent += GACHA.auto;
    const r = rollOnce(s, ctx, false);
    results.push(r);
    if (RARITIES.indexOf(r.rarity) >= target || getItem(r.itemId).category === 'character') {
      stopReason = 'target';
      break;
    }
  }
  s.gacha.history = s.gacha.history.slice(0, 200);
  s.gacha.pulls += results.length;
  s.day.gachaPulls += results.length;
  s.stats.autoGachaRuns += 1;
  let bestIndex = 0;
  results.forEach((r, i) => {
    if (RARITIES.indexOf(r.rarity) > RARITIES.indexOf(results[bestIndex].rarity)) bestIndex = i;
  });
  return { results, stopReason, spent, bestIndex };
}
