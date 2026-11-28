import { getMonster } from './monsters';

// ─────────────────────────────────────────────────────────────
// Attack types (공격 유형) and playable characters.
// Each character uses exactly one attack type and has four skills
// bound to the Q / W / E / R keys.
// ─────────────────────────────────────────────────────────────

export type AtkType = 'phys' | 'magic' | 'fire' | 'poison' | 'holy';
export const ATK_TYPES: AtkType[] = ['phys', 'magic', 'fire', 'poison', 'holy'];

export interface AtkTypeInfo {
  id: AtkType;
  ko: string;
  en: string;
  color: string;
  /** Stat the damage scales with. */
  stat: 'atk' | 'matk';
  /** Fraction of the enemy's DEF that this type ignores. */
  pierce: number;
  desc: string;
}

export const ATK_INFO: Record<AtkType, AtkTypeInfo> = {
  phys: { id: 'phys', ko: '물리', en: 'PHYSICAL', color: '#dee2e6', stat: 'atk', pierce: 0.2, desc: '공격력(ATK)으로 때린다. 방어력 20%를 무시하고, 치명타 피해가 +50% 더 강하다.' },
  magic: { id: 'magic', ko: '마법', en: 'MAGIC', color: '#74c0fc', stat: 'matk', pierce: 0.25, desc: '마법공격력(MATK)으로 때린다. 적 방어력을 25% 무시하고, 스킬이 방어를 더 꿰뚫는다.' },
  fire: { id: 'fire', ko: '화염', en: 'FIRE', color: '#ff922b', stat: 'matk', pierce: 0.2, desc: 'MATK로 때리고 적에게 화상(매 턴 지속 피해)을 입힌다.' },
  poison: { id: 'poison', ko: '독', en: 'POISON', color: '#94d82d', stat: 'matk', pierce: 0.5, desc: '직접 피해는 약하지만 독이 겹겹이 쌓여 매 턴 피해를 준다. 방어력 50% 무시.' },
  holy: { id: 'holy', ko: '신성', en: 'HOLY', color: '#ffe066', stat: 'matk', pierce: 0.25, desc: '방어력 25%를 무시하고, 피해의 일부를 HP로 흡수한다. 언데드에게 특효.' },
};

export type SkillKey = 'Q' | 'W' | 'E' | 'R';
export const SKILL_KEYS: SkillKey[] = ['Q', 'W', 'E', 'R'];

export type CSkillFx =
  | 'slash' | 'cleave' | 'insight' | 'gravity'
  | 'orb' | 'chain' | 'nova'
  | 'fire' | 'firepillar' | 'meteor'
  | 'poison' | 'mist' | 'plague'
  | 'holy' | 'holypillar' | 'judge'
  | 'heal' | 'buff';

