import { describe, expect, it } from 'vitest';
import { createNewGame } from './state';
import { expForLevel, deriveStats } from './progression';
import { createBattle, resolveTurn, skillState, spawnMonster } from './battle';
import type { BattleState, PlayerAction } from './battle';
import { floorInfo } from './tower';
import { getItem } from '../data/items';
import { CHARACTERS, getCharacter } from '../data/characters';
import type { GameState } from './types';
import { seeded } from './rng';

const GEAR_BASE = {
  1: ['a_tunic'],
  5: ['a_leather', 'h_leather', 'b_sandal'],
  10: ['a_chain', 'h_iron', 'g_leather', 'b_leather', 'r_copper'],
  15: ['a_mithril', 'h_scholar', 'g_focus', 'b_gale', 'n_lucky7', 'n_deathcharm'],
  25: ['a_mithril', 'h_knight', 'g_steel', 'b_knight', 'n_seal13', 'r_power'],
  40: ['a_darkplate', 'h_sage', 'g_thunder', 'b_spirit', 'n_seal13', 'h_hourglass'],
  60: ['a_dragon', 'h_dragon', 'g_thunder', 'b_spirit', 'r_dragon', 'n_seal13'],
} as const;
const WEAPON_PHYS = { 1: 'w_wood', 5: 'w_iron', 10: 'w_steel', 15: 'w_flame', 25: 'w_calculus', 40: 'w_newton', 60: 'w_aurora' } as const;
const WEAPON_MAGIC = { 1: 'w_staff', 5: 'w_staff', 10: 'w_tome', 15: 'w_periodic', 25: 'w_periodic', 40: 'w_avogadro', 60: 'w_eureka' } as const;

function tier(level: number) {
  return ([60, 40, 25, 15, 10, 5, 1] as const).find((t) => level >= t) ?? 1;
}

/** A player at `level` with typical gear for that level and ~75% of EXP from study. */
function playerAt(level: number, charId: string): GameState {
  const plus = level >= 90 ? 8 : level >= 55 ? 6 : level >= 35 ? 4 : level >= 20 ? 2 : 0;
  const s = createNewGame('sim');
  s.player.activeCharacter = charId;
  s.player.totalExp = expForLevel(level);
  const studyMin = Math.round(expForLevel(level) * 0.75);
  s.study = ['화학2', '물리1', '수학', 'KJSO'].map((sub, i) => ({ id: 'x' + i, subject: sub, seconds: Math.round((studyMin / 4) * 60), day: 1, at: 0, exp: 0, gold: 0, stamina: 0, bonusPct: 0 }));
  s.inventory = [];
  const eq = s.player.equipment;
  (Object.keys(eq) as (keyof typeof eq)[]).forEach((k) => (eq[k] = null));
  const t = tier(level);
  const weapon = getCharacter(charId).type === 'phys' ? WEAPON_PHYS[t] : WEAPON_MAGIC[t];
  [weapon, ...GEAR_BASE[t]].forEach((id, i) => {
    const uid = 'g' + i;
    s.inventory.push({ uid, itemId: id, qty: 1, plus, obtainedAt: 0 });
    const slot = getItem(id).slot!;
    const pos = slot === 'accessory' ? (eq.acc1 ? 'acc2' : 'acc1') : slot;
    eq[pos as keyof typeof eq] = uid;
  });
  return s;
}

