import { getItem } from '../data/items';
import { computeRank, computeUnlockStage } from '../data/ranks';
import { STUDY_SECONDS_PER_TRAINING_POINT } from '../data/subjects';
import type { DerivedStats, GameState, RankId, StatBlock, StatKey } from './types';
import { EQUIP_POSITIONS, STAT_KEYS } from './types';

// ─────────────────────────────────────────────────────────────
// EXP curve
// Cumulative EXP needed to reach level L:  25 × (L−1)^1.85
//   Lv 2  ≈ 25 EXP   (25 min of study)
//   Lv 5  ≈ 330 EXP  (~5.5 h)
//   Lv 10 ≈ 1,460    (~24 h)
//   Lv 20 ≈ 5,800    (~95 h)
//   Lv 30 ≈ 12,800
//   Lv 50 ≈ 33,500
// ─────────────────────────────────────────────────────────────
// No level cap.
export const ATK_PER_LEVEL = 10;

export function expForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(25 * Math.pow(level - 1, 1.85));
}

/** Inverse of expForLevel (closed form + correction for rounding) — works for any level. */
export function levelFromExp(totalExp: number): number {
  if (!(totalExp > 0)) return 1;
  let lv = Math.max(1, Math.floor(1 + Math.pow(totalExp / 25, 1 / 1.85)));
  while (lv > 1 && expForLevel(lv) > totalExp) lv--;
  while (expForLevel(lv + 1) <= totalExp) lv++;
  return lv;
}

export function levelProgress(totalExp: number) {
  const level = levelFromExp(totalExp);
  const cur = expForLevel(level);
  const next = expForLevel(level + 1);
  const into = totalExp - cur;
  const need = Math.max(1, next - cur);
  return { level, into, need, pct: Math.min(1, into / need), next };
}

// ─────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────
export function baseStatsForLevel(level: number): Record<StatKey, number> {
  const v = 4 + level;
  return { str: v, int: v, dex: v, luk: v };
}

/** Training stats: every 2h studied in a subject → +1 to its stat. */
export function trainingStats(state: GameState): Record<StatKey, number> {
  const out: Record<StatKey, number> = { str: 0, int: 0, dex: 0, luk: 0 };
  const totals = subjectTotals(state);
  for (const [name, sec] of Object.entries(totals)) {
    const def = state.subjects.find((s) => s.name === name);
    const stat = def?.stat ?? 'int';
    out[stat] += Math.floor(sec / STUDY_SECONDS_PER_TRAINING_POINT);
  }
  return out;
}

export function subjectTotals(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of state.study) out[r.subject] = (out[r.subject] || 0) + r.seconds;
  return out;
}

export function scaledStats(stats: StatBlock | undefined, plus: number): StatBlock {
  if (!stats) return {};
  const mult = 1 + plus * 0.1;
  const out: StatBlock = {};
  for (const [k, v] of Object.entries(stats) as [keyof StatBlock, number][]) {
    out[k] = v > 0 ? Math.round(v * mult) : v;
  }
  return out;
}

export function gearStats(state: GameState): StatBlock {
  const total: StatBlock = {};
  for (const pos of EQUIP_POSITIONS) {
    const uid = state.player.equipment[pos];
    if (!uid) continue;
    const entry = state.inventory.find((e) => e.uid === uid);
    if (!entry) continue;
    const def = getItem(entry.itemId);
    const s = scaledStats(def.stats, entry.plus);
    for (const [k, v] of Object.entries(s) as [keyof StatBlock, number][]) {
      total[k] = (total[k] || 0) + v;
    }
  }
  return total;
}

export function streakExpBonus(streak: number) {
  return Math.min(20, streak * 2);
}

export function deriveStats(state: GameState): DerivedStats {
  const level = levelFromExp(state.player.totalExp);
  const base = baseStatsForLevel(level);
  const training = trainingStats(state);
  const gear = gearStats(state);
  const stat = (k: StatKey) => base[k] + training[k] + (gear[k] || 0);
  const str = stat('str');
  const int = stat('int');
  const dex = stat('dex');
  const luk = stat('luk');
  const maxHp = Math.round(90 + level * 10 + str * 3 + (gear.hp || 0));
  const maxMp = Math.round(15 + level * 2 + int * 1.2 + (gear.mp || 0));
  // Attack grows in proportion to level: every level adds +10 ATK / +10 MATK,
  // on top of STR/INT and equipment.
  const atk = Math.round(ATK_PER_LEVEL * level + str * 2 + (gear.atk || 0));
  const matk = Math.round(ATK_PER_LEVEL * level + int * 2.2 + (gear.matk || 0));
  const def = Math.round(2 + dex + str * 0.5 + (gear.def || 0));
  const crit = Math.min(75, Math.round((3 + dex * 0.15 + luk * 0.2 + (gear.crit || 0)) * 10) / 10);
  const critDmg = 1.75;
  const expBonus = (gear.expBonus || 0) + streakExpBonus(state.streak.current);
  const goldBonus = Math.round((luk * 0.3 + (gear.goldBonus || 0)) * 10) / 10;
  return { level, str, int, dex, luk, maxHp, maxMp, atk, matk, def, crit, critDmg, expBonus, goldBonus, base, training, gear };
}

export function bossCount(state: GameState) {
  return state.stats.bossesDefeated.length;
}

/** Character rank (prestige, 1,000,000× harder). */
export function currentRank(state: GameState): RankId {
  return computeRank(levelFromExp(state.player.totalExp), state.tower.highestCleared, bossCount(state));
}

/** Content unlock stage (base thresholds): gates shop items, areas, tower seals, stamina cap. */
export function unlockStage(state: GameState): RankId {
  return computeUnlockStage(levelFromExp(state.player.totalExp), state.tower.highestCleared, bossCount(state));
}

export { STAT_KEYS };
