import type { AtkType } from './characters';
import type { Rarity, StatBlock } from '../game/types';

// ─────────────────────────────────────────────────────────────
// PETS — six elemental spirits + two Secret-grade fusions.
//   • 3 pets of the same spirit and grade → 1 of the next grade (up to Mythic)
//   • Mythic Undine + Bell + Licht        → Angel   (Secret)
//   • Mythic Salamander + Yami + Zagred   → Devil   (Secret)
// One pet joins the adventure at a time: it gives a passive stat bonus and
// acts every battle turn. Effects scale with the grade (PET_GRADE_MULT).
// ─────────────────────────────────────────────────────────────

export type PetKind = 'undine' | 'salamander' | 'bell' | 'yami' | 'licht' | 'zagred' | 'angel' | 'devil';
export type PetRarity = Rarity | 'secret';
export const PET_RARITIES: PetRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'secret'];

export const PET_RARITY_INFO: Record<PetRarity, { ko: string; en: string; color: string }> = {
  common: { ko: '일반', en: 'COMMON', color: '#c3c8d4' },
  uncommon: { ko: '고급', en: 'UNCOMMON', color: '#51cf66' },
  rare: { ko: '희귀', en: 'RARE', color: '#4dabf7' },
  epic: { ko: '영웅', en: 'EPIC', color: '#b57bff' },
  legendary: { ko: '전설', en: 'LEGENDARY', color: '#ffc531' },
  mythic: { ko: '신화', en: 'MYTHIC', color: '#ff4d6d' },
  secret: { ko: '시크릿', en: 'SECRET', color: '#f8f0ff' },
};

/** Effect multiplier per grade. */
export const PET_GRADE_MULT: Record<PetRarity, number> = { common: 1, uncommon: 1.5, rare: 2.2, epic: 3.2, legendary: 4.6, mythic: 6.5, secret: 10 };

/** What the pet does on each battle turn (values at common grade; × grade multiplier). */
export interface PetAction {
  /** Damage = coef × the player's main attack stat (ATK or MATK, whichever is higher). */
  attack?: number;
  hits?: number;
  /** Attack type used for monster affinities. */
  type?: AtkType;
  /** % of max HP healed. */
  healPct?: number;
  /** % of max MP restored. */
  mpPct?: number;
  /** % of the pet's damage healed to the player. */
  drainPct?: number;
}

export interface PetDef {
  kind: PetKind;
  name: string;
  en: string;
  element: string;
  color: string;
  desc: string;
  /** Passive bonus at common grade (× grade multiplier, rounded to 0.1). */
  passive: StatBlock;
  action: PetAction;
  /** Short text for the battle action. */
  actionText: string;
  /** Secret fusions only. */
  secret?: boolean;
}

