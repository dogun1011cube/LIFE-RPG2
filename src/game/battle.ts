import { getMonster } from '../data/monsters';
import type { MSkill } from '../data/monsterSkills';
import { monsterSkills } from '../data/monsterSkills';
import type { SkillDef } from '../data/skills';
import { SKILLS } from '../data/skills';
import type { BgId } from '../data/world';
import type { Rng } from './rng';
import { pick } from './rng';
import type { ConsumableEffect, DerivedStats } from './types';

// ─────────────────────────────────────────────────────────────
// Monster scaling — tuned against the expected player curve so that a
// player ~2-3 levels above a monster wins comfortably, an equal-level
// player wins with some HP loss, and an under-levelled player loses.
// ─────────────────────────────────────────────────────────────
// Monster stats are tuned against the player's level-proportional ATK
// (10 per level): monsters have a lot of HP and DEF, and hit for roughly
// 1/7 of the HP of a player 3 levels above them.
export const MONSTER_TUNING = { hpBase: 30, hpPerLv: 60, atkBase: 24, atkPerLv: 4.8, defBase: 6, defPerLv: 7.2, growthFrom: 20, growth: 0.006 };

export function monsterBase(level: number) {
  const t = MONSTER_TUNING;
  const g = 1 + Math.max(0, level - t.growthFrom) * t.growth;
  return {
    hp: (t.hpBase + t.hpPerLv * level) * g,
    atk: (t.atkBase + t.atkPerLv * level) * g,
    def: (t.defBase + t.defPerLv * level) * g,
    exp: 6 + 2.2 * level,
    gold: 4 + 1.8 * level,
  };
}

export interface MonsterInstance {
  uid: string;
  defId: string;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  magic: boolean;
  boss: boolean;
  elite: boolean;
  skills: string[];
  skillRate: number;
  exp: number;
  gold: number;
  // status
  charging: string | null;
  enraged: boolean;
  defUp: { pct: number; turns: number } | null;
  defDown: { pct: number; turns: number } | null;
  reassembled: boolean;
  deathCount: number | null;
  doom: number | null;
  atkBuff: number; // % from skills (rest of battle)
  ultUses: number;
}

let mCounter = 0;

