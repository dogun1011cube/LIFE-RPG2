import { getItem, ITEMS } from '../data/items';
import { rankAtLeast, getRank } from '../data/ranks';
import { GACHA } from '../data/world';
import type { Ctx } from './core';
import { addItem, GameError, sfx, spendGold, toast } from './core';
import { rollItemOfRarity } from './loot';
import { currentRank } from './progression';
import { hashStr, pick, seeded, weighted } from './rng';
import type { GameState, GachaRecord, ItemDef, Rarity, ShopTab } from './types';
import { RARITIES } from './types';

export function shopItems(tab: ShopTab): ItemDef[] {
  return ITEMS.filter((i) => i.shop === tab);
}

export function canBuy(s: GameState, def: ItemDef) {
  return rankAtLeast(currentRank(s), def.minRank);
}

export const DEAL_DISCOUNT = 0.3;

/** A rotating "daily deal" (one per RPG day), seeded by the day number. */
export function dailyDeal(s: GameState): ItemDef {
  const rank = currentRank(s);
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
  if (!canBuy(s, def) && !opts.deal && opts.price === undefined) throw new GameError(`랭크 ${def.minRank} 이상만 구매할 수 있습니다. (현재 ${getRank(currentRank(s)).id})`);
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

export function gachaPull(s: GameState, ctx: Ctx, count: 1 | 10): GachaResult[] {
  const cost = count === 10 ? GACHA.multi : GACHA.single;
  spendGold(s, cost);
  const results: GachaResult[] = [];
  for (let i = 0; i < count; i++) {
    let rarity = rollRarity(ctx);
    let pity = false;
    if (s.gacha.pity + 1 >= GACHA.pity && RARITIES.indexOf(rarity) < RARITIES.indexOf('legendary')) {
      rarity = 'legendary';
      pity = true;
    }
    // 10-pull guarantee: at least one Rare or better
    if (count === 10 && i === 9 && !results.some((r) => RARITIES.indexOf(r.rarity) >= 2) && RARITIES.indexOf(rarity) < 2) {
      rarity = 'rare';
    }
    if (RARITIES.indexOf(rarity) >= RARITIES.indexOf('legendary')) s.gacha.pity = 0;
    else s.gacha.pity += 1;
    const item = rollItemOfRarity(ctx.rng, rarity, { gacha: true });
    const res = addItem(s, item.id, 1, ctx, false);
    const r: GachaResult = { itemId: item.id, rarity: item.rarity, converted: res.converted, pity };
    results.push(r);
    const rec: GachaRecord = { at: ctx.now, itemId: item.id, rarity: item.rarity, converted: res.converted };
    s.gacha.history.unshift(rec);
  }
  s.gacha.history = s.gacha.history.slice(0, 200);
  s.gacha.pulls += count;
  s.day.gachaPulls += count;
  return results;
}
