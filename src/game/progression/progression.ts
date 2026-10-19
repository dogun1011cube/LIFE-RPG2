import { ITEMS } from '../../data/items';
import type { EquipmentStats, GameState } from '../types';

// Tunable progression constants. Change these to rebalance the whole game.
export const PROGRESSION = {
  maxLevel: 30,
  xpBase: 40,
  xpExponent: 1.6,
  baseHp: 100,
  hpPerLevel: 10,
  baseAttack: 8,
  attackPerLevel: 2,
  trainingMax: 5,
  vitalityHp: 15,
  strengthAttack: 3,
  trainingCostBase: 25,
  deathGoldPenalty: 0.1,
};

/** XP required to advance from `level` to `level + 1`. */
export function xpToNext(level: number) {
  return Math.round(PROGRESSION.xpBase * Math.pow(level, PROGRESSION.xpExponent));
}

export function trainingCost(currentRank: number) {
  return Math.round(PROGRESSION.trainingCostBase * Math.pow(currentRank + 1, 1.5));
}

export interface PlayerStats {
  maxHp: number;
  attack: number;
  defense: number;
  miningYield: number;
  hazardProtection: boolean;
}

export function equipmentStats(state: GameState): EquipmentStats {
  const total: Required<EquipmentStats> = { attack: 0, defense: 0, maxHp: 0, miningYield: 0, hazardProtection: false };
  for (const itemId of Object.values(state.player.equipment)) {
    const stats = itemId ? ITEMS[itemId]?.stats : undefined;
    if (!stats) continue;
    total.attack += stats.attack ?? 0;
    total.defense += stats.defense ?? 0;
    total.maxHp += stats.maxHp ?? 0;
    total.miningYield += stats.miningYield ?? 0;
    total.hazardProtection = total.hazardProtection || !!stats.hazardProtection;
  }
  return total;
}

export function getPlayerStats(state: GameState): PlayerStats {
  const p = state.player;
  const eq = equipmentStats(state);
  return {
    maxHp: PROGRESSION.baseHp + (p.level - 1) * PROGRESSION.hpPerLevel + p.training.vitality * PROGRESSION.vitalityHp + (eq.maxHp ?? 0),
    attack: PROGRESSION.baseAttack + (p.level - 1) * PROGRESSION.attackPerLevel + p.training.strength * PROGRESSION.strengthAttack + (eq.attack ?? 0),
    defense: eq.defense ?? 0,
    miningYield: eq.miningYield ?? 0,
    hazardProtection: !!eq.hazardProtection,
  };
}

/** Damage after defense. Always at least 1 so nothing becomes invulnerable. */
export function mitigate(raw: number, defense: number) {
  return Math.max(1, Math.round(raw - defense));
}
