import { ITEMS } from '../data/items';
import type { ItemDef, Rarity } from './types';
import { RARITIES } from './types';
import type { Rng } from './rng';
import { pick, weighted } from './rng';

/** Rarity weights for monster drops depending on monster level. */
export function dropRarityWeights(level: number, boost = 0): [Rarity, number][] {
  const l = level + boost;
  const w: Record<Rarity, number> = {
    common: Math.max(5, 60 - l * 1.1),
    uncommon: 30,
    rare: 6 + l * 0.4,
    epic: Math.min(40, Math.max(0, (l - 18) * 0.3)),
    legendary: Math.min(12, Math.max(0, (l - 48) * 0.07)),
    mythic: Math.min(2, Math.max(0, (l - 90) * 0.01)),
  };
  return RARITIES.map((r) => [r, w[r]] as [Rarity, number]).filter(([, v]) => v > 0);
}

export function lootPool(rarity: Rarity, opts: { gacha?: boolean; maxLevel?: number } = {}): ItemDef[] {
  return ITEMS.filter((i) => {
    if (i.rarity !== rarity || i.unique) return false;
    if (opts.gacha) return !!i.gacha;
    if (!i.loot) return false;
    if (opts.maxLevel !== undefined && i.level && i.level > opts.maxLevel) return false;
    return true;
  });
}

/** Group used to balance random picks: equipment slot, or item category. */
export function pickGroup(i: ItemDef): string {
  return i.category === 'equipment' && i.slot ? i.slot : i.category;
}

/**
 * Every equipment slot now has dozens of items, so each slot group's total weight
 * is capped — otherwise drops / summons would be almost all equipment. Other groups
 * (consumables, chests, cosmetics) weigh NON_EQUIP_WEIGHT per item.
 */
export const GROUP_CAPS: Record<string, number> = { weapon: 6, helmet: 3, armor: 3, gloves: 3, boots: 3, accessory: 5 };
export const NON_EQUIP_WEIGHT = 1.5;

/** Weighted random pick from a pool where each equipment slot group is capped (see GROUP_CAPS). */
export function pickBalanced(rng: Rng, pool: ItemDef[]): ItemDef {
  const groups = new Map<string, ItemDef[]>();
  for (const it of pool) {
    const g = pickGroup(it);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(it);
  }
  if (groups.size <= 1) return pick(rng, pool);
  const entries = [...groups.entries()].map(([g, items]) => [items, g in GROUP_CAPS ? Math.min(items.length, GROUP_CAPS[g]) : items.length * NON_EQUIP_WEIGHT] as [ItemDef[], number]);
  return pick(rng, weighted(rng, entries));
}

/** Picks a random item of the given rarity; falls back to lower rarities if the pool is empty. */
export function rollItemOfRarity(rng: Rng, rarity: Rarity, opts: { gacha?: boolean; maxLevel?: number } = {}): ItemDef {
  let idx = RARITIES.indexOf(rarity);
  while (idx >= 0) {
    const pool = lootPool(RARITIES[idx], opts);
    if (pool.length) return pickBalanced(rng, pool);
    idx--;
  }
  return ITEMS[0];
}

export function rollDrop(rng: Rng, monsterLevel: number, luck: number, boost = 0): ItemDef | null {
  const chance = Math.min(0.6, 0.22 + luck * 0.002 + boost * 0.02);
  if (rng() > chance) return null;
  const rarity = weighted(rng, dropRarityWeights(monsterLevel, boost));
  return rollItemOfRarity(rng, rarity, { maxLevel: monsterLevel + 12 });
}
