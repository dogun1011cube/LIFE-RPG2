import type { ArmorMaterial, IconId, ItemDef, StatBlock } from '../game/types';
import { autoPrice, stageForLevel } from './weapons';

// ─────────────────────────────────────────────────────────────
// ARMOR — helmets / body armor / gloves / boots in 4 materials.
// Wearing 2 or 4 pieces of the same material grants a set bonus.
// ─────────────────────────────────────────────────────────────

export type ArmorSlot = 'helmet' | 'armor' | 'gloves' | 'boots';
export const ARMOR_SLOTS: ArmorSlot[] = ['helmet', 'armor', 'gloves', 'boots'];

export interface ArmorMaterialDef {
  id: ArmorMaterial;
  ko: string;
  en: string;
  icon: IconId;
  desc: string;
  /** Set bonuses: [pieces needed, bonus]. Bonuses stack (2-piece + 4-piece). */
  sets: [number, StatBlock][];
}

export const ARMOR_MATERIALS: Record<ArmorMaterial, ArmorMaterialDef> = {
  cloth: { id: 'cloth', ko: '천', en: 'CLOTH', icon: 'robe', desc: '마력이 잘 흐르는 옷감. 마법 캐릭터에게 어울린다.', sets: [[2, { mpPct: 10, mpSave: 5 }], [4, { dmg: 6, mpSave: 5 }]] },
  leather: { id: 'leather', ko: '가죽', en: 'LEATHER', icon: 'vest', desc: '가볍고 질긴 가죽. 몸놀림이 빨라진다.', sets: [[2, { crit: 3, dodge: 3 }], [4, { critDmg: 15, dodge: 4 }]] },
  mail: { id: 'mail', ko: '사슬', en: 'MAIL', icon: 'armor', desc: '쇠고리를 엮은 균형 잡힌 방어구.', sets: [[2, { hpPct: 6, defPct: 4 }], [4, { hpPct: 6, dmgReduce: 5 }]] },
  plate: { id: 'plate', ko: '판금', en: 'PLATE', icon: 'plate', desc: '두꺼운 강철판. 무겁지만 무엇이든 막아낸다.', sets: [[2, { defPct: 10 }], [4, { dmgReduce: 10, hpPct: 5 }]] },
};
export const ARMOR_MATERIAL_ORDER: ArmorMaterial[] = ['cloth', 'leather', 'mail', 'plate'];

const DEFAULT_ICON: Record<ArmorSlot, Record<ArmorMaterial, IconId>> = {
  helmet: { cloth: 'hood', leather: 'helmet', mail: 'helmet', plate: 'helmet' },
  armor: { cloth: 'robe', leather: 'vest', mail: 'armor', plate: 'plate' },
  gloves: { cloth: 'gloves', leather: 'gloves', mail: 'gloves', plate: 'gauntlet' },
  boots: { cloth: 'boots', leather: 'boots', mail: 'boots', plate: 'greaves' },
};
const PRICE_MULT: Record<ArmorSlot, number> = { helmet: 0.9, armor: 1, gloves: 0.85, boots: 0.85 };

type GearInput = Omit<ItemDef, 'category' | 'slot' | 'icon' | 'price' | 'material'> & { icon?: IconId; price?: number; level: number };

const A = (slot: ArmorSlot, material: ArmorMaterial, d: GearInput): ItemDef => ({
  category: 'equipment',
  slot,
  material,
  icon: DEFAULT_ICON[slot][material],
  ...d,
  price: d.price ?? Math.round((autoPrice(d.rarity, d.level) * PRICE_MULT[slot]) / 10) * 10,
  minRank: d.minRank ?? (d.shop ? stageForLevel(d.level) : undefined),
});

const LG = { loot: true, gacha: true } as const;
const SHOP = { shop: 'armor', loot: true, gacha: true } as const;