export interface CSkill {
  id: string;
  key: SkillKey;
  name: string;
  desc: string;
  /** MP cost as % of max MP. */
  mpPct: number;
  /** Cooldown in turns (starts when used, resets every battle). */
  cd: number;
  /** Damage multiplier per hit (omit for non-damaging skills). */
  power?: number;
  hits?: number;
  pierce?: number; // extra DEF pierce (stacks with the type's)
  critBonus?: number;
  guaranteedCrit?: boolean;
  /** Heal the user for this fraction of the damage dealt. */
  lifesteal?: number;
  healPct?: number; // heal % of max HP
  buff?: { atkPct?: number; defPct?: number; turns: number };
  defDown?: { pct: number; turns: number };
  /** Damage over time: per-turn damage = coef × attack stat. */
  burn?: { coef: number; turns: number };
  poison?: { coef: number; turns: number };
  /** Immediately deal all remaining DoT damage × mult, and clear the DoTs. */
  burst?: number;
  /** Damage multiplier against undead/ghost/demon-type enemies. */
  undeadBonus?: number;
  fx: CSkillFx;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  type: AtkType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string; // theme color
  desc: string;
  starter?: boolean;
  /** Sprite key (see render/sprites.ts) */
  sprite: 'hero' | 'hero_mage' | 'hero_fire' | 'hero_poison' | 'hero_holy';
  palette?: Record<string, string>;
  mods: { hp: number; def: number; atk: number; matk: number; crit: number };
  skills: CSkill[];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'swordsman',
    name: '견습 검사',
    title: '검사',
    type: 'phys',
    rarity: 'common',
    color: '#dee2e6',
    desc: '여정을 시작한 모험가 본인. 단단하고 치명타가 강한 물리 전사.',
    starter: true,
    sprite: 'hero',
    mods: { hp: 1.25, def: 1.2, atk: 1.25, matk: 1, crit: 4 },
    skills: [
      { id: 'sw_q', key: 'Q', name: '집중 베기', desc: '정신을 집중해 강하게 벤다. (물리 ×1.6)', mpPct: 6, cd: 0, power: 1.6, fx: 'slash' },
      { id: 'sw_w', key: 'W', name: '방패 가르기', desc: '방어구를 쪼갠다. (물리 ×1.4, 3턴간 적 방어 −30%)', mpPct: 10, cd: 3, power: 1.4, defDown: { pct: 30, turns: 3 }, fx: 'gravity' },
      { id: 'sw_e', key: 'E', name: '연속 베기', desc: '검을 세 번 휘두른다. (물리 ×0.85 × 3회, 치명타 +15%)', mpPct: 16, cd: 3, power: 0.85, hits: 3, critBonus: 15, fx: 'cleave' },
      { id: 'sw_r', key: 'R', name: '일섬', desc: '모든 힘을 담은 단 한 번의 베기. (물리 ×4.0, 치명타 +40%)', mpPct: 28, cd: 5, power: 4.0, critBonus: 40, fx: 'insight' },
    ],
  },
  {
    id: 'mage',
    name: '에테르',
    title: '마도사',
    type: 'magic',
    rarity: 'epic',
    color: '#74c0fc',
    desc: '공식을 마력으로 바꾸는 천재 마도사. 방어를 무시하는 강력한 마법.',
    sprite: 'hero_mage',
    palette: {},
    mods: { hp: 1.0, def: 0.95, atk: 1, matk: 1.2, crit: 0 },
    skills: [
      { id: 'mg_q', key: 'Q', name: '마력탄', desc: '압축한 마력을 쏜다. (마법 ×1.5)', mpPct: 6, cd: 0, power: 1.5, fx: 'orb' },
      { id: 'mg_w', key: 'W', name: '공식 폭발', desc: '외운 공식을 터뜨린다. (마법 ×2.0, 방어 추가 20% 무시)', mpPct: 10, cd: 2, power: 2.0, pierce: 0.2, fx: 'orb' },
      { id: 'mg_e', key: 'E', name: '연쇄 반응', desc: '연속으로 폭발한다. (마법 ×0.95 × 3회)', mpPct: 16, cd: 3, power: 0.95, hits: 3, fx: 'chain' },
      { id: 'mg_r', key: 'R', name: '유레카', desc: '깨달음의 빛이 폭발한다. (마법 ×3.7, 방어 추가 25% 무시)', mpPct: 28, cd: 5, power: 3.7, pierce: 0.25, fx: 'nova' },
    ],
  },
  {
    id: 'pyro',
    name: '이그니스',
    title: '화염술사',
    type: 'fire',
    rarity: 'epic',
    color: '#ff922b',
    desc: '연소 반응을 다루는 화염술사. 화상으로 오래 태울수록 강해진다.',
    sprite: 'hero_fire',
    palette: {},
    mods: { hp: 1.0, def: 0.95, atk: 1, matk: 1.25, crit: 3 },
    skills: [
      { id: 'pf_q', key: 'Q', name: '화염구', desc: '불덩이를 던진다. (화염 ×1.3, 3턴 화상)', mpPct: 6, cd: 0, power: 1.3, burn: { coef: 0.34, turns: 3 }, fx: 'fire' },
      { id: 'pf_w', key: 'W', name: '불기둥', desc: '땅에서 불기둥이 솟는다. (화염 ×1.7, 4턴 강한 화상)', mpPct: 10, cd: 2, power: 1.7, burn: { coef: 0.48, turns: 4 }, fx: 'firepillar' },
      { id: 'pf_e', key: 'E', name: '폭염 폭발', desc: '쌓인 화상을 한꺼번에 터뜨린다. (화염 ×1.0 + 남은 화상 피해 ×1.3 즉시 폭발)', mpPct: 16, cd: 3, power: 1.0, burst: 1.3, fx: 'nova' },
      { id: 'pf_r', key: 'R', name: '태양 낙하', desc: '작은 태양을 떨어뜨린다. (화염 ×3.3, 5턴 맹렬한 화상)', mpPct: 28, cd: 5, power: 3.3, burn: { coef: 0.66, turns: 5 }, fx: 'meteor' },
    ],
  },
  {
    id: 'toxin',
    name: '비올라',
    title: '독술사',
    type: 'poison',
    rarity: 'epic',
    color: '#94d82d',
    desc: '약을 조제하는 독술사. 독을 겹겹이 쌓아 끈질기게 적을 녹인다.',
    sprite: 'hero_poison',
    palette: {},
    mods: { hp: 1.0, def: 1.0, atk: 1, matk: 1.25, crit: 6 },
    skills: [
      { id: 'px_q', key: 'Q', name: '독침', desc: '독을 바른 침을 쏜다. (독 ×0.9, 4턴 중독)', mpPct: 6, cd: 0, power: 0.9, poison: { coef: 0.4, turns: 4 }, fx: 'poison' },
      { id: 'px_w', key: 'W', name: '맹독 도포', desc: '강한 독을 퍼붓는다. (독 ×1.0, 4턴 맹독)', mpPct: 10, cd: 2, power: 1.0, poison: { coef: 0.6, turns: 4 }, fx: 'poison' },
      { id: 'px_e', key: 'E', name: '부식 안개', desc: '갑옷을 녹이는 안개. (독 ×0.8, 3턴간 적 방어 −35%, 4턴 중독)', mpPct: 16, cd: 3, power: 0.8, defDown: { pct: 35, turns: 3 }, poison: { coef: 0.42, turns: 4 }, fx: 'mist' },
      { id: 'px_r', key: 'R', name: '팬데믹', desc: '독이 폭발적으로 번진다. (독 ×1.2 + 남은 독 피해 ×1.6 즉시 폭발 + 6턴 맹독)', mpPct: 28, cd: 5, power: 1.2, burst: 1.6, poison: { coef: 0.72, turns: 6 }, fx: 'plague' },
    ],
  },
  {
    id: 'cleric',
    name: '세라핌',
    title: '성직자',
    type: 'holy',
    rarity: 'legendary',
    color: '#ffe066',
    desc: '새벽의 빛을 받드는 성직자. 피해를 흡수해 오래 버티고, 언데드를 정화한다.',
    sprite: 'hero_holy',
    palette: {},
    mods: { hp: 1.15, def: 1.05, atk: 1, matk: 1.2, crit: 0 },
    skills: [
      { id: 'cl_q', key: 'Q', name: '성광', desc: '빛의 화살. (신성 ×1.4, 피해의 15% 흡수)', mpPct: 6, cd: 0, power: 1.4, lifesteal: 0.15, fx: 'holy' },
      { id: 'cl_w', key: 'W', name: '심판의 빛', desc: '죄를 묻는 빛기둥. (신성 ×1.8, 언데드에게 ×1.5)', mpPct: 10, cd: 2, power: 1.8, undeadBonus: 1.5, fx: 'holypillar' },
      { id: 'cl_e', key: 'E', name: '축복', desc: '치유와 가호. (최대 HP 30% 회복, 3턴간 방어 +35%)', mpPct: 16, cd: 4, healPct: 30, buff: { defPct: 35, turns: 3 }, fx: 'heal' },
      { id: 'cl_r', key: 'R', name: '천벌', desc: '하늘이 내리는 벌. (신성 ×3.4, 방어 추가 20% 무시, 언데드 ×1.5, 피해의 25% 흡수)', mpPct: 28, cd: 5, power: 3.4, pierce: 0.2, undeadBonus: 1.5, lifesteal: 0.25, fx: 'judge' },
    ],
  },
];

