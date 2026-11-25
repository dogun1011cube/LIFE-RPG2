import { ITEMS } from '../data/items';
import type { ItemDef, Rarity } from './types';
import { RARITIES } from './types';
import type { Rng } from './rng';
import { pick, weighted } from './rng';

/** Rarity weights for monster drops depending on monster level. */
export function dropRarityWeights(level: number, boost = 0): [Rarity, number][] {
  const l = level + boost;
  const w: Record<Rarity, number> = {
    common: Math.max(5, 60 - l * 1.6),
    uncommon: 30,
    rare: 6 + l * 0.55,
    epic: Math.max(0, (l - 12) * 0.35),
    legendary: Math.max(0, (l - 30) * 0.08),
    mythic: Math.max(0, (l - 55) * 0.01),
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

/** Picks a random item of the given rarity; falls back to lower rarities if the pool is empty. */
export function rollItemOfRarity(rng: Rng, rarity: Rarity, opts: { gacha?: boolean; maxLevel?: number } = {}): ItemDef {
  let idx = RARITIES.indexOf(rarity);
  while (idx >= 0) {
    const pool = lootPool(RARITIES[idx], opts);
    if (pool.length) return pick(rng, pool);
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
