import type { AccessoryKind, IconId, ItemDef, StatBlock } from '../game/types';
import { autoPrice, stageForLevel } from './weapons';

// ─────────────────────────────────────────────────────────────
// ACCESSORIES — 6 kinds, each with a small fixed passive.
// Two accessory slots: two pieces of the same kind stack.
// ─────────────────────────────────────────────────────────────

export interface AccessoryKindDef {
  id: AccessoryKind;
  ko: string;
  en: string;
  icon: IconId;
  passive: StatBlock;
  desc: string;
}

export const ACC_KINDS: Record<AccessoryKind, AccessoryKindDef> = {
  ring: { id: 'ring', ko: '반지', en: 'RING', icon: 'ring', passive: { dmg: 2 }, desc: '손가락에 힘이 실린다.' },
  necklace: { id: 'necklace', ko: '목걸이', en: 'NECKLACE', icon: 'amulet', passive: { hpPct: 3 }, desc: '심장 가까이에서 생명력을 북돋운다.' },
  charm: { id: 'charm', ko: '부적', en: 'CHARM', icon: 'charm', passive: { expBonus: 2 }, desc: '행운과 집중을 불러온다.' },
  earring: { id: 'earring', ko: '귀걸이', en: 'EARRING', icon: 'earring', passive: { crit: 2 }, desc: '감각이 예민해져 급소가 보인다.' },
  bracelet: { id: 'bracelet', ko: '팔찌', en: 'BRACELET', icon: 'bracelet', passive: { defPct: 3 }, desc: '손목을 단단히 지켜 준다.' },
  relic: { id: 'relic', ko: '유물', en: 'RELIC', icon: 'hourglass', passive: { goldBonus: 3 }, desc: '오래된 보물. 재물운이 따른다.' },
};
export const ACC_KIND_ORDER: AccessoryKind[] = ['ring', 'necklace', 'charm', 'earring', 'bracelet', 'relic'];

type AccInput = Omit<ItemDef, 'category' | 'slot' | 'icon' | 'price' | 'accKind'> & { icon?: IconId; price?: number; level: number };

const R = (accKind: AccessoryKind, d: AccInput): ItemDef => ({
  category: 'equipment',
  slot: 'accessory',
  accKind,
  icon: ACC_KINDS[accKind].icon,
  ...d,
  price: d.price ?? Math.round((autoPrice(d.rarity, d.level) * 1.1) / 10) * 10,
  minRank: d.minRank ?? (d.shop ? stageForLevel(d.level) : undefined),
});

const LG = { loot: true, gacha: true } as const;
const SHOP = { shop: 'accessories', loot: true, gacha: true } as const;