export function spawnMonster(defId: string, level: number, opts: { elite?: boolean; weaken?: number } = {}): MonsterInstance {
  const d = getMonster(defId);
  const b = monsterBase(level);
  const elite = !!opts.elite || !!d.elite;
  const em = opts.elite ? { hp: 1.5, atk: 1.12, def: 1.1, r: 1.8 } : { hp: 1, atk: 1, def: 1, r: 1 };
  const weaken = 1 - (opts.weaken || 0);
  const isDummy = d.family === 'dummy';
  const maxHp = isDummy ? 99999 : Math.round(b.hp * d.hp * em.hp * weaken);
  return {
    uid: 'm' + ++mCounter,
    defId,
    name: (opts.elite ? '정예 ' : '') + d.name,
    level,
    maxHp,
    hp: maxHp,
    atk: isDummy ? 0 : Math.round(b.atk * d.atk * em.atk * weaken),
    def: Math.round(b.def * d.def * em.def),
    magic: !!d.magic,
    boss: !!d.boss,
    elite,
    skills: d.skills,
    skillRate: d.skillRate ?? 0.3,
    exp: isDummy ? 0 : Math.round(b.exp * (d.exp ?? 1) * em.r),
    gold: isDummy ? 0 : Math.round(b.gold * (d.gold ?? 1) * em.r),
    charging: null,
    enraged: false,
    defUp: null,
    defDown: null,
    reassembled: false,
    deathCount: null,
    doom: null,
    atkBuff: 0,
    ultUses: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Battle state
// ─────────────────────────────────────────────────────────────
export type BattleKind = 'field' | 'tower' | 'arena' | 'training';

export interface BattleSetup {
  kind: BattleKind;
  locationId: string;
  title: string;
  floor?: number;
  waves: MonsterInstance[];
  canEscape: boolean;
  bg: BgId;
  staminaSpent: number;
  firstClear?: boolean;
  modifiers: { curse4?: boolean; doom13?: boolean; seals?: number };
}

export interface Buff {
  kind: 'atk' | 'def';
  pct: number;
  turns: number;
}

export interface BattlePlayer {
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  crit: number;
  critDmg: number;
  dex: number;
  luk: number;
  level: number;
  gold: number;
  defending: boolean;
  buffs: Buff[];
  curse: { pct: number; turns: number } | null;
  poison: { pct: number; turns: number } | null;
  armorBreak: { pct: number; turns: number } | null;
}

export interface BattleState {
  setup: BattleSetup;
  wave: number;
  monster: MonsterInstance;
  defeated: MonsterInstance[];
  player: BattlePlayer;
  turn: number;
  over: null | 'victory' | 'defeat' | 'escape';
  stolenGold: number;
  stats: { dmgDealt: number; crits: number; maxHit: number; itemsUsed: number };
}

export type HitFx = 'slash' | 'orb' | 'chain' | 'gravity' | 'nova' | 'insight' | 'melee';

export type BattleEvent =
  | { k: 'text'; text: string; tone?: 'info' | 'good' | 'bad' | 'warn' }
  | { k: 'pAttack'; dmg: number; crit: boolean; miss: boolean; fx: HitFx; mHp: number; hitIndex: number }
  | { k: 'pHeal'; hp: number; mp: number; pHp: number; pMp: number }
  | { k: 'pBuff'; text: string }
  | { k: 'pDefend'; pMp: number }
  | { k: 'pMp'; pMp: number }
  | { k: 'mCharge'; text: string; charge?: boolean }
  | { k: 'mAttack'; dmg: number; crit: boolean; miss: boolean; fx: 'melee' | 'magic' | 'dark' | 'breath' | 'doom' | 'glitch' | 'death' | 'gold'; pHp: number; guarded: boolean }
  | { k: 'mHeal'; hp: number; mHp: number }
  | { k: 'mBuff'; text: string }
  | { k: 'mRevive'; mHp: number; text: string }
  | { k: 'mDefeated'; name: string }
  | { k: 'wave'; index: number; monster: MonsterInstance }
  | { k: 'counter'; kind: 'doom' | 'death'; value: number | null }
  | { k: 'escape'; ok: boolean }
  | { k: 'victory' }
  | { k: 'pDot'; dmg: number; pHp: number; text: string }
  | { k: 'defeat' };

export type PlayerAction =
  | { type: 'attack' }
  | { type: 'skill'; skillId: string }
  | { type: 'item'; itemId: string; name: string; effect: ConsumableEffect }
  | { type: 'defend' }
  | { type: 'escape' };

export function createBattle(setup: BattleSetup, d: DerivedStats, hp: number, mp: number, gold: number): BattleState {
  const first = setup.waves[0];
  if (setup.modifiers.doom13) first.doom = 13;
  return {
    setup,
    wave: 0,
    monster: first,
    defeated: [],
    player: {
      hp: Math.max(1, Math.min(d.maxHp, hp)),
      mp: Math.max(0, Math.min(d.maxMp, mp)),
      maxHp: d.maxHp,
      maxMp: d.maxMp,
      atk: d.atk,
      matk: d.matk,
      def: d.def,
      crit: d.crit,
      critDmg: d.critDmg,
      dex: d.dex,
      luk: d.luk,
      level: d.level,
      gold,
      defending: false,
      buffs: [],
      curse: null,
      poison: null,
      armorBreak: null,
    },
    turn: 1,
    over: null,
    stolenGold: 0,
    stats: { dmgDealt: 0, crits: 0, maxHit: 0, itemsUsed: 0 },
  };
}

// ── helpers ──────────────────────────────────────────────────
export function calcDamage(atk: number, def: number, rng: Rng, mult = 1, pierce = 0) {
  const effDef = Math.max(0, def * (1 - pierce));
  const base = (atk * atk) / Math.max(1, atk + effDef);
  const variance = 0.9 + rng() * 0.2;
  return Math.max(1, Math.round(base * mult * variance));
}

function buffPct(p: BattlePlayer, kind: 'atk' | 'def') {
  let pct = p.buffs.filter((b) => b.kind === kind).reduce((a, b) => a + b.pct, 0);
  if (kind === 'atk' && p.curse) pct -= p.curse.pct;
  return pct;
}

export function playerAtk(p: BattlePlayer) {
  return p.atk * (1 + buffPct(p, 'atk') / 100);
}
export function playerMatk(p: BattlePlayer) {
  return p.matk * (1 + buffPct(p, 'atk') / 100);
}
export function playerDef(p: BattlePlayer) {
  return p.def * Math.max(0.2, 1 + (buffPct(p, 'def') - (p.armorBreak?.pct ?? 0)) / 100);
}
export function monsterDef(m: MonsterInstance) {
  let pct = 0;
  if (m.defUp) pct += m.defUp.pct;
  if (m.defDown) pct -= m.defDown.pct;
  return m.def * Math.max(0.2, 1 + pct / 100);
}
export function monsterAtk(m: MonsterInstance) {
  return m.atk * (1 + (m.enraged ? 0.25 : 0) + (m.atkBuff || 0) / 100);
}

function clone(b: BattleState): BattleState {
  return {
    ...b,
    monster: { ...b.monster },
    defeated: [...b.defeated],
    player: {
      ...b.player,
      buffs: b.player.buffs.map((x) => ({ ...x })),
      curse: b.player.curse ? { ...b.player.curse } : null,
      poison: b.player.poison ? { ...b.player.poison } : null,
      armorBreak: b.player.armorBreak ? { ...b.player.armorBreak } : null,
    },
    stats: { ...b.stats },
    setup: b.setup,
  };
}

function healMult(b: BattleState) {
  return b.setup.modifiers.curse4 ? 0.5 : 1;
}

function isDummy(m: MonsterInstance) {
  return m.defId === 'dummy';
}

// ── player turn ──────────────────────────────────────────────
export function availableSkills(level: number) {
  return SKILLS.filter((s) => s.level <= level);
}

function dealHit(b: BattleState, ev: BattleEvent[], rng: Rng, opts: { mult: number; magic: boolean; pierce?: number; critBonus?: number; guaranteedCrit?: boolean; fx: HitFx; hitIndex: number; canMiss?: boolean }) {
  const p = b.player;
  const m = b.monster;
  if (opts.canMiss && rng() < 0.04) {
    ev.push({ k: 'pAttack', dmg: 0, crit: false, miss: true, fx: opts.fx, mHp: m.hp, hitIndex: opts.hitIndex });
    return;
  }
  const atk = opts.magic ? playerMatk(p) : playerAtk(p);
  let dmg = calcDamage(atk, monsterDef(m), rng, opts.mult, opts.pierce || 0);
  const crit = opts.guaranteedCrit || rng() * 100 < p.crit + (opts.critBonus || 0);
  if (crit) {
    dmg = Math.round(dmg * p.critDmg);
    b.stats.crits++;
  }
  m.hp = Math.max(0, m.hp - dmg);
  b.stats.dmgDealt += dmg;
  b.stats.maxHit = Math.max(b.stats.maxHit, dmg);
  ev.push({ k: 'pAttack', dmg, crit, miss: false, fx: opts.fx, mHp: m.hp, hitIndex: opts.hitIndex });
}

function useSkill(b: BattleState, ev: BattleEvent[], rng: Rng, skill: SkillDef) {
  const p = b.player;
  p.mp -= skill.mp;
  ev.push({ k: 'pMp', pMp: p.mp });
  ev.push({ k: 'text', text: `${skill.name}!`, tone: 'info' });
  if (skill.kind === 'heal') {
    const amount = Math.round(((p.maxHp * (skill.healPct || 0)) / 100) * healMult(b));
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    ev.push({ k: 'pHeal', hp: p.hp - before, mp: 0, pHp: p.hp, pMp: p.mp });
    if (b.setup.modifiers.curse4) ev.push({ k: 'text', text: '죽음의 저주로 회복량이 절반이 되었다…', tone: 'warn' });
    return;
  }
  if (skill.kind === 'buff' && skill.buff) {
    if (skill.buff.atkPct) p.buffs.push({ kind: 'atk', pct: skill.buff.atkPct, turns: skill.buff.turns });
    if (skill.buff.defPct) p.buffs.push({ kind: 'def', pct: skill.buff.defPct, turns: skill.buff.turns });
    ev.push({ k: 'pBuff', text: `공격력 +${skill.buff.atkPct ?? 0}% · 방어력 +${skill.buff.defPct ?? 0}% (${skill.buff.turns}턴)` });
    return;
  }
  const hits = skill.hits || 1;
  for (let i = 0; i < hits; i++) {
    if (b.monster.hp <= 0) break;
    dealHit(b, ev, rng, {
      mult: skill.power,
      magic: skill.kind === 'magic',
      pierce: skill.defPierce,
      critBonus: skill.critBonus,
      guaranteedCrit: skill.guaranteedCrit,
      fx: skill.fx as HitFx,
      hitIndex: i,
    });
  }
  if (skill.debuff && b.monster.hp > 0) {
    b.monster.defDown = { pct: skill.debuff.defPct, turns: skill.debuff.turns };
    ev.push({ k: 'text', text: `${b.monster.name}의 방어력이 ${skill.debuff.defPct}% 감소했다!`, tone: 'good' });
  }
}

/** Handles monster death (reassemble, next wave, victory). Returns true if the battle continues with a living monster. */
function checkMonsterDeath(b: BattleState, ev: BattleEvent[]): boolean {
  const m = b.monster;
  if (m.hp > 0) return true;
  if (m.skills.includes('reassemble') && !m.reassembled) {
    m.reassembled = true;
    m.hp = Math.round(m.maxHp * 0.35);
    ev.push({ k: 'mRevive', mHp: m.hp, text: `${m.name}의 뼈가 다시 조립되었다!` });
    return true;
  }
  ev.push({ k: 'mDefeated', name: m.name });
  b.defeated.push({ ...m });
  if (b.wave + 1 < b.setup.waves.length) {
    b.wave += 1;
    const next = { ...b.setup.waves[b.wave] };
    b.monster = next;
    ev.push({ k: 'wave', index: b.wave, monster: next });
    ev.push({ k: 'text', text: `${next.name}이(가) 나타났다!`, tone: 'warn' });
    return false;
  }
  b.over = 'victory';
  ev.push({ k: 'victory' });
  return false;
}

export function resolveTurn(input: BattleState, action: PlayerAction, rng: Rng): { state: BattleState; events: BattleEvent[] } {
  const b = clone(input);
  const ev: BattleEvent[] = [];
  if (b.over) return { state: b, events: ev };
  const p = b.player;
  p.defending = false;
  let monsterActs = true;

  switch (action.type) {
    case 'attack':
      dealHit(b, ev, rng, { mult: 1, magic: false, fx: 'slash', hitIndex: 0, canMiss: true });
      break;
    case 'skill': {
      const skill = SKILLS.find((s) => s.id === action.skillId);
      if (!skill || skill.level > p.level) return { state: input, events: [{ k: 'text', text: '사용할 수 없는 스킬입니다.', tone: 'bad' }] };
      if (p.mp < skill.mp) return { state: input, events: [{ k: 'text', text: 'MP가 부족하다!', tone: 'bad' }] };
      useSkill(b, ev, rng, skill);
      break;
    }
    case 'defend':
      p.defending = true;
      p.mp = Math.min(p.maxMp, p.mp + Math.max(2, Math.round(p.maxMp * 0.08)));
      ev.push({ k: 'pDefend', pMp: p.mp });
      ev.push({ k: 'text', text: '방어 자세를 취했다. (받는 피해 55% 감소, MP 회복)', tone: 'info' });
      break;
    case 'item': {
      b.stats.itemsUsed++;
      const e = action.effect;
      ev.push({ k: 'text', text: `${action.name} 사용!`, tone: 'info' });
      if (e.type === 'heal') {
        const hp0 = p.hp;
        const mp0 = p.mp;
        if (e.full) {
          p.hp = p.maxHp;
          p.mp = p.maxMp;
        } else {
          p.hp = Math.min(p.maxHp, p.hp + Math.round((e.hp || 0) * healMult(b)));
          p.mp = Math.min(p.maxMp, p.mp + (e.mp || 0));
        }
        ev.push({ k: 'pHeal', hp: p.hp - hp0, mp: p.mp - mp0, pHp: p.hp, pMp: p.mp });
      } else if (e.type === 'battleBuff') {
        if (e.atkPct) p.buffs.push({ kind: 'atk', pct: e.atkPct, turns: e.turns });
        if (e.defPct) p.buffs.push({ kind: 'def', pct: e.defPct, turns: e.turns });
        ev.push({ k: 'pBuff', text: e.atkPct ? `공격력 +${e.atkPct}% (${e.turns}턴)` : `방어력 +${e.defPct}% (${e.turns}턴)` });
      } else if (e.type === 'escape') {
        if (b.setup.canEscape) {
          b.over = 'escape';
          ev.push({ k: 'escape', ok: true });
          return { state: b, events: ev };
        }
        ev.push({ k: 'text', text: '이 전투에서는 도망칠 수 없다!', tone: 'bad' });
      }
      break;
    }
    case 'escape': {
      if (isDummy(b.monster)) {
        b.over = 'escape';
        ev.push({ k: 'text', text: '훈련을 마쳤다.', tone: 'info' });
        ev.push({ k: 'escape', ok: true });
        return { state: b, events: ev };
      }
      if (!b.setup.canEscape) {
        ev.push({ k: 'text', text: '이 전투에서는 도망칠 수 없다!', tone: 'bad' });
        return { state: input, events: ev };
      }
      const chance = Math.max(0.25, Math.min(0.9, 0.5 + (p.dex - b.monster.level * 1.2) * 0.02));
      if (rng() < chance) {
        b.over = 'escape';
        ev.push({ k: 'escape', ok: true });
        ev.push({ k: 'text', text: '무사히 도망쳤다!', tone: 'info' });
        return { state: b, events: ev };
      }
      ev.push({ k: 'escape', ok: false });
      ev.push({ k: 'text', text: '도망치지 못했다!', tone: 'bad' });
      break;
    }
  }

  if (!checkMonsterDeath(b, ev)) monsterActs = false;
  if (b.over) return { state: b, events: ev };

  if (monsterActs) monsterTurn(b, ev, rng);
  if (p.hp <= 0) {
    p.hp = 0;
    b.over = 'defeat';
    ev.push({ k: 'defeat' });
    return { state: b, events: ev };
  }

  // end of round: poison damage
  if (p.poison) {
    const dmg = Math.max(1, Math.round((p.maxHp * p.poison.pct) / 100));
    p.hp = Math.max(0, p.hp - dmg);
    ev.push({ k: 'pDot', dmg, pHp: p.hp, text: `독이 퍼진다… ${dmg} 피해` });
    p.poison.turns -= 1;
    if (p.poison.turns <= 0) {
      p.poison = null;
      if (p.hp > 0) ev.push({ k: 'text', text: '독이 해독되었다.', tone: 'good' });
    }
    if (p.hp <= 0) {
      b.over = 'defeat';
      ev.push({ k: 'defeat' });
      return { state: b, events: ev };
    }
  }
  if (p.armorBreak) {
    p.armorBreak.turns -= 1;
    if (p.armorBreak.turns <= 0) {
      p.armorBreak = null;
      ev.push({ k: 'text', text: '방어력이 회복되었다.', tone: 'good' });
    }
  }
  // tick statuses
  p.buffs = p.buffs.map((x) => ({ ...x, turns: x.turns - 1 })).filter((x) => x.turns > 0);
  if (p.curse) {
    p.curse.turns -= 1;
    if (p.curse.turns <= 0) {
      p.curse = null;
      ev.push({ k: 'text', text: '저주가 풀렸다.', tone: 'good' });
    }
  }
  const m = b.monster;
  if (m.defUp) {
    m.defUp.turns -= 1;
    if (m.defUp.turns <= 0) m.defUp = null;
  }
  if (m.defDown) {
    m.defDown.turns -= 1;
    if (m.defDown.turns <= 0) m.defDown = null;
  }
  b.turn += 1;
  return { state: b, events: ev };
}

// ── monster turn ─────────────────────────────────────────────
function hitPlayer(b: BattleState, ev: BattleEvent[], rng: Rng, mult: number, fx: Extract<BattleEvent, { k: 'mAttack' }>['fx'], opts: { magic?: boolean; canMiss?: boolean; trueDmg?: number; pierce?: number } = {}) {
  const p = b.player;
  const m = b.monster;
  if (opts.canMiss !== false && opts.trueDmg === undefined) {
    const evade = Math.min(0.15, 0.03 + p.dex * 0.001);
    if (rng() < evade) {
      ev.push({ k: 'mAttack', dmg: 0, crit: false, miss: true, fx, pHp: p.hp, guarded: p.defending });
      return 0;
    }
  }
  let dmg: number;
  let crit = false;
  if (opts.trueDmg !== undefined) {
    dmg = opts.trueDmg;
  } else {
    const def = playerDef(p) * (opts.magic ? 0.6 : 1) * (1 - (opts.pierce || 0));
    dmg = calcDamage(monsterAtk(m), def, rng, mult);
    if (rng() < 0.05) {
      crit = true;
      dmg = Math.round(dmg * 1.5);
    }
  }
  if (p.defending) dmg = Math.max(1, Math.round(dmg * 0.45));
  p.hp = Math.max(0, p.hp - dmg);
  ev.push({ k: 'mAttack', dmg, crit, miss: false, fx, pHp: p.hp, guarded: p.defending });
  return dmg;
}

function monsterTurn(b: BattleState, ev: BattleEvent[], rng: Rng) {
  const m = b.monster;
  const p = b.player;
  if (isDummy(m)) {
    ev.push({ k: 'text', text: '허수아비는 묵묵히 서 있다…', tone: 'info' });
    return;
  }

  // boss phase change
  if (m.boss && !m.enraged && m.hp < m.maxHp * 0.5) {
    m.enraged = true;
    ev.push({ k: 'mBuff', text: `${m.name}이(가) 분노했다! 공격력 상승!` });
  }

  const kit = monsterSkills(m.defId);
  // execute charged attacks first
  if (m.charging) {
    const c = m.charging;
    m.charging = null;
    if (c === 'ult' && kit) {
      useMonsterSkill(b, ev, rng, kit.ult, true);
    } else if (c === 'darkcharge') {
      ev.push({ k: 'text', text: '암흑 베기!!', tone: 'bad' });
      hitPlayer(b, ev, rng, 2.4, 'dark', { canMiss: false });
    } else if (c === 'breath') {
      ev.push({ k: 'text', text: '브레스가 쏟아진다!!', tone: 'bad' });
      hitPlayer(b, ev, rng, 2.2, 'breath', { magic: true, canMiss: false });
    }
  } else if (kit && wantsUltimate(m)) {
    // 궁극기: at ≤50% HP (bosses again at ≤25%)
    m.ultUses += 1;
    if (kit.ult.charge) {
      m.charging = 'ult';
      ev.push({ k: 'mCharge', charge: true, text: `${m.name}이(가) 궁극기 『${kit.ult.name}』을(를) 준비한다…! 다음 턴에 방어하라!` });
    } else {
      useMonsterSkill(b, ev, rng, kit.ult, true);
    }
  } else {
    const usable = m.skills.filter((sk) => sk !== 'reassemble');
    const useSkill = (usable.length > 0 || kit) && rng() < m.skillRate;
    if (useSkill && kit && (usable.length === 0 || rng() < 0.6)) useMonsterSkill(b, ev, rng, kit.sig, false);
    else monsterAction(b, ev, rng, useSkill && usable.length ? pick(rng, usable) : 'attack');
  }

  // death sentence countdown (Reaper)
  if (m.deathCount !== null && m.hp > 0 && p.hp > 0) {
    m.deathCount -= 1;
    if (m.deathCount <= 0) {
      m.deathCount = null;
      const dmg = Math.round(p.maxHp * (p.defending ? 0.15 : 0.6));
      ev.push({ k: 'text', text: p.defending ? '죽음의 집행! …방어로 버텨냈다!' : '죽음의 선고가 집행되었다!!', tone: 'bad' });
      hitPlayer(b, ev, rng, 1, 'death', { trueDmg: Math.round(dmg / (p.defending ? 0.45 : 1)) });
    }
    ev.push({ k: 'counter', kind: 'death', value: m.deathCount });
  }

  // doom clock (13th floor)
  if (m.doom !== null && m.hp > 0 && p.hp > 0) {
    m.doom -= 1;
    if (m.doom <= 0) {
      const raw = Math.round(p.maxHp * 0.7);
      ev.push({ k: 'text', text: p.defending ? '파멸의 시계가 울렸다! …방어로 충격을 줄였다!' : '파멸의 시계가 울렸다!!!', tone: 'bad' });
      const shown = p.defending ? Math.round(p.maxHp * 0.2) : raw;
      hitPlayer(b, ev, rng, 1, 'doom', { trueDmg: Math.round(shown / (p.defending ? 0.45 : 1)) });
      m.doom = 13;
    }
    ev.push({ k: 'counter', kind: 'doom', value: m.doom });
  }
}

function wantsUltimate(m: MonsterInstance) {
  if (m.hp <= 0) return false;
  if (m.ultUses === 0 && m.hp <= m.maxHp * 0.5) return true;
  return m.boss && m.ultUses === 1 && m.hp <= m.maxHp * 0.25;
}

/** Executes a data-driven monster skill (signature or ultimate). */
function useMonsterSkill(b: BattleState, ev: BattleEvent[], rng: Rng, sk: MSkill, ult: boolean) {
  const m = b.monster;
  const p = b.player;
  ev.push({ k: 'text', text: ult ? `궁극기 『${sk.name}』!!` : `${m.name}의 『${sk.name}』!`, tone: ult ? 'bad' : 'warn' });
  let total = 0;
  if (sk.power) {
    const hits = sk.hits || 1;
    for (let i = 0; i < hits && p.hp > 0; i++) {
      total += hitPlayer(b, ev, rng, sk.power, sk.fx, { magic: sk.magic, pierce: sk.pierce, canMiss: !ult });
    }
  }
  if (sk.truePct && p.hp > 0) {
    total += hitPlayer(b, ev, rng, 1, sk.fx, { trueDmg: Math.max(1, Math.round((p.maxHp * sk.truePct) / 100)) });
  }
  if (sk.drain && total > 0) {
    const heal = Math.round(total * sk.drain);
    m.hp = Math.min(m.maxHp, m.hp + heal);
    ev.push({ k: 'mHeal', hp: heal, mHp: m.hp });
  }
  if (sk.heal) {
    const heal = Math.round((m.maxHp * sk.heal) / 100);
    m.hp = Math.min(m.maxHp, m.hp + heal);
    ev.push({ k: 'mHeal', hp: heal, mHp: m.hp });
  }
  if (sk.buffAtk) {
    m.atkBuff = (m.atkBuff || 0) + sk.buffAtk;
    ev.push({ k: 'mBuff', text: `${m.name}의 공격력이 ${sk.buffAtk}% 올랐다!` });
  }
  if (sk.buffDef) {
    m.defUp = { ...sk.buffDef };
    ev.push({ k: 'mBuff', text: `${m.name}의 방어력이 ${sk.buffDef.pct}% 올랐다! (${sk.buffDef.turns}턴)` });
  }
  if (p.hp <= 0) return;
  if (sk.curse) {
    p.curse = { ...sk.curse };
    ev.push({ k: 'text', text: `공격력이 ${sk.curse.pct}% 떨어졌다! (${sk.curse.turns}턴)`, tone: 'bad' });
  }
  if (sk.armorBreak) {
    p.armorBreak = { ...sk.armorBreak };
    ev.push({ k: 'text', text: `방어력이 ${sk.armorBreak.pct}% 떨어졌다! (${sk.armorBreak.turns}턴)`, tone: 'bad' });
  }
  if (sk.poison) {
    p.poison = { ...sk.poison };
    ev.push({ k: 'text', text: `중독되었다! 매 턴 최대 HP의 ${sk.poison.pct}% 피해 (${sk.poison.turns}턴)`, tone: 'bad' });
  }
  if (sk.steal) {
    const amount = Math.min(p.gold - b.stolenGold, 5 + m.level * 3);
    if (amount > 0) {
      b.stolenGold += amount;
      ev.push({ k: 'text', text: `${amount} G를 빼앗겼다! (쓰러뜨리면 되찾는다)`, tone: 'bad' });
    }
  }
}

function monsterAction(b: BattleState, ev: BattleEvent[], rng: Rng, sk: string) {
  const m = b.monster;
  const p = b.player;
  const basic = () => hitPlayer(b, ev, rng, 1, m.magic ? 'magic' : 'melee', { magic: m.magic });
  switch (sk) {
    case 'splash':
      ev.push({ k: 'text', text: `${m.name}이(가) 점액을 튀겼다!` });
      hitPlayer(b, ev, rng, 1.25, 'melee');
      break;
    case 'regen':
      if (m.hp < m.maxHp * 0.7) {
        const heal = Math.round(m.maxHp * 0.15);
        m.hp = Math.min(m.maxHp, m.hp + heal);
        ev.push({ k: 'text', text: `${m.name}의 몸이 다시 뭉쳤다!` });
        ev.push({ k: 'mHeal', hp: heal, mHp: m.hp });
      } else basic();
      break;
    case 'ember':
      ev.push({ k: 'text', text: `${m.name}이(가) 불꽃을 뿜었다!` });
      hitPlayer(b, ev, rng, 1.3, 'magic', { magic: true });
      break;
    case 'drain': {
      ev.push({ k: 'text', text: `${m.name}이(가) 생명력을 흡수한다!` });
      const dmg = hitPlayer(b, ev, rng, 1.0, 'magic', { magic: true });
      if (dmg > 0) {
        const heal = Math.round(dmg * 0.5);
        m.hp = Math.min(m.maxHp, m.hp + heal);
        ev.push({ k: 'mHeal', hp: heal, mHp: m.hp });
      }
      break;
    }
    case 'goldrain':
      ev.push({ k: 'text', text: '황금 비가 쏟아진다!' });
      hitPlayer(b, ev, rng, 0.75, 'gold');
      if (p.hp > 0) hitPlayer(b, ev, rng, 0.75, 'gold');
      break;
    case 'ambush':
      ev.push({ k: 'text', text: `${m.name}의 기습!` });
      hitPlayer(b, ev, rng, 1.4, 'melee');
      break;
    case 'steal': {
      const amount = Math.min(p.gold - b.stolenGold, 5 + m.level * 2);
      if (amount > 0) {
        b.stolenGold += amount;
        ev.push({ k: 'text', text: `${m.name}이(가) ${amount} G를 훔쳤다! (쓰러뜨리면 되찾는다)`, tone: 'bad' });
        hitPlayer(b, ev, rng, 0.6, 'melee');
      } else basic();
      break;
    }
    case 'arrow':
      ev.push({ k: 'text', text: '화살 두 발이 날아온다!' });
      hitPlayer(b, ev, rng, 0.7, 'melee');
      if (p.hp > 0) hitPlayer(b, ev, rng, 0.7, 'melee');
      break;
    case 'heavy':
      ev.push({ k: 'text', text: `${m.name}의 강타!` });
      hitPlayer(b, ev, rng, 1.6, 'melee');
      break;
    case 'warcry':
      if (!m.enraged) {
        m.enraged = true;
        ev.push({ k: 'mBuff', text: `${m.name}의 전투의 함성! 공격력이 올랐다!` });
      } else basic();
      break;
    case 'bonethrow':
      ev.push({ k: 'text', text: `${m.name}이(가) 뼈를 던졌다!` });
      hitPlayer(b, ev, rng, 1.3, 'melee');
      break;
    case 'fireball':
      ev.push({ k: 'text', text: `${m.name}의 화염구!` });
      hitPlayer(b, ev, rng, 1.45, 'magic', { magic: true });
      break;
    case 'curse':
      if (!p.curse) {
        p.curse = { pct: 25, turns: 3 };
        ev.push({ k: 'text', text: `${m.name}의 저주! 공격력이 25% 감소했다 (3턴)`, tone: 'bad' });
        hitPlayer(b, ev, rng, 0.5, 'magic', { magic: true });
      } else basic();
      break;
    case 'darkcharge':
      m.charging = 'darkcharge';
      ev.push({ k: 'mCharge', text: `${m.name}이(가) 어둠의 힘을 모으고 있다…! 다음 턴에 방어하라!`, charge: true });
      break;
    case 'breath':
      m.charging = 'breath';
      ev.push({ k: 'mCharge', text: `${m.name}이(가) 숨을 크게 들이마신다…! 다음 턴에 방어하라!`, charge: true });
      break;
    case 'ironwall':
      if (!m.defUp) {
        m.defUp = { pct: 40, turns: 3 };
        ev.push({ k: 'mBuff', text: `${m.name}이(가) 방어 태세를 갖췄다! 방어력 +40%` });
      } else basic();
      break;
    case 'quake':
      ev.push({ k: 'text', text: '대지가 흔들린다!' });
      hitPlayer(b, ev, rng, 1.35, 'melee', { canMiss: false });
      break;
    case 'scythe':
      ev.push({ k: 'text', text: '사신의 낫이 휘둘러진다!' });
      hitPlayer(b, ev, rng, 1.5, 'dark', { magic: true });
      break;
    case 'deathsentence':
      if (m.deathCount === null) {
        m.deathCount = 5; // ticks to 4 at the end of this turn
        ev.push({ k: 'mCharge', text: '죽음의 선고! 4턴 뒤 죽음이 집행된다. 카운트가 1일 때 방어하라!' });
      } else basic();
      break;
    case 'doom':
      if (m.doom !== null && m.doom > 3) {
        m.doom -= 2;
        ev.push({ k: 'mCharge', text: '열세 번째 손님이 시계바늘을 앞당겼다! (−2)' });
      } else basic();
      break;
    case 'glitch': {
      ev.push({ k: 'text', text: 'G̷L̷I̷T̷C̷H̷ — 현실이 일그러진다!', tone: 'bad' });
      const dmg = Math.round(p.maxHp * 0.13);
      hitPlayer(b, ev, rng, 1, 'glitch', { trueDmg: Math.round(p.defending ? dmg / 0.45 : dmg) });
      break;
    }
    default:
      basic();
  }
}

export function totalRewards(b: BattleState) {
  let exp = 0;
  let gold = 0;
  for (const m of b.defeated) {
    exp += m.exp;
    gold += m.gold;
  }
  return { exp, gold };
}