/** Reasonable player AI: defend against telegraphs, heal when low, otherwise best ready skill. */
function ai(b: BattleState, potions: { n: number }): PlayerAction {
  const p = b.player;
  const m = b.monster;
  const ch = getCharacter(p.charId);
  if (m.charging || m.deathCount === 1 || m.doom === 1) return { type: 'defend' };
  if (p.hp < p.maxHp * 0.4) {
    const heal = ch.skills.find((x) => x.healPct && skillState(b, x).ready);
    if (heal) return { type: 'skill', skillId: heal.id };
    if (potions.n > 0) {
      potions.n--;
      return { type: 'item', itemId: 'p_mid', name: 'potion', effect: { type: 'heal', hp: p.level < 10 ? 60 : 200 } };
    }
  }
  const dots = (m.burn ? m.burn.dmg * m.burn.turns : 0) + (m.poison ? m.poison.dmg * m.poison.turns : 0);
  const value = (x: (typeof ch.skills)[number]) =>
    (x.power || 0) * (x.hits || 1) + (x.burn ? x.burn.coef * x.burn.turns : 0) + (x.poison ? x.poison.coef * x.poison.turns : 0) + (x.defDown ? 0.4 : 0) + (x.burst ? dots / Math.max(1, p.matk) * x.burst : 0) + (x.lifesteal ? 0.3 : 0);
  const ready = ch.skills
    .filter((x) => skillState(b, x).ready && !(x.healPct && !x.power) && !(x.burst && !x.power && dots <= 0))
    .sort((a, c) => value(c) - value(a));
  if (ready.length) return { type: 'skill', skillId: ready[0].id };
  return { type: 'attack' };
}

function winRate(level: number, charId: string, floor: number, n = 150, seals = 0) {
  const s = playerAt(level, charId);
  const d = deriveStats(s);
  const info = floorInfo(floor);
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < n; i++) {
    const rng = seeded(1000 + i);
    const waves = info.waves.map((id, idx) =>
      spawnMonster(id, info.level + (info.type === 'boss' && floor >= 20 ? 1 : 0) - (floor === 4 && idx < info.waves.length - 1 ? 1 : 0), { elite: info.elite, weaken: floor === 13 ? seals * 0.12 : 0 }),
    );
    let b = createBattle({ kind: 'tower', locationId: 'tower', title: '', waves, canEscape: false, bg: 'tower', staminaSpent: 0, modifiers: { curse4: floor === 4, doom13: floor === 13 } }, d, d.maxHp, d.maxMp, 0, charId);
    const potions = { n: 3 };
    for (let t = 0; t < 120 && !b.over; t++) b = resolveTurn(b, ai(b, potions), rng).state;
    if (b.over === 'victory') wins++;
    turns += b.turn;
  }
  return { rate: wins / n, turns: Math.round(turns / n) };
}

describe('balance simulation (per character)', () => {
  it('prints win rates for every character and keeps each character viable', () => {
    // [label, level, floor]
    const scen: [string, number, number][] = [
      ['F1  Lv1', 1, 1],
      ['F4  Lv10 (死)', 10, 4],
      ['F7  Lv11', 11, 7],
      ['F10 Lv10 boss', 10, 10],
      ['F10 Lv14 boss', 14, 10],
      ['F13 Lv17 2seal', 17, 13],
      ['F20 Lv20 boss', 20, 20],
      ['F20 Lv26 boss', 26, 20],
      ['F30 Lv36 boss', 36, 30],
      ['F50 Lv58 boss', 58, 50],
      ['F70 Lv80 boss', 80, 70],
      ['F100 Lv110 boss', 110, 100],
    ];
    const table: Record<string, Record<string, string>> = {};
    const rates: Record<string, number[]> = {};
    for (const [label, lv, floor] of scen) {
      table[label] = {};
      for (const ch of CHARACTERS) {
        const r = winRate(lv, ch.id, floor, 120, floor === 13 ? 2 : 0);
        table[label][ch.title] = `${Math.round(r.rate * 100)}% (${r.turns}t)`;
        (rates[ch.id] ||= []).push(r.rate);
      }
    }
    console.table(table);
    for (const ch of CHARACTERS) {
      const avg = rates[ch.id].reduce((a, b) => a + b, 0) / rates[ch.id].length;
      expect(avg, ch.id).toBeGreaterThan(0.3);
      expect(rates[ch.id][0], ch.id).toBeGreaterThan(0.9); // first floor is easy for everyone
    }
  });
});