export const ACCESSORIES: ItemDef[] = [
  // ── 반지 RING ─────────────────────────────────────────────
  R('ring', { id: 'r_wood', name: '나무 반지', nameEn: 'Wooden Ring', desc: '직접 깎아 만든 소박한 반지.', rarity: 'common', stats: { hp: 10, def: 1 }, tint: '#c49a6c', level: 1, ...SHOP }),
  R('ring', { id: 'r_copper', name: '구리 반지', nameEn: 'Copper Ring', desc: '전도성이 좋은 구리 반지. 힘이 약간 오른다.', rarity: 'common', price: 40, stats: { str: 1, atk: 1 }, tint: '#d9480f', level: 2, ...SHOP }),
  R('ring', { id: 'r_silver', name: '은 반지', nameEn: 'Silver Ring', desc: '맑은 은빛이 마음을 차분하게 한다.', rarity: 'common', price: 60, stats: { int: 1, mp: 8 }, tint: '#dee2e6', level: 3, ...SHOP }),
  R('ring', { id: 'r_ruby', name: '루비 반지', nameEn: 'Ruby Ring', desc: '타오르는 듯 붉은 루비. 불꽃의 힘이 깃들었다.', rarity: 'uncommon', stats: { atk: 4, matk: 4, fireDmg: 3 }, tint: '#e03131', level: 9, ...SHOP }),
  R('ring', { id: 'r_sapphire', name: '사파이어 반지', nameEn: 'Sapphire Ring', desc: '깊은 바다색 사파이어. 마력을 담아 둔다.', rarity: 'uncommon', stats: { matk: 5, mp: 15 }, tint: '#1c7ed6', level: 9, ...SHOP }),
  R('ring', { id: 'r_emerald', name: '에메랄드 반지', nameEn: 'Emerald Ring', desc: '독초처럼 짙은 녹색 보석.', rarity: 'rare', stats: { matk: 6, poisonDmg: 4, luk: 3 }, tint: '#2f9e44', level: 16, ...SHOP }),
  R('ring', { id: 'r_topaz', name: '토파즈 반지', nameEn: 'Topaz Ring', desc: '햇살을 머금은 황금빛 보석.', rarity: 'rare', stats: { matk: 6, holyDmg: 4, hp: 30 }, tint: '#fab005', level: 18, ...LG }),
  R('ring', { id: 'r_power', name: '투사의 반지', nameEn: "Gladiator's Ring", desc: '투기장 챔피언의 반지.', rarity: 'rare', price: 980, stats: { str: 5, atk: 8 }, tint: '#fa5252', shop: 'accessories', minRank: 'C', level: 18, ...LG }),
  R('ring', { id: 'r_assassin', name: '암살자의 반지', nameEn: "Assassin's Ring", desc: '안쪽에 작은 칼날이 숨겨진 반지.', rarity: 'epic', stats: { crit: 8, critDmg: 10 }, tint: '#5f3dc4', level: 32, ...LG }),
  R('ring', { id: 'r_dragon', name: '용의 심장 반지', nameEn: 'Dragonheart Ring', desc: '용의 심장처럼 뜨겁게 뛰는 반지.', rarity: 'legendary', price: 8500, stats: { str: 10, hp: 120, atk: 15 }, tint: '#ff6b6b', level: 45, ...LG }),
  R('ring', { id: 'r_mobius', name: '뫼비우스의 반지', nameEn: 'Möbius Ring', desc: '안과 밖이 없는 반지. 힘이 끝없이 순환한다.', rarity: 'legendary', stats: { atk: 20, matk: 20, dmg: 4 }, tint: '#91a7ff', level: 55, ...LG }),
  R('ring', { id: 'r_sol', name: '태양의 반지', nameEn: 'Ring of Sol', desc: '태양을 손가락에 끼운 듯 눈부시다.', rarity: 'mythic', stats: { atk: 40, matk: 40, str: 15, int: 15, dmg: 6 }, tint: '#ff4d6d', level: 90, ...LG }),

  // ── 목걸이 NECKLACE ───────────────────────────────────────
  R('necklace', { id: 'n_shell', name: '조개 목걸이', nameEn: 'Seashell Necklace', desc: '바닷가에서 주운 조개로 만든 목걸이.', rarity: 'common', stats: { hp: 15, luk: 1 }, tint: '#ffd8a8', level: 3, ...SHOP }),
  R('necklace', { id: 'n_star', name: '은빛 별 목걸이', nameEn: 'Silver Star Necklace', desc: '작은 별 모양 펜던트가 달린 목걸이.', rarity: 'uncommon', stats: { hp: 25, mp: 10 }, tint: '#e9ecef', level: 8, ...SHOP }),
  R('necklace', { id: 'n_wisdom', name: '지혜의 펜던트', nameEn: 'Pendant of Wisdom', desc: '지능과 MP, 공부 EXP를 함께 올려준다.', rarity: 'rare', price: 950, stats: { int: 6, mp: 20, expBonus: 5 }, tint: '#4dabf7', shop: 'accessories', minRank: 'D', level: 14, ...LG }),
  R('necklace', { id: 'n_life', name: '생명의 펜던트', nameEn: 'Pendant of Life', desc: '심장 박동에 맞춰 은은히 빛난다.', rarity: 'rare', stats: { hp: 70, def: 4 }, tint: '#ff8787', level: 17, ...SHOP }),
  R('necklace', { id: 'n_flameheart', name: '불꽃 심장 목걸이', nameEn: 'Flameheart Necklace', desc: '안에서 작은 불꽃이 쉬지 않고 타오른다.', rarity: 'epic', stats: { matk: 14, fireDmg: 6, hp: 50 }, tint: '#ff922b', level: 30, ...LG }),
  R('necklace', { id: 'n_viper', name: '독사의 목걸이', nameEn: 'Viper Necklace', desc: '뱀이 제 꼬리를 문 모양의 목걸이.', rarity: 'epic', stats: { matk: 14, poisonDmg: 6, hp: 50 }, tint: '#74b816', level: 30, ...LG }),
  R('necklace', { id: 'n_angeltear', name: '천사의 눈물', nameEn: "Angel's Tear", desc: '천사가 흘린 눈물이 굳어 보석이 되었다.', rarity: 'epic', stats: { matk: 14, holyDmg: 6, hp: 80 }, tint: '#d0ebff', level: 34, ...LG }),
  R('necklace', { id: 'n_phoenix', name: '불사조의 깃털 목걸이', nameEn: 'Phoenix Feather Necklace', desc: '불사조의 깃털 한 가닥. 쓰러질 때마다 다시 일어서게 한다.', rarity: 'legendary', stats: { hp: 200, str: 8, int: 8, lifesteal: 3 }, tint: '#ff6b35', level: 52, ...LG }),
  R('necklace', { id: 'n_cosmos', name: '우주의 방정식', nameEn: 'Equation of the Cosmos', desc: '우주를 설명하는 단 하나의 식. 모든 능력이 상승한다.', rarity: 'mythic', price: 30000, stats: { str: 15, int: 15, dex: 15, luk: 15, expBonus: 20, goldBonus: 20 }, tint: '#ff4d6d', level: 70, gacha: true }),
  R('necklace', { id: 'n_lucky7', name: '럭키 세븐 펜던트', nameEn: 'Lucky Seven Pendant', desc: '7층 행운의 전당의 보물. LUK +7, 치명타 +7%, EXP +7%, 골드 +7%.', rarity: 'legendary', price: 7777, stats: { luk: 7, crit: 7, expBonus: 7, goldBonus: 7 }, tint: '#ffd43b', level: 10, unique: true }),

  // ── 부적 CHARM ────────────────────────────────────────────
  R('charm', { id: 'c_clover', name: '네잎클로버', nameEn: 'Four-Leaf Clover', desc: '책 사이에 끼워 말린 네잎클로버.', rarity: 'common', stats: { luk: 3 }, tint: '#51cf66', level: 2, ...SHOP }),
  R('charm', { id: 'c_focus', name: '집중의 부적', nameEn: 'Charm of Focus', desc: '공부로 얻는 EXP가 5% 증가한다.', rarity: 'uncommon', price: 320, stats: { expBonus: 5 }, tint: '#ff8787', shop: 'accessories', minRank: 'E', level: 6, ...LG }),
  R('charm', { id: 'c_pass', name: '합격 부적', nameEn: 'Exam Success Charm', desc: '"합격"이라고 적힌 부적. 공부가 더 잘된다.', rarity: 'uncommon', stats: { expBonus: 4, int: 2 }, tint: '#fa5252', level: 7, ...SHOP }),
  R('charm', { id: 'n_deathcharm', name: '망자의 부적', nameEn: 'Charm of the Departed', desc: '4층의 사신이 남긴 부적. 죽음의 기운을 막아준다.', rarity: 'rare', price: 800, stats: { hp: 60, def: 6, luk: 4 }, tint: '#9775fa', level: 8, unique: true }),
  R('charm', { id: 'c_rabbit', name: '행운의 토끼발', nameEn: "Lucky Rabbit's Foot", desc: '행운과 치명타율이 오른다.', rarity: 'rare', price: 900, stats: { luk: 8, crit: 3 }, tint: '#fff3bf', shop: 'accessories', minRank: 'D', level: 14, ...LG }),
  R('charm', { id: 'c_ward', name: '액막이 부적', nameEn: 'Ward Charm', desc: '나쁜 기운을 막아 주는 붉은 부적.', rarity: 'rare', stats: { def: 6, hp: 40, dodge: 2 }, tint: '#e03131', level: 15, ...SHOP }),
  R('charm', { id: 'c_dream', name: '드림캐처', nameEn: 'Dreamcatcher', desc: '악몽을 걸러 내 푹 자고 일어나게 해 준다.', rarity: 'rare', stats: { mp: 40, int: 4, expBonus: 4 }, tint: '#e599f7', level: 20, ...LG }),
  R('charm', { id: 'c_fox', name: '구미호의 구슬', nameEn: 'Fox Bead', desc: '아홉 꼬리 여우가 품고 있던 신비한 구슬.', rarity: 'epic', stats: { matk: 18, crit: 5, luk: 8 }, tint: '#ffa8a8', level: 35, ...LG }),
  R('charm', { id: 'c_turtle', name: '황금 거북 부적', nameEn: 'Golden Turtle Charm', desc: '천천히, 그러나 꾸준히. 재물과 장수를 부른다.', rarity: 'legendary', stats: { goldBonus: 15, luk: 10, def: 10 }, tint: '#ffd43b', level: 50, ...LG }),

  // ── 귀걸이 EARRING ────────────────────────────────────────
  R('earring', { id: 'e_stud', name: '은 귀걸이', nameEn: 'Silver Studs', desc: '작고 단정한 은 귀걸이.', rarity: 'common', stats: { crit: 1, dex: 1 }, tint: '#dee2e6', level: 4, ...SHOP }),
  R('earring', { id: 'e_pearl', name: '진주 귀걸이', nameEn: 'Pearl Earrings', desc: '은은하게 빛나는 진주. 마음이 차분해진다.', rarity: 'uncommon', stats: { crit: 2, mp: 15, int: 2 }, tint: '#f8f9fa', level: 10, ...SHOP }),
  R('earring', { id: 'e_hawk', name: '매의 귀걸이', nameEn: 'Hawk Earring', desc: '매의 깃털 장식. 시야가 넓어진다.', rarity: 'rare', stats: { crit: 4, dex: 4 }, tint: '#a0703c', level: 18, ...SHOP }),
  R('earring', { id: 'e_demon', name: '악마의 귀걸이', nameEn: 'Demon Earring', desc: '속삭이는 목소리가 들리는 붉은 귀걸이.', rarity: 'epic', stats: { crit: 6, critDmg: 12, atk: 10, matk: 10 }, tint: '#c92a2a', level: 36, ...LG }),
  R('earring', { id: 'e_moon', name: '월광 귀걸이', nameEn: 'Moonlight Earring', desc: '달빛이 귓가에서 흔들린다.', rarity: 'legendary', stats: { crit: 8, critDmg: 15, dex: 10 }, tint: '#d0ebff', level: 54, ...LG }),

  // ── 팔찌 BRACELET ─────────────────────────────────────────
  R('bracelet', { id: 'br_band', name: '머리끈 팔찌', nameEn: 'Hair Tie Bracelet', desc: '공부할 때 머리를 묶던 고무줄. 손목에 차면 각오가 생긴다.', rarity: 'common', stats: { def: 2, dex: 1 }, tint: '#ff8787', level: 2, ...SHOP }),
  R('bracelet', { id: 'br_iron', name: '철 팔찌', nameEn: 'Iron Bracelet', desc: '묵직한 쇠 팔찌.', rarity: 'uncommon', stats: { def: 5, hp: 20 }, tint: '#adb5bd', level: 9, ...SHOP }),
  R('bracelet', { id: 'br_jade', name: '비취 팔찌', nameEn: 'Jade Bracelet', desc: '맑은 초록빛 비취. 나쁜 기운을 막는다고 한다.', rarity: 'rare', stats: { def: 8, hp: 40, luk: 3 }, tint: '#20c997', level: 17, ...SHOP }),
  R('bracelet', { id: 'br_guard', name: '수호자의 팔찌', nameEn: "Guardian's Bracelet", desc: '받은 충격의 일부를 흩어 버리는 팔찌.', rarity: 'epic', stats: { def: 16, hp: 100, dmgReduce: 2 }, tint: '#ffd43b', level: 33, ...LG }),
  R('bracelet', { id: 'br_titan', name: '거신의 팔찌', nameEn: "Titan's Bracelet", desc: '거신족이 차던 팔찌. 사람에게는 허리띠만 하다.', rarity: 'legendary', stats: { def: 26, hp: 180, str: 10, dmgReduce: 3 }, tint: '#e8590c', level: 58, ...LG }),

  // ── 유물 RELIC ────────────────────────────────────────────
  R('relic', { id: 'x_compass', name: '모험가의 나침반', nameEn: "Adventurer's Compass", desc: '언제나 보물이 있는 쪽을 가리킨다고 한다.', rarity: 'uncommon', stats: { dex: 3, luk: 2 }, icon: 'compass', tint: '#e9c46a', level: 6, ...SHOP }),
  R('relic', { id: 'c_purse', name: '금화 주머니', nameEn: 'Coin Purse', desc: '모든 골드 획득량이 8% 증가한다.', rarity: 'uncommon', price: 320, stats: { goldBonus: 8 }, icon: 'coin', tint: '#ffd43b', shop: 'accessories', minRank: 'E', level: 6, ...LG }),
  R('relic', { id: 'n_seal13', name: '열세 번째 인장', nameEn: 'The Thirteenth Seal', desc: '금기의 13층을 깨뜨린 자의 증표. 모든 능력치 +5, 공격·마공 +13, EXP +13%.', rarity: 'legendary', price: 13000, stats: { str: 5, int: 5, dex: 5, luk: 5, atk: 13, matk: 13, expBonus: 13 }, icon: 'seal', tint: '#ff4d6d', level: 14, unique: true }),
  R('relic', { id: 'x_calculator', name: '공학용 계산기', nameEn: 'Scientific Calculator', desc: '어떤 계산도 순식간에. 급소의 위치도 계산해 준다.', rarity: 'rare', stats: { int: 5, crit: 3, expBonus: 3 }, icon: 'calc', tint: '#495057', level: 16, ...SHOP }),
  R('relic', { id: 'h_hourglass', name: '시간의 모래시계', nameEn: 'Hourglass of Time', desc: '같은 시간도 더 길게 쓴다. 공부 EXP +12%.', rarity: 'epic', price: 3200, stats: { expBonus: 12, int: 4 }, tint: '#ffd8a8', shop: 'accessories', minRank: 'B', level: 25, ...LG }),
  R('relic', { id: 'x_ticket', name: '수험표', nameEn: 'Exam Admission Ticket', desc: '시험장에 들어갈 자격. 지니고 있으면 마음이 단단해진다.', rarity: 'epic', stats: { expBonus: 8, int: 6, luk: 6 }, icon: 'ticket', tint: '#74c0fc', level: 30, ...LG }),
  R('relic', { id: 'x_crystal', name: '예언의 수정구', nameEn: 'Crystal of Prophecy', desc: '다음 문제가 무엇인지 어렴풋이 보인다.', rarity: 'epic', stats: { matk: 20, int: 8, crit: 4 }, icon: 'orb', tint: '#b197fc', level: 38, ...LG }),
  R('relic', { id: 'n_scholar', name: '대학자의 인장', nameEn: "Grand Scholar's Seal", desc: '모든 공부 보상이 크게 증가한다.', rarity: 'legendary', price: 10000, stats: { expBonus: 18, goldBonus: 15, int: 8 }, icon: 'seal', tint: '#ffc531', level: 45, gacha: true }),
  R('relic', { id: 'x_philosopher', name: '현자의 돌', nameEn: "Philosopher's Stone", desc: '무엇이든 금으로 바꾼다는 연금술의 정점.', rarity: 'legendary', stats: { str: 14, int: 14, expBonus: 10, goldBonus: 10 }, icon: 'gem', tint: '#e03131', level: 60, ...LG }),
  R('relic', { id: 'x_seed', name: '세계수의 씨앗', nameEn: 'Seed of the World Tree', desc: '언젠가 세계를 떠받칠 나무의 씨앗.', rarity: 'mythic', stats: { hp: 300, atk: 40, matk: 40, expBonus: 15 }, icon: 'gem', tint: '#40c057', level: 92, ...LG }),
];

/** Fixed passive of an accessory (empty for non-accessories). */
export function accessoryPassive(def: ItemDef): StatBlock {
  return def.accKind ? ACC_KINDS[def.accKind].passive : {};
}