export const PETS: Record<PetKind, PetDef> = {
  undine: {
    kind: 'undine', name: '운디네', en: 'Undine', element: '물', color: '#4dabf7',
    desc: '맑은 샘에서 태어난 물의 정령. 상처를 씻어 낸다.',
    passive: { hpPct: 1.5 }, action: { healPct: 1.2 }, actionText: '치유의 물방울',
  },
  salamander: {
    kind: 'salamander', name: '샐러맨더', en: 'Salamander', element: '불', color: '#ff6b35',
    desc: '불꽃 속을 헤엄치는 불의 정령. 적을 태운다.',
    passive: { fireDmg: 2, dmg: 1 }, action: { attack: 0.08, type: 'fire' }, actionText: '불꽃 숨결',
  },
  bell: {
    kind: 'bell', name: '벨', en: 'Bell', element: '바람', color: '#63e6be',
    desc: '방울 소리와 함께 나타나는 바람의 정령. 날쌔게 몰아친다.',
    passive: { crit: 0.8, dodge: 0.5 }, action: { attack: 0.045, hits: 2, type: 'phys' }, actionText: '돌풍 연타',
  },
  yami: {
    kind: 'yami', name: '야미', en: 'Yami', element: '어둠', color: '#7950f2',
    desc: '그림자에 숨어 사는 어둠의 정령. 생명력을 빨아들인다.',
    passive: { critDmg: 3, lifesteal: 0.3 }, action: { attack: 0.07, type: 'poison', drainPct: 50 }, actionText: '그림자 흡수',
  },
  licht: {
    kind: 'licht', name: '리히트', en: 'Licht', element: '빛', color: '#ffe066',
    desc: '새벽빛을 머금은 빛의 정령. 마력을 채워 준다.',
    passive: { holyDmg: 2, mpPct: 2 }, action: { attack: 0.03, type: 'holy', mpPct: 1.2 }, actionText: '빛의 축복',
  },
  zagred: {
    kind: 'zagred', name: '자그레드', en: 'Zagred', element: '파괴', color: '#e03131',
    desc: '모든 것을 부수는 파괴의 정령. 한 방이 무겁다.',
    passive: { pierce: 1.2, dmg: 1 }, action: { attack: 0.11, type: 'phys' }, actionText: '파쇄의 일격',
  },
  angel: {
    kind: 'angel', name: '천사', en: 'Angel', element: '천상', color: '#fff3bf', secret: true,
    desc: '물·바람·빛의 신화 정령이 하나가 되어 내려온 천사. 지키고, 치유하고, 심판한다.',
    passive: { hpPct: 1.5, mpPct: 2, holyDmg: 2, crit: 0.8, dodge: 0.5 }, action: { attack: 0.08, type: 'holy', healPct: 1.2, mpPct: 0.8 }, actionText: '천상의 심판',
  },
  devil: {
    kind: 'devil', name: '악마', en: 'Devil', element: '마계', color: '#c92a2a', secret: true,
    desc: '불·어둠·파괴의 신화 정령이 하나가 되어 깨어난 악마. 모든 것을 불태우고 삼킨다.',
    passive: { fireDmg: 2, critDmg: 3, pierce: 1.2, dmg: 2, lifesteal: 0.3 }, action: { attack: 0.14, type: 'fire', drainPct: 30 }, actionText: '지옥의 업화',
  },
};

export const ELEMENTAL_PETS: PetKind[] = ['undine', 'salamander', 'bell', 'yami', 'licht', 'zagred'];
export const PET_ORDER: PetKind[] = [...ELEMENTAL_PETS, 'angel', 'devil'];

/** Secret fusions: three different Mythic spirits → one Secret pet. */
export const PET_FUSIONS: { result: PetKind; needs: PetKind[] }[] = [
  { result: 'angel', needs: ['undine', 'bell', 'licht'] },
  { result: 'devil', needs: ['salamander', 'yami', 'zagred'] },
];

export const PET_MERGE_COUNT = 3;

/** Pet summon (펫 소환): grades up to Legendary — Mythic and Secret only through merging. */
export const PET_GACHA = {
  single: 200,
  multi: 1800,
  rates: [
    ['common', 55],
    ['uncommon', 28],
    ['rare', 12.5],
    ['epic', 3.8],
    ['legendary', 0.7],
  ] as [Rarity, number][],
  /** Guaranteed Epic+ after this many pulls without one. */
  pity: 40,
};

/** Character summon (캐릭터 소환). */
export const CHAR_GACHA = {
  single: 300,
  multi: 2700,
  rate: 12, // % chance per pull for a character you don't own yet
  pity: 20, // guaranteed character after this many pulls without one
};

/** Passive bonus of a pet at its grade. */
export function petPassive(kind: PetKind, rarity: PetRarity): StatBlock {
  const m = PET_GRADE_MULT[rarity];
  const out: StatBlock = {};
  for (const [k, v] of Object.entries(PETS[kind].passive) as [keyof StatBlock, number][]) out[k] = Math.round(v * m * 10) / 10;
  return out;
}

/** Battle action of a pet at its grade. */
export function petAction(kind: PetKind, rarity: PetRarity): PetAction {
  const a = PETS[kind].action;
  const m = PET_GRADE_MULT[rarity];
  return {
    ...a,
    attack: a.attack ? a.attack * m : undefined,
    healPct: a.healPct ? Math.round(a.healPct * m * 10) / 10 : undefined,
    mpPct: a.mpPct ? Math.round(a.mpPct * m * 10) / 10 : undefined,
  };
}

export function nextPetRarity(r: PetRarity): PetRarity | null {
  if (r === 'mythic' || r === 'secret') return null;
  return PET_RARITIES[PET_RARITIES.indexOf(r) + 1];
}
