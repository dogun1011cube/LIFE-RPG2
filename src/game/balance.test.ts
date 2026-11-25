import { describe, expect, it } from 'vitest';
import { createNewGame } from './state';
import { expForLevel, deriveStats } from './progression';
import { createBattle, resolveTurn, spawnMonster } from './battle';
import type { BattleState, PlayerAction } from './battle';
import { floorInfo } from './tower';
import { availableSkills } from './battle';
import { getItem } from '../data/items';
import type { GameState } from './types';
import { seeded } from './rng';

/** Builds a player at `level` with gear typical for that level and ~75% of EXP from study. */
function playerAt(level: number, gear: string[]): GameState {
  const plus = level >= 55 ? 6 : level >= 35 ? 4 : level >= 20 ? 2 : 0;
  const s = createNewGame('sim');
  s.player.totalExp = expForLevel(level);
  const studyMin = Math.round(expForLevel(level) * 0.75);
  const subjects = ['화학2', '물리1', '수학', 'KJSO'];
  s.study = subjects.map((sub, i) => ({ id: 'x' + i, subject: sub, seconds: Math.round((studyMin / 4) * 60), day: 1, at: 0, exp: 0, gold: 0, stamina: 0, bonusPct: 0 }));
  s.inventory = [];
  const eq = s.player.equipment;
  (Object.keys(eq) as (keyof typeof eq)[]).forEach((k) => (eq[k] = null));
  gear.forEach((id, i) => {
    const uid = 'g' + i;
    s.inventory.push({ uid, itemId: id, qty: 1, plus, obtainedAt: 0 });
    const slot = getItem(id).slot!;
    const pos = slot === 'accessory' ? (eq.acc1 ? 'acc2' : 'acc1') : slot;
    eq[pos as keyof typeof eq] = uid;
  });
  return s;
}

function ai(b: BattleState, potions: { n: number }): PlayerAction {
  const p = b.player;
  const m = b.monster;
  if (m.charging || m.deathCount === 1 || m.doom === 1) return { type: 'defend' };
  const skills = availableSkills(p.level);
  const heal = skills.find((x) => x.kind === 'heal');
  if (p.hp < p.maxHp * 0.35) {
    if (heal && p.mp >= heal.mp) return { type: 'skill', skillId: heal.id };
    if (potions.n > 0) {
      potions.n--;
      return { type: 'item', itemId: 'p_mid', name: 'potion', effect: { type: 'heal', hp: p.level < 10 ? 60 : 200 } };
    }
  }
  const atkSkill = skills.filter((x) => x.kind === 'phys' || x.kind === 'magic').sort((a, b) => b.power * (b.hits || 1) - a.power * (a.hits || 1)).find((x) => p.mp >= x.mp + (heal ? heal.mp : 0));
  if (atkSkill) return { type: 'skill', skillId: atkSkill.id };
  return { type: 'attack' };
}

function winRate(level: number, gear: string[], floor: number, n = 200, seals = 0) {
  const s = playerAt(level, gear);
  const d = deriveStats(s);
  const info = floorInfo(floor);
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < n; i++) {
    const rng = seeded(1000 + i);
    const waves = info.waves.map((id, idx) => spawnMonster(id, info.level + (info.type === 'boss' && floor >= 20 ? 1 : 0) - (floor === 4 && idx < info.waves.length - 1 ? 1 : 0), { elite: info.elite, weaken: floor === 13 ? seals * 0.12 : 0 }));
    let b = createBattle({ kind: 'tower', locationId: 'tower', title: '', waves, canEscape: false, bg: 'tower', staminaSpent: 0, modifiers: { curse4: floor === 4, doom13: floor === 13 } }, d, d.maxHp, d.maxMp, 0);
    const potions = { n: 3 };
    for (let t = 0; t < 80 && !b.over; t++) b = resolveTurn(b, ai(b, potions), rng).state;
    if (b.over === 'victory') wins++;
    turns += b.turn;
  }
  return { rate: wins / n, turns: Math.round(turns / n) };
}

const G = {
  lv1: ['w_wood', 'a_tunic'],
  lv5: ['w_iron', 'a_leather', 'h_leather', 'b_sandal'],
  lv10: ['w_steel', 'a_chain', 'h_iron', 'g_leather', 'b_leather', 'r_copper'],
  lv15: ['w_flame', 'a_mithril', 'h_scholar', 'g_focus', 'b_gale', 'n_lucky7', 'n_deathcharm'],
  lv25: ['w_calculus', 'a_mithril', 'h_knight', 'g_steel', 'b_knight', 'n_seal13', 'r_power'],
  lv40: ['w_newton', 'a_darkplate', 'h_sage', 'g_thunder', 'b_spirit', 'n_seal13', 'h_hourglass'],
  lv60: ['w_aurora', 'a_dragon', 'h_dragon', 'g_thunder', 'b_spirit', 'r_dragon', 'n_seal13'],
};

describe('balance simulation', () => {
  it('prints a difficulty table and keeps the curve sane', () => {
    const rows: [string, number, string[], number, number?][] = [
      ['F1  Lv1', 1, G.lv1, 1],
      ['F2  Lv2', 2, G.lv1, 2],
      ['F6  Lv5', 5, G.lv5, 6],
      ['F5  Lv5 elite', 5, G.lv5, 5],
      ['F4  Lv4 (死)', 4, G.lv5, 4],
      ['F4  Lv6 (死)', 6, G.lv5, 4],
      ['F4  Lv7 (死)', 7, G.lv5, 4],
      ['F4  Lv8 (死)', 8, G.lv5, 4],
      ['F7  Lv6', 6, G.lv5, 7],
      ['F7  Lv8', 8, G.lv5, 7],
      ['F10 Lv7 boss', 7, G.lv5, 10],
      ['F10 Lv10 boss', 10, G.lv10, 10],
      ['F13 Lv10 0seal', 10, G.lv10, 13, 0],
      ['F13 Lv12 0seal', 12, G.lv10, 13, 0],
      ['F13 Lv12 2seal', 12, G.lv10, 13, 2],
      ['F13 Lv14 3seal', 14, G.lv15, 13, 3],
      ['F20 Lv15 boss', 15, G.lv15, 20],
      ['F20 Lv18 boss', 18, G.lv15, 20],
      ['F30 Lv21 boss', 21, G.lv25, 30],
      ['F30 Lv25 boss', 25, G.lv25, 30],
      ['F31 Lv22', 22, G.lv25, 31],
      ['F50 Lv33 boss', 33, G.lv40, 50],
      ['F50 Lv38 boss', 38, G.lv40, 50],
      ['F70 Lv48 boss', 48, G.lv60, 70],
      ['F100 Lv60 boss', 60, G.lv60, 100],
      ['F100 Lv66 boss', 66, G.lv60, 100],
      ['F100 Lv72 boss', 72, G.lv60, 100],
    ];
    const out: Record<string, { rate: number; turns: number }> = {};
    for (const [label, lv, gear, floor, seals] of rows) out[label] = winRate(lv, gear, floor, 120, seals ?? 0);
    console.table(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${Math.round(v.rate * 100)}% (${v.turns} turns)`])));
    expect(out['F1  Lv1'].rate).toBeGreaterThan(0.9);
    expect(out['F10 Lv10 boss'].rate).toBeGreaterThan(out['F10 Lv7 boss'].rate);
    expect(out['F10 Lv10 boss'].rate).toBeGreaterThan(0.6);
  });
});