export const CHARACTER_MAP: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const STARTER_CHARACTER = CHARACTERS.find((c) => c.starter)!.id;

export function getCharacter(id: string | undefined): CharacterDef {
  return (id && CHARACTER_MAP[id]) || CHARACTER_MAP[STARTER_CHARACTER];
}

/** MP cost of a skill. `mpSave` (%) comes from equipment such as tomes. */
export function skillMp(maxMp: number, sk: CSkill, mpSave = 0) {
  return Math.max(1, Math.ceil(((maxMp * sk.mpPct) / 100) * (1 - Math.min(50, Math.max(0, mpSave)) / 100)));
}

// ── Monster affinities (약점 / 내성 / 면역) ────────────────────
export interface Affinity {
  weak: AtkType[];
  resist: AtkType[];
  immune: AtkType[];
  undead: boolean;
}

export const AFFINITY_MULT = { weak: 1.3, resist: 0.8, immune: 0.5 };

const BY_SPRITE: Record<string, Partial<Affinity>> = {
  slime: { weak: ['fire'], immune: ['poison'] },
  goblin: { weak: ['magic', 'poison'] },
  skeleton: { weak: ['holy', 'fire'], immune: ['poison'], undead: true },
  knight: { weak: ['holy', 'magic'], resist: ['phys'] },
  ghost: { weak: ['holy', 'magic'], resist: ['phys'], immune: ['poison'], undead: true },
  imp: { weak: ['holy'], resist: ['fire'], undead: true },
  reaper: { weak: ['holy'], resist: ['phys'], immune: ['poison'], undead: true },
  dragon: { weak: ['magic'], resist: ['fire'] },
  golem: { weak: ['magic'], resist: ['phys'], immune: ['poison'] },
  lich: { weak: ['holy', 'phys'], resist: ['magic'], immune: ['poison'], undead: true },
  jester: {},
  dummy: {},
};

const BY_ID: Record<string, Partial<Affinity>> = {
  gargoyle: { weak: ['magic'], resist: ['phys', 'fire'], undead: false },
  frost_queen: { weak: ['fire'], resist: ['magic'], immune: ['poison'], undead: false },
  chimera: { weak: ['magic', 'poison'], resist: ['fire'] },
  guest13: { weak: ['holy'], undead: true },
  tower_master: {},
  archdemon: { weak: ['holy'], resist: ['fire'], undead: true },
};

export function affinityOf(defId: string): Affinity {
  const sprite = getMonster(defId).sprite;
  const base = BY_SPRITE[sprite] || {};
  const over = BY_ID[defId] || {};
  const m = { ...base, ...over };
  return { weak: m.weak || [], resist: m.resist || [], immune: m.immune || [], undead: !!m.undead };
}

export function affinityMult(defId: string, type: AtkType): number {
  const a = affinityOf(defId);
  if (a.immune.includes(type)) return AFFINITY_MULT.immune;
  if (a.resist.includes(type)) return AFFINITY_MULT.resist;
  if (a.weak.includes(type)) return AFFINITY_MULT.weak;
  return 1;
}