export const ARMORS: ItemDef[] = [
  // ───────────── HELMETS 투구 ─────────────
  // 천
  A('helmet', 'cloth', { id: 'h_bandana', name: '필승 머리띠', nameEn: 'Focus Headband', desc: '"필승"이라고 적힌 머리띠. 매면 정신이 번쩍 든다.', rarity: 'common', stats: { def: 1, int: 1, mp: 5 }, tint: '#ff6b6b', level: 2, ...SHOP }),
  A('helmet', 'cloth', { id: 'h_wizhat', name: '견습 마법사 모자', nameEn: 'Apprentice Wizard Hat', desc: '끝이 뾰족한 마법사 모자. 쓰기만 해도 마력이 맑아진다.', rarity: 'uncommon', stats: { def: 4, matk: 3, mp: 10 }, icon: 'wizhat', tint: '#7950f2', level: 6, ...SHOP }),
  A('helmet', 'cloth', { id: 'h_scholar', name: '학자의 두건', nameEn: "Scholar's Hood", desc: '집중력을 높여주는 짙은 남색 두건.', rarity: 'uncommon', price: 230, stats: { def: 6, int: 3, mp: 10 }, icon: 'helmet', tint: '#364fc7', shop: 'armor', minRank: 'E', level: 8, ...LG }),
  A('helmet', 'cloth', { id: 'h_flamehood', name: '화염술사의 두건', nameEn: "Pyromancer's Hood", desc: '불꽃 무늬가 수놓인 두건. 화염 마법이 거세진다.', rarity: 'rare', stats: { def: 9, matk: 8, fireDmg: 4 }, tint: '#ff922b', level: 16, ...SHOP }),
  A('helmet', 'cloth', { id: 'h_venomhood', name: '독술사의 두건', nameEn: "Toxicologist's Hood", desc: '독초 향이 배어 있는 두건.', rarity: 'rare', stats: { def: 10, matk: 8, poisonDmg: 4 }, tint: '#94d82d', level: 18, ...LG }),
  A('helmet', 'cloth', { id: 'h_sage', name: '현자의 서클릿', nameEn: "Sage's Circlet", desc: '지혜의 보석이 박힌 머리띠.', rarity: 'epic', price: 2300, stats: { def: 18, int: 10, mp: 40 }, icon: 'crown', tint: '#e599f7', shop: 'armor', minRank: 'B', level: 26, ...LG }),
  A('helmet', 'cloth', { id: 'h_halo', name: '성자의 서클릿', nameEn: "Saint's Circlet", desc: '은은한 빛이 머리 위를 감싼다. 신성 마법이 강해진다.', rarity: 'epic', stats: { def: 20, matk: 14, holyDmg: 6, hp: 50 }, icon: 'crown', tint: '#fff3bf', level: 34, ...LG }),
  A('helmet', 'cloth', { id: 'h_archhat', name: '대마법사의 고깔', nameEn: "Archmage's Hat", desc: '탑 꼭대기의 대마법사가 쓰던 고깔모자.', rarity: 'legendary', stats: { def: 30, matk: 32, int: 14, mp: 80 }, icon: 'wizhat', tint: '#5c7cfa', level: 55, ...LG }),
  A('helmet', 'cloth', { id: 'h_omniscience', name: '전지(全知)의 왕관', nameEn: 'Crown of Omniscience', desc: '세상의 모든 문제의 답이 떠오른다는 왕관.', rarity: 'mythic', stats: { def: 48, matk: 50, int: 25, mp: 150, expBonus: 10 }, icon: 'crown', tint: '#ff4d6d', level: 90, ...LG }),
  // 가죽
  A('helmet', 'leather', { id: 'h_leather', name: '가죽 모자', nameEn: 'Leather Cap', desc: '머리를 보호하는 최소한의 장비.', rarity: 'common', price: 25, stats: { def: 2, hp: 5 }, tint: '#a0703c', level: 1, ...SHOP }),
  A('helmet', 'leather', { id: 'h_bandit', name: '도적의 두건', nameEn: 'Bandit Hood', desc: '얼굴을 반쯤 가리는 두건. 눈빛이 날카로워진다.', rarity: 'common', stats: { def: 4, crit: 2, dex: 1 }, icon: 'hood', tint: '#495057', level: 5, ...SHOP }),
  A('helmet', 'leather', { id: 'h_ranger', name: '레인저 모자', nameEn: "Ranger's Cap", desc: '깃털이 꽂힌 숲지기의 모자.', rarity: 'uncommon', stats: { def: 7, dex: 3, crit: 2 }, tint: '#2f9e44', level: 10, ...SHOP }),
  A('helmet', 'leather', { id: 'h_nightmask', name: '밤까마귀 가면', nameEn: 'Nightraven Mask', desc: '까마귀 부리 모양의 가면. 어둠 속에서도 급소가 보인다.', rarity: 'rare', stats: { def: 11, crit: 5, dex: 4 }, tint: '#343a40', level: 19, ...LG }),
  A('helmet', 'leather', { id: 'h_wolf', name: '늑대 가죽 투구', nameEn: 'Wolfpelt Helm', desc: '거대한 늑대의 머리 가죽으로 만든 투구.', rarity: 'rare', stats: { def: 14, hp: 40, crit: 3 }, tint: '#adb5bd', level: 23, ...SHOP }),
  A('helmet', 'leather', { id: 'h_shadowcowl', name: '그림자 고깔', nameEn: 'Shadow Cowl', desc: '그림자를 엮어 만든 고깔. 쓰면 존재감이 희미해진다.', rarity: 'epic', stats: { def: 22, crit: 7, dex: 8 }, icon: 'hood', tint: '#5f3dc4', level: 36, ...LG }),
  A('helmet', 'leather', { id: 'h_galeband', name: '질풍의 머리띠', nameEn: 'Galeband', desc: '바람이 머리띠를 따라 흐른다. 공격이 스치기만 한다.', rarity: 'legendary', stats: { def: 30, crit: 10, dex: 12, dodge: 3 }, icon: 'hood', tint: '#66d9e8', level: 52, ...LG }),
  // 사슬
  A('helmet', 'mail', { id: 'h_coif', name: '사슬 두건', nameEn: 'Mail Coif', desc: '머리와 목을 감싸는 사슬 두건.', rarity: 'uncommon', stats: { def: 6, hp: 20 }, icon: 'hood', tint: '#ced4da', level: 7, ...SHOP }),
  A('helmet', 'mail', { id: 'h_centurion', name: '백인대장의 투구', nameEn: 'Centurion Helm', desc: '붉은 깃털 장식이 달린 지휘관의 투구.', rarity: 'rare', stats: { def: 12, hp: 35, str: 2 }, tint: '#fa5252', level: 15, ...SHOP }),
  A('helmet', 'mail', { id: 'h_valkyrie', name: '발키리의 날개 투구', nameEn: 'Valkyrie Helm', desc: '양옆에 은빛 날개가 달린 투구. 전장의 용기를 북돋운다.', rarity: 'epic', stats: { def: 22, hp: 80, str: 4, matk: 8 }, tint: '#e9ecef', level: 31, ...LG }),
  A('helmet', 'mail', { id: 'h_kabuto', name: '무사의 투구', nameEn: 'Samurai Kabuto', desc: '초승달 장식이 달린 무사의 투구.', rarity: 'epic', stats: { def: 26, hp: 100, crit: 4 }, tint: '#c92a2a', level: 39, ...SHOP }),
  A('helmet', 'mail', { id: 'h_dragon', name: '용비늘 투구', nameEn: 'Dragonscale Helm', desc: '심연의 용 비늘로 만든 투구. 화염을 막아낸다.', rarity: 'legendary', price: 8000, stats: { def: 32, hp: 160, str: 6 }, icon: 'helmet', tint: '#ff922b', level: 45, ...LG }),
  A('helmet', 'mail', { id: 'h_seaking', name: '해왕의 비늘 투구', nameEn: "Sea King's Helm", desc: '바다를 다스리던 왕의 투구. 어떤 파도도 머리에 닿지 않는다.', rarity: 'mythic', stats: { def: 60, hp: 320, str: 14, dmgReduce: 4 }, tint: '#1c7ed6', level: 85, ...LG }),
  // 판금
  A('helmet', 'plate', { id: 'h_pot', name: '냄비 투구', nameEn: 'Pot Helmet', desc: '부엌에서 몰래 가져온 냄비. 의외로 튼튼하다.', rarity: 'common', stats: { def: 3 }, tint: '#868e96', level: 1, ...SHOP }),
  A('helmet', 'plate', { id: 'h_iron', name: '철 투구', nameEn: 'Iron Helm', desc: '묵직하지만 든든하다.', rarity: 'common', price: 80, stats: { def: 4, hp: 15 }, icon: 'helmet', level: 4, ...SHOP }),
  A('helmet', 'plate', { id: 'h_greathelm', name: '강철 대투구', nameEn: 'Steel Greathelm', desc: '얼굴 전체를 덮는 통짜 강철 투구.', rarity: 'uncommon', stats: { def: 10, hp: 25 }, tint: '#adb5bd', level: 11, ...SHOP }),
  A('helmet', 'plate', { id: 'h_knight', name: '기사의 투구', nameEn: 'Knight Helm', desc: '깃털 장식이 달린 기사단의 투구.', rarity: 'rare', price: 700, stats: { def: 12, hp: 40, str: 2 }, icon: 'helmet', tint: '#dee2e6', shop: 'armor', minRank: 'D', level: 14, ...LG }),
  A('helmet', 'plate', { id: 'h_darkhelm', name: '암흑기사의 투구', nameEn: 'Dark Knight Helm', desc: '지하묘지의 암흑기사가 쓰던 뿔 달린 투구.', rarity: 'epic', stats: { def: 26, hp: 90 }, tint: '#5f3dc4', level: 30, ...LG }),
  A('helmet', 'plate', { id: 'h_guardian', name: '수호자의 투구', nameEn: 'Guardian Helm', desc: '성문을 지키던 수호 기사단의 투구.', rarity: 'epic', stats: { def: 30, hp: 110 }, tint: '#ffd43b', level: 37, ...SHOP }),
  A('helmet', 'plate', { id: 'h_dragonking', name: '용왕의 투구', nameEn: 'Dragon King Helm', desc: '용왕의 두개골을 본떠 만든 위압적인 투구.', rarity: 'legendary', stats: { def: 44, hp: 240, str: 10 }, tint: '#e8590c', level: 60, ...LG }),
  A('helmet', 'plate', { id: 'h_aegis', name: '이지스 투구', nameEn: 'Aegis Helm', desc: '신의 방패와 같은 금속으로 만든 투구.', rarity: 'legendary', stats: { def: 48, hp: 220, dmgReduce: 3 }, tint: '#fab005', level: 66, ...LG }),
  A('helmet', 'plate', { id: 'h_eternal', name: '영원의 왕관 투구', nameEn: 'Eternal Crown Helm', desc: '시간마저 비켜 간다는 영원의 투구.', rarity: 'mythic', stats: { def: 70, hp: 380, str: 15, int: 15 }, tint: '#ff4d6d', level: 95, ...LG }),

  // ───────────── ARMOR 갑옷 ─────────────
  // 천
  A('armor', 'cloth', { id: 'a_tunic', name: '천 튜닉', nameEn: 'Cloth Tunic', desc: '편하게 공부할 때 입는 옷. 전투용은 아니다.', rarity: 'common', price: 30, stats: { def: 3, hp: 5 }, icon: 'armor', tint: '#8ce99a', level: 1, ...SHOP }),
  A('armor', 'cloth', { id: 'a_uniform', name: '교복', nameEn: 'School Uniform', desc: '단정하게 다린 교복. 입으면 왠지 공부가 하고 싶어진다.', rarity: 'common', stats: { def: 4, hp: 10, int: 1 }, icon: 'armor', tint: '#364fc7', level: 3, ...SHOP }),
  A('armor', 'cloth', { id: 'a_robe', name: '마도사의 로브', nameEn: "Mage's Robe", desc: '마력이 흐르는 실로 짠 로브.', rarity: 'uncommon', price: 260, stats: { def: 7, mp: 30, int: 3, matk: 4 }, icon: 'robe', tint: '#7950f2', shop: 'armor', minRank: 'E', level: 8, ...LG }),
  A('armor', 'cloth', { id: 'a_hoodie', name: '밤샘 후드티', nameEn: 'All-Nighter Hoodie', desc: '수많은 밤을 함께 새운 후드티. 포근하고 마력이 깃들었다.', rarity: 'uncommon', stats: { def: 9, mp: 20, int: 3 }, icon: 'vest', tint: '#495057', level: 10, ...SHOP }),
  A('armor', 'cloth', { id: 'a_flamerobe', name: '화염술사의 로브', nameEn: "Pyromancer's Robe", desc: '불에 타지 않는 실로 짠 붉은 로브.', rarity: 'rare', stats: { def: 16, matk: 10, fireDmg: 5, mp: 30 }, tint: '#f76707', level: 17, ...SHOP }),
  A('armor', 'cloth', { id: 'a_venomrobe', name: '맹독 로브', nameEn: 'Venomweave Robe', desc: '독초 즙으로 물들인 녹색 로브.', rarity: 'rare', stats: { def: 18, matk: 10, poisonDmg: 5, mp: 30 }, tint: '#74b816', level: 20, ...LG }),
  A('armor', 'cloth', { id: 'a_vestment', name: '사제의 법의', nameEn: 'Priest Vestment', desc: '금실로 성스러운 문양을 수놓은 하얀 법의.', rarity: 'rare', stats: { def: 19, matk: 10, holyDmg: 5, hp: 40 }, tint: '#fff9db', level: 22, ...SHOP }),
  A('armor', 'cloth', { id: 'a_starrobe', name: '별빛 로브', nameEn: 'Starlight Robe', desc: '새벽 3시의 별빛을 수놓은 로브.', rarity: 'epic', price: 2700, stats: { def: 26, mp: 70, int: 12, matk: 12 }, icon: 'robe', tint: '#5c7cfa', shop: 'armor', minRank: 'B', level: 27, ...LG }),
  A('armor', 'cloth', { id: 'a_archrobe', name: '대현자의 로브', nameEn: "Archsage's Robe", desc: '천 년을 산 현자의 로브. 소매 끝까지 지식이 배어 있다.', rarity: 'legendary', stats: { def: 42, matk: 30, int: 14, mp: 100, magicDmg: 6 }, tint: '#cc5de8', level: 50, ...LG }),
  A('armor', 'cloth', { id: 'a_galaxy', name: '은하수 로브', nameEn: 'Milky Way Robe', desc: '은하수를 통째로 옷감 삼아 지은 로브.', rarity: 'mythic', stats: { def: 70, matk: 55, int: 22, mp: 180, dmg: 6 }, tint: '#ff4d6d', level: 88, ...LG }),
  // 가죽
  A('armor', 'leather', { id: 'a_leather', name: '가죽 갑옷', nameEn: 'Leather Armor', desc: '움직임을 방해하지 않는 가벼운 갑옷.', rarity: 'common', price: 90, stats: { def: 6, hp: 15 }, icon: 'armor', tint: '#a0703c', level: 4, ...SHOP }),
  A('armor', 'leather', { id: 'a_jerkin', name: '사냥꾼의 조끼', nameEn: "Hunter's Jerkin", desc: '주머니가 많은 사냥꾼의 가죽 조끼.', rarity: 'uncommon', stats: { def: 10, dex: 2, crit: 1 }, tint: '#8d6e4a', level: 7, ...SHOP }),
  A('armor', 'leather', { id: 'a_studded', name: '징 박힌 가죽 갑옷', nameEn: 'Studded Leather', desc: '쇠징을 촘촘히 박아 넣은 가죽 갑옷.', rarity: 'uncommon', stats: { def: 14, hp: 20, dex: 2 }, tint: '#6c4f35', level: 11, ...SHOP }),
  A('armor', 'leather', { id: 'a_shadowsuit', name: '그림자 슈트', nameEn: 'Shadow Suit', desc: '빛을 반사하지 않는 검은 가죽옷.', rarity: 'rare', stats: { def: 20, crit: 5, dex: 4 }, tint: '#343a40', level: 18, ...LG }),
  A('armor', 'leather', { id: 'a_drakehide', name: '비룡 가죽 갑옷', nameEn: 'Drakehide Armor', desc: '하늘을 나는 비룡의 가죽으로 만든 갑옷.', rarity: 'epic', stats: { def: 34, hp: 80, crit: 5, dex: 5 }, tint: '#2b8a3e', level: 33, ...SHOP }),
  A('armor', 'leather', { id: 'a_phantom', name: '환영의 외투', nameEn: 'Phantom Garb', desc: '입은 사람이 여럿으로 보이는 신비한 외투.', rarity: 'legendary', stats: { def: 48, crit: 10, dex: 12, dodge: 3 }, tint: '#9775fa', level: 56, ...LG }),
  // 사슬
  A('armor', 'mail', { id: 'a_ringmail', name: '링 메일', nameEn: 'Ring Mail', desc: '가죽 위에 쇠고리를 덧댄 갑옷.', rarity: 'common', stats: { def: 8, hp: 15 }, tint: '#adb5bd', level: 5, ...SHOP }),
  A('armor', 'mail', { id: 'a_chain', name: '사슬 갑옷', nameEn: 'Chainmail', desc: '촘촘히 엮은 쇠사슬 갑옷.', rarity: 'uncommon', price: 270, stats: { def: 12, hp: 25 }, icon: 'armor', shop: 'armor', minRank: 'E', level: 8, ...LG }),
  A('armor', 'mail', { id: 'a_mithril', name: '미스릴 흉갑', nameEn: 'Mithril Cuirass', desc: '은빛으로 빛나는 가볍고 단단한 흉갑.', rarity: 'rare', price: 860, stats: { def: 22, hp: 60 }, icon: 'armor', tint: '#a5d8ff', shop: 'armor', minRank: 'D', level: 15, ...LG }),
  A('armor', 'mail', { id: 'a_scale', name: '비늘 갑옷', nameEn: 'Scale Armor', desc: '물고기 비늘처럼 금속 조각을 겹친 갑옷.', rarity: 'rare', stats: { def: 27, hp: 70 }, tint: '#38d9a9', level: 21, ...SHOP }),
  A('armor', 'mail', { id: 'a_brigandine', name: '브리간딘', nameEn: 'Brigandine', desc: '천 안쪽에 철판을 리벳으로 고정한 튼튼한 갑옷.', rarity: 'epic', stats: { def: 38, hp: 110, str: 4 }, tint: '#862e9c', level: 32, ...LG }),
  A('armor', 'mail', { id: 'a_dragonmail', name: '용비늘 사슬갑옷', nameEn: 'Dragonscale Mail', desc: '용의 비늘을 한 장 한 장 엮어 만든 갑옷.', rarity: 'legendary', stats: { def: 60, hp: 280, str: 8, dmgReduce: 3 }, tint: '#ff922b', level: 58, ...LG }),
  A('armor', 'mail', { id: 'a_seaking', name: '해왕의 비늘 갑옷', nameEn: "Sea King's Scale", desc: '심해의 왕이 입던 갑옷. 깊은 바다의 압력도 견딘다.', rarity: 'mythic', stats: { def: 92, hp: 450, str: 14, dmgReduce: 5 }, tint: '#1c7ed6', level: 85, ...LG }),
  // 판금
  A('armor', 'plate', { id: 'a_breastplate', name: '강철 흉갑', nameEn: 'Steel Breastplate', desc: '가슴을 단단히 막아 주는 강철판.', rarity: 'uncommon', stats: { def: 17, hp: 35 }, tint: '#ced4da', level: 11, ...SHOP }),
  A('armor', 'plate', { id: 'a_knightplate', name: '기사의 판금 갑옷', nameEn: 'Knight Plate', desc: '기사 서임식 날 받는 번쩍이는 판금 갑옷.', rarity: 'rare', stats: { def: 30, hp: 80 }, tint: '#e9ecef', level: 19, ...SHOP }),
  A('armor', 'plate', { id: 'a_darkplate', name: '암흑 판금갑옷', nameEn: 'Dark Plate', desc: '암흑기사단의 판금갑옷. 무겁지만 단단하다.', rarity: 'epic', price: 2500, stats: { def: 42, hp: 130 }, icon: 'armor', tint: '#5f3dc4', level: 30, ...LG }),
  A('armor', 'plate', { id: 'a_fortress', name: '요새 갑옷', nameEn: 'Fortress Plate', desc: '걸어 다니는 요새라는 별명이 붙은 갑옷.', rarity: 'epic', stats: { def: 50, hp: 160 }, tint: '#868e96', level: 39, ...SHOP }),
  A('armor', 'plate', { id: 'a_dragon', name: '용기사의 갑옷', nameEn: 'Dragoon Armor', desc: '용을 타던 기사의 전설적인 갑옷.', rarity: 'legendary', price: 9500, stats: { def: 58, hp: 260, str: 8 }, icon: 'armor', tint: '#fd7e14', shop: 'armor', minRank: 'S', level: 46, ...LG }),
  A('armor', 'plate', { id: 'a_titan', name: '티탄 판금 갑옷', nameEn: 'Titan Plate', desc: '거신족의 대장장이가 두드린 판금 갑옷.', rarity: 'legendary', stats: { def: 72, hp: 320, str: 10 }, tint: '#ffd43b', level: 64, ...LG }),
  A('armor', 'plate', { id: 'a_eternal', name: '영원의 성갑', nameEn: 'Eternal Holy Plate', desc: '빛이 깃든 영원의 갑옷. 어떤 공격도 반으로 줄어든다는 전설이 있다.', rarity: 'mythic', stats: { def: 100, hp: 480, str: 15, dmgReduce: 5 }, tint: '#ff4d6d', level: 95, ...LG }),

  // ───────────── GLOVES 장갑 ─────────────
  // 천
  A('gloves', 'cloth', { id: 'g_cotton', name: '면장갑', nameEn: 'Cotton Gloves', desc: '필기할 때 손이 미끄러지지 않는다.', rarity: 'common', price: 20, stats: { def: 1, dex: 1 }, tint: '#f1f3f5', level: 1, ...SHOP }),
  A('gloves', 'cloth', { id: 'g_silk', name: '비단 장갑', nameEn: 'Silk Gloves', desc: '손끝의 감각이 살아나는 비단 장갑.', rarity: 'uncommon', stats: { def: 3, matk: 5, mp: 10 }, tint: '#fcc2d7', level: 7, ...SHOP }),
  A('gloves', 'cloth', { id: 'g_ember', name: '불씨 장갑', nameEn: 'Ember Gloves', desc: '손바닥에서 작은 불꽃이 피어오른다.', rarity: 'rare', stats: { def: 6, matk: 10, fireDmg: 4 }, tint: '#ff922b', level: 15, ...SHOP }),
  A('gloves', 'cloth', { id: 'g_herbal', name: '약초꾼의 장갑', nameEn: "Herbalist's Gloves", desc: '독초를 맨손으로 만지지 않게 해 주는 장갑.', rarity: 'rare', stats: { def: 7, matk: 10, poisonDmg: 4 }, tint: '#82c91e', level: 18, ...LG }),
  A('gloves', 'cloth', { id: 'g_prayer', name: '기도의 장갑', nameEn: 'Gloves of Prayer', desc: '두 손을 모으면 따스한 빛이 난다.', rarity: 'epic', stats: { def: 12, matk: 16, holyDmg: 5, hp: 40 }, tint: '#fff3bf', level: 30, ...LG }),
  A('gloves', 'cloth', { id: 'g_arcane', name: '비전의 장갑', nameEn: 'Arcane Gloves', desc: '손등에 마법진이 새겨진 장갑.', rarity: 'legendary', stats: { def: 20, matk: 30, int: 10, magicDmg: 5 }, tint: '#748ffc', level: 50, ...LG }),
  // 가죽
  A('gloves', 'leather', { id: 'g_leather', name: '가죽 건틀릿', nameEn: 'Leather Gauntlets', desc: '주먹에 힘이 들어간다.', rarity: 'common', price: 65, stats: { def: 3, atk: 2 }, tint: '#a0703c', level: 4, ...SHOP }),
  A('gloves', 'leather', { id: 'g_focus', name: '집중의 장갑', nameEn: 'Gloves of Focus', desc: '손끝까지 집중력이 흐른다.', rarity: 'uncommon', price: 240, stats: { dex: 4, crit: 3, def: 2 }, tint: '#38d9a9', shop: 'armor', minRank: 'E', level: 9, ...LG }),
  A('gloves', 'leather', { id: 'g_archer', name: '궁수의 장갑', nameEn: "Archer's Gloves", desc: '시위를 당기는 손가락을 보호하는 장갑.', rarity: 'uncommon', stats: { def: 4, dex: 4, crit: 2 }, tint: '#c49a6c', level: 11, ...SHOP }),
  A('gloves', 'leather', { id: 'g_thief', name: '소매치기 장갑', nameEn: 'Pickpocket Gloves', desc: '손이 빨라져서 몬스터의 주머니도 슬쩍한다.', rarity: 'rare', stats: { def: 5, luk: 4, crit: 3, goldBonus: 5 }, tint: '#495057', level: 16, ...SHOP }),
  A('gloves', 'leather', { id: 'g_thunder', name: '번개의 장갑', nameEn: 'Thunder Gloves', desc: '번개처럼 빠른 손놀림을 선사한다.', rarity: 'epic', price: 2200, stats: { atk: 14, crit: 8, dex: 6 }, tint: '#ffe066', shop: 'armor', minRank: 'A', level: 30, ...LG }),
  A('gloves', 'leather', { id: 'g_assassin', name: '암살자의 장갑', nameEn: "Assassin's Gloves", desc: '소리 없이 목표에 닿는 검은 장갑.', rarity: 'epic', stats: { atk: 18, crit: 9, dex: 7 }, tint: '#5f3dc4', level: 36, ...LG }),
  A('gloves', 'leather', { id: 'g_godhand', name: '신의 손', nameEn: 'God Hand', desc: '무엇을 쥐어도 신기(神器)가 된다는 전설의 장갑.', rarity: 'mythic', stats: { atk: 40, matk: 40, crit: 14, dex: 18 }, tint: '#ff4d6d', level: 88, ...LG }),
  // 사슬
  A('gloves', 'mail', { id: 'g_chain', name: '사슬 장갑', nameEn: 'Mail Gloves', desc: '손등을 덮는 쇠사슬 장갑.', rarity: 'common', stats: { def: 2, hp: 10 }, tint: '#ced4da', level: 3, ...SHOP }),
  A('gloves', 'mail', { id: 'g_scale', name: '비늘 장갑', nameEn: 'Scale Gloves', desc: '비늘 조각을 겹쳐 만든 장갑.', rarity: 'rare', stats: { def: 10, hp: 40, atk: 6 }, tint: '#38d9a9', level: 20, ...LG }),
  A('gloves', 'mail', { id: 'g_valor', name: '용기의 건틀릿', nameEn: 'Gauntlets of Valor', desc: '두려움을 이겨 낸 전사에게만 맞는 건틀릿.', rarity: 'epic', stats: { def: 15, hp: 70, atk: 12, str: 4 }, icon: 'gauntlet', tint: '#ffa94d', level: 34, ...SHOP }),
  A('gloves', 'mail', { id: 'g_dragonclaw', name: '용조(龍爪) 장갑', nameEn: 'Dragonclaw Gloves', desc: '손끝에 용의 발톱이 달린 장갑.', rarity: 'legendary', stats: { def: 24, hp: 120, atk: 24, str: 8 }, tint: '#e8590c', level: 56, ...LG }),
  // 판금
  A('gloves', 'plate', { id: 'g_iron', name: '철 건틀릿', nameEn: 'Iron Gauntlets', desc: '무겁지만 주먹이 곧 망치가 된다.', rarity: 'uncommon', stats: { def: 5, atk: 4 }, tint: '#adb5bd', level: 8, ...SHOP }),
  A('gloves', 'plate', { id: 'g_steel', name: '강철 건틀릿', nameEn: 'Steel Gauntlets', desc: '강철로 감싼 주먹은 그 자체로 무기다.', rarity: 'rare', price: 680, stats: { def: 8, atk: 8 }, icon: 'gloves', shop: 'armor', minRank: 'D', level: 15, ...LG }),
  A('gloves', 'plate', { id: 'g_titan', name: '거인의 건틀릿', nameEn: "Titan's Gauntlets", desc: '거인의 손을 본떠 만든 거대한 건틀릿.', rarity: 'epic', stats: { def: 18, atk: 16, str: 6 }, tint: '#868e96', level: 38, ...SHOP }),
  A('gloves', 'plate', { id: 'g_aegis', name: '수호의 건틀릿', nameEn: 'Aegis Gauntlets', desc: '막는 순간 충격이 사라지는 신비한 건틀릿.', rarity: 'legendary', stats: { def: 30, atk: 20, hp: 100, dmgReduce: 2 }, tint: '#fab005', level: 62, ...LG }),

  // ───────────── BOOTS 신발 ─────────────
  // 천
  A('boots', 'cloth', { id: 'b_sandal', name: '짚신', nameEn: 'Straw Sandals', desc: '발이 편하면 오래 앉아 있을 수 있다.', rarity: 'common', price: 15, stats: { def: 1, hp: 5 }, tint: '#e9c46a', level: 1, ...SHOP }),
  A('boots', 'cloth', { id: 'b_slipper', name: '실내화', nameEn: 'Classroom Slippers', desc: '교실에서 신던 실내화. 발이 편해야 집중이 된다.', rarity: 'common', stats: { def: 1, mp: 5, int: 1 }, tint: '#f8f9fa', level: 2, ...SHOP }),
  A('boots', 'cloth', { id: 'b_mage', name: '마법사의 신발', nameEn: "Mage's Shoes", desc: '끝이 동그랗게 말린 마법사의 신발.', rarity: 'uncommon', stats: { def: 4, mp: 15, matk: 4 }, tint: '#7950f2', level: 9, ...SHOP }),
  A('boots', 'cloth', { id: 'b_cloud', name: '구름 걸음 신발', nameEn: 'Cloudstep Shoes', desc: '구름 위를 걷는 듯 가볍다.', rarity: 'epic', stats: { def: 12, matk: 14, mp: 40, dodge: 2 }, tint: '#e7f5ff', level: 32, ...LG }),
  A('boots', 'cloth', { id: 'b_starwalk', name: '별빛 걸음', nameEn: 'Starwalkers', desc: '걸음마다 별빛 가루가 흩날린다.', rarity: 'legendary', stats: { def: 20, matk: 24, int: 10, mp: 60 }, tint: '#91a7ff', level: 54, ...LG }),
  // 가죽
  A('boots', 'leather', { id: 'b_leather', name: '가죽 부츠', nameEn: 'Leather Boots', desc: '탑의 계단을 오르기에 알맞은 신발.', rarity: 'common', price: 65, stats: { def: 3, dex: 1 }, tint: '#a0703c', level: 4, ...SHOP }),
  A('boots', 'leather', { id: 'b_runner', name: '육상화', nameEn: 'Running Shoes', desc: '체육 시간에 신던 운동화. 발이 저절로 빨라진다.', rarity: 'uncommon', stats: { def: 3, dex: 3 }, tint: '#ff6b6b', level: 6, ...SHOP }),
  A('boots', 'leather', { id: 'b_gale', name: '질풍의 신발', nameEn: 'Gale Shoes', desc: '바람처럼 가볍게 움직인다.', rarity: 'uncommon', price: 250, stats: { dex: 5, def: 4 }, tint: '#66d9e8', shop: 'armor', minRank: 'E', level: 9, ...LG }),
  A('boots', 'leather', { id: 'b_shadow', name: '그림자 장화', nameEn: 'Shadow Boots', desc: '발소리가 나지 않는 검은 장화.', rarity: 'rare', stats: { def: 8, dex: 5, crit: 3, dodge: 2 }, tint: '#343a40', level: 18, ...LG }),
  A('boots', 'leather', { id: 'b_spirit', name: '바람 정령의 부츠', nameEn: 'Windspirit Boots', desc: '바람의 정령이 깃든 부츠.', rarity: 'epic', price: 2300, stats: { dex: 12, def: 14, crit: 5 }, tint: '#3bc9db', shop: 'armor', minRank: 'A', level: 30, ...LG }),
  A('boots', 'leather', { id: 'b_winged', name: '날개 달린 신발', nameEn: 'Winged Sandals', desc: '발목에 작은 날개가 달린 신발. 공격이 닿기 전에 이미 없다.', rarity: 'legendary', stats: { def: 20, dex: 14, crit: 6, dodge: 4 }, tint: '#fff3bf', level: 52, ...LG }),
  // 사슬
  A('boots', 'mail', { id: 'b_chain', name: '사슬 각반', nameEn: 'Mail Chausses', desc: '다리를 감싸는 사슬 각반.', rarity: 'uncommon', stats: { def: 6, hp: 20 }, tint: '#ced4da', level: 10, ...SHOP }),
  A('boots', 'mail', { id: 'b_scale', name: '비늘 장화', nameEn: 'Scale Boots', desc: '물에 젖지 않는 비늘 장화.', rarity: 'rare', stats: { def: 11, hp: 45 }, tint: '#38d9a9', level: 21, ...LG }),
  A('boots', 'mail', { id: 'b_dragon', name: '용비늘 장화', nameEn: 'Dragonscale Boots', desc: '용암 위도 걸을 수 있다는 장화.', rarity: 'legendary', stats: { def: 26, hp: 150, str: 6 }, tint: '#ff922b', level: 58, ...LG }),
  // 판금
  A('boots', 'plate', { id: 'b_iron', name: '철 장화', nameEn: 'Iron Boots', desc: '한 걸음 한 걸음이 묵직하다.', rarity: 'common', stats: { def: 3, hp: 5 }, tint: '#adb5bd', level: 4, ...SHOP }),
  A('boots', 'plate', { id: 'b_knight', name: '기사의 그리브', nameEn: 'Knight Greaves', desc: '단단한 강철 정강이 보호대.', rarity: 'rare', price: 690, stats: { def: 10, hp: 35 }, icon: 'boots', tint: '#dee2e6', shop: 'armor', minRank: 'D', level: 15, ...LG }),
  A('boots', 'plate', { id: 'b_darkgreave', name: '암흑기사의 각반', nameEn: 'Dark Knight Greaves', desc: '검게 그을린 판금 각반.', rarity: 'epic', stats: { def: 18, hp: 70 }, tint: '#5f3dc4', level: 31, ...LG }),
  A('boots', 'plate', { id: 'b_titan', name: '티탄 각반', nameEn: 'Titan Greaves', desc: '땅을 구르면 지진이 난다는 각반.', rarity: 'legendary', stats: { def: 30, hp: 160, str: 8 }, tint: '#ffd43b', level: 64, ...LG }),
  A('boots', 'plate', { id: 'b_eternal', name: '영원의 각반', nameEn: 'Eternal Greaves', desc: '영원의 성갑과 한 쌍을 이루는 각반.', rarity: 'mythic', stats: { def: 44, hp: 240, str: 15, dmgReduce: 3 }, tint: '#ff4d6d', level: 95, ...LG }),
];

/** Active set bonuses for the given equipped armor pieces. */
export function armorSetBonuses(equipped: ItemDef[]): { material: ArmorMaterial; count: number; active: StatBlock[]; next?: number }[] {
  const counts = new Map<ArmorMaterial, number>();
  for (const d of equipped) if (d.material) counts.set(d.material, (counts.get(d.material) || 0) + 1);
  return ARMOR_MATERIAL_ORDER.filter((m) => counts.has(m)).map((m) => {
    const count = counts.get(m)!;
    const sets = ARMOR_MATERIALS[m].sets;
    return { material: m, count, active: sets.filter(([n]) => count >= n).map(([, b]) => b), next: sets.find(([n]) => count < n)?.[0] };
  });
}
