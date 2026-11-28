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
 * Weapons come in many kinds, so the weapon group's total weight is capped —
 * otherwise drops / summons would be almost all weapons. Every other group keeps
 * one weight per item, exactly as before.
 */
export const WEAPON_GROUP_CAP = 8;

/** Weighted random pick from a pool where the weapon group is capped (see WEAPON_GROUP_CAP). */
export function pickBalanced(rng: Rng, pool: ItemDef[]): ItemDef {
  const weapons = pool.filter((i) => pickGroup(i) === 'weapon');
  const others = pool.filter((i) => pickGroup(i) !== 'weapon');
  if (!weapons.length || !others.length) return pick(rng, pool);
  const wWeight = Math.min(weapons.length, WEAPON_GROUP_CAP);
  return rng() * (wWeight + others.length) < wWeight ? pick(rng, weapons) : pick(rng, others);
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
