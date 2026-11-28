import type { IconId, ItemDef, RankId, Rarity, StatBlock, WeaponKind } from '../game/types';

// ─────────────────────────────────────────────────────────────
// WEAPONS — 15 weapon kinds, each with a fixed kind passive.
// The passive is NOT scaled by forge upgrades; item stats are.
// ─────────────────────────────────────────────────────────────

export interface WeaponKindDef {
  id: WeaponKind;
  ko: string;
  en: string;
  icon: IconId;
  /** Fixed bonus granted while a weapon of this kind is equipped. */
  passive: StatBlock;
  /** Short flavour line. */
  desc: string;
  /** Which attack types the kind is built for (UI hint only). */
  style: 'phys' | 'magic' | 'hybrid';
}

export const WEAPON_KINDS: Record<WeaponKind, WeaponKindDef> = {
  sword: { id: 'sword', ko: '한손검', en: 'SWORD', icon: 'sword', passive: { critDmg: 10, dmg: 3 }, desc: '균형 잡힌 검술.', style: 'phys' },
  greatsword: { id: 'greatsword', ko: '대검', en: 'GREATSWORD', icon: 'greatsword', passive: { dmg: 7 }, desc: '묵직한 일격으로 모든 피해가 커진다.', style: 'phys' },
  katana: { id: 'katana', ko: '도(刀)', en: 'KATANA', icon: 'katana', passive: { crit: 2, critDmg: 18 }, desc: '한 번 벨 때 깊게 벤다. 치명타가 매우 아프다.', style: 'phys' },
  dagger: { id: 'dagger', ko: '단검', en: 'DAGGER', icon: 'dagger', passive: { crit: 6 }, desc: '급소를 노리는 빠른 칼놀림.', style: 'phys' },
  axe: { id: 'axe', ko: '도끼', en: 'AXE', icon: 'axe', passive: { pierce: 12 }, desc: '갑옷째로 쪼갠다. 방어력을 크게 무시한다.', style: 'phys' },
  spear: { id: 'spear', ko: '창', en: 'SPEAR', icon: 'spear', passive: { pierce: 6, crit: 3 }, desc: '틈을 정확히 찌르는 긴 사거리.', style: 'phys' },
  hammer: { id: 'hammer', ko: '둔기', en: 'HAMMER', icon: 'hammer', passive: { pierce: 8, dmg: 3 }, desc: '방어째로 짓누르는 충격.', style: 'phys' },
  bow: { id: 'bow', ko: '활', en: 'BOW', icon: 'bow', passive: { crit: 4, critDmg: 8 }, desc: '멀리서 약점을 꿰뚫는다.', style: 'phys' },
  fist: { id: 'fist', ko: '너클', en: 'KNUCKLE', icon: 'fist', passive: { crit: 4, lifesteal: 2 }, desc: '맨주먹의 연타. 때릴수록 기운이 돈다.', style: 'phys' },
  scythe: { id: 'scythe', ko: '낫', en: 'SCYTHE', icon: 'scythe', passive: { lifesteal: 5 }, desc: '베어낸 생명력을 거둬들인다.', style: 'hybrid' },
  staff: { id: 'staff', ko: '지팡이', en: 'STAFF', icon: 'staff', passive: { dmg: 6 }, desc: '마력을 증폭해 모든 피해가 커진다.', style: 'magic' },
  wand: { id: 'wand', ko: '완드', en: 'WAND', icon: 'wand', passive: { crit: 5 }, desc: '정밀한 마력 조준. 치명타가 잘 터진다.', style: 'magic' },
  tome: { id: 'tome', ko: '마도서', en: 'TOME', icon: 'book', passive: { mpSave: 15 }, desc: '주문을 외워 두어 스킬 MP를 아낀다.', style: 'magic' },
  orb: { id: 'orb', ko: '오브', en: 'ORB', icon: 'orb', passive: { pierce: 10 }, desc: '순수한 마력이 방어를 꿰뚫는다.', style: 'magic' },
  pen: { id: 'pen', ko: '펜', en: 'PEN', icon: 'pen', passive: { expBonus: 3, dmg: 2 }, desc: '펜은 검보다 강하다. 공부 EXP도 늘어난다.', style: 'hybrid' },
};

export const WEAPON_KIND_ORDER: WeaponKind[] = ['sword', 'greatsword', 'katana', 'dagger', 'axe', 'spear', 'hammer', 'bow', 'fist', 'scythe', 'staff', 'wand', 'tome', 'orb', 'pen'];

/** Content stage at which a shop weapon of this level becomes purchasable. */
export function stageForLevel(level: number): RankId | undefined {
  if (level >= 40) return 'S';
  if (level >= 30) return 'A';
  if (level >= 22) return 'B';
  if (level >= 15) return 'C';
  if (level >= 10) return 'D';
  if (level >= 5) return 'E';
  return undefined;
}

/** Default price for a weapon of the given rarity / level. */
export function autoPrice(rarity: Rarity, level: number): number {
  const raw: Record<Rarity, number> = {
    common: Math.max(20, 25 * level - 5),
    uncommon: 30 * level + 30,
    rare: 40 * level + 260,
    epic: 100 * level,
    legendary: 190 * level,
    mythic: 400 * level,
  };
  return Math.round(raw[rarity] / 10) * 10;
}

type WeaponInput = Omit<ItemDef, 'category' | 'slot' | 'icon' | 'kind' | 'price'> & { icon?: IconId; price?: number; level: number };

/** Builds a weapon item: fills category/slot/icon, price and shop unlock stage. */
const W = (kind: WeaponKind, d: WeaponInput): ItemDef => ({
  category: 'equipment',
  slot: 'weapon',
  kind,
  icon: WEAPON_KINDS[kind].icon,
  ...d,
  price: d.price ?? autoPrice(d.rarity, d.level),
  minRank: d.minRank ?? (d.shop ? stageForLevel(d.level) : undefined),
});

/** Standard drop/gacha flags. */
const LG = { loot: true, gacha: true } as const;
const SHOP = { shop: 'weapons', loot: true, gacha: true } as const;

export const WEAPONS: ItemDef[] = [
  // ── 한손검 SWORD ───────────────────────────────────────────
  W('sword', { id: 'w_wood', name: '견습생의 목검', nameEn: 'Wooden Sword', desc: '모든 모험가가 처음 쥐는 검. 가볍고 정직하다.', rarity: 'common', price: 20, stats: { atk: 4 }, tint: '#b08050', level: 1, ...SHOP }),
  W('sword', { id: 'w_bronze', name: '청동 숏소드', nameEn: 'Bronze Shortsword', desc: '청동기 시대부터 내려온 짧은 검. 손에 착 붙는다.', rarity: 'common', stats: { atk: 6 }, tint: '#cd7f32', level: 2, ...SHOP }),
  W('sword', { id: 'w_iron', name: '낡은 철검', nameEn: 'Iron Sword', desc: '녹이 조금 슬었지만 슬라임 정도는 가뿐히 벤다.', rarity: 'common', price: 70, stats: { atk: 8 }, level: 3, ...SHOP }),
  W('sword', { id: 'w_steel', name: '강철 브로드소드', nameEn: 'Steel Broadsword', desc: '대장간에서 단단하게 벼려낸 표준 전투용 검.', rarity: 'uncommon', price: 240, stats: { atk: 15 }, level: 7, ...SHOP }),
  W('sword', { id: 'w_rapier', name: '샤프심 레이피어', nameEn: 'Graphite Rapier', desc: '0.5mm 샤프심처럼 가늘고 날카롭다. 치명타에 특화.', rarity: 'uncommon', price: 260, stats: { atk: 12, crit: 5, dex: 2 }, tint: '#868e96', level: 8, ...SHOP }),
  W('sword', { id: 'w_flame', name: '화염의 세이버', nameEn: 'Flame Sabre', desc: '연소 반응의 열기를 품은 곡도. 베일 때마다 불꽃이 튄다.', rarity: 'rare', price: 780, stats: { atk: 27, str: 3 }, tint: '#ff6b35', level: 13, ...SHOP }),
  W('sword', { id: 'w_calculus', name: '미적분의 칼날', nameEn: 'Calculus Edge', desc: '순간 변화율을 읽어 급소를 찌른다.', rarity: 'rare', price: 840, stats: { atk: 24, crit: 8, dex: 3 }, tint: '#74c0fc', level: 16, ...SHOP }),
  W('sword', { id: 'w_frost', name: '서리의 검', nameEn: 'Frostbrand', desc: '영하 40도의 냉기가 서린 검. 칼날에 닿은 공기마저 얼어붙는다.', rarity: 'rare', stats: { atk: 33, def: 4, dex: 3 }, tint: '#a5d8ff', level: 18, ...LG }),
  W('sword', { id: 'w_paladin', name: '성기사의 장검', nameEn: 'Paladin Longsword', desc: '기도문이 새겨진 장검. 검술과 신성 마법 모두에 어울린다.', rarity: 'rare', stats: { atk: 28, matk: 16, holyDmg: 6, hp: 25 }, tint: '#fff3bf', level: 20, ...LG }),
  W('sword', { id: 'w_avogadro', name: '아보가드로의 성검', nameEn: "Avogadro's Holy Blade", desc: '6.02×10²³의 빛 입자로 이루어진 성검.', rarity: 'epic', price: 2800, stats: { atk: 44, matk: 24, int: 6, holyDmg: 6 }, tint: '#ffe066', level: 28, ...SHOP }),
  W('sword', { id: 'w_thunder', name: '뇌전검', nameEn: 'Thunder Brand', desc: '번개를 벼려 만든 검. 휘두를 때마다 하늘이 운다.', rarity: 'epic', stats: { atk: 64, crit: 6, dex: 5 }, tint: '#ffe066', level: 34, ...LG }),
  W('sword', { id: 'w_aurora', name: '새벽의 성검 오로라', nameEn: 'Aurora, Blade of Dawn', desc: '밤을 새운 자에게만 새벽빛을 허락하는 전설의 검.', rarity: 'legendary', price: 9000, stats: { atk: 88, crit: 10, str: 10 }, tint: '#ffd8a8', level: 45, ...SHOP }),
  W('sword', { id: 'w_starsword', name: '별을 가르는 검', nameEn: 'Starcleaver', desc: '밤하늘의 별자리를 둘로 갈랐다는 전설의 검.', rarity: 'legendary', stats: { atk: 116, crit: 8, str: 8 }, tint: '#91a7ff', level: 58, ...LG }),
  W('sword', { id: 'w_genesis', name: '창세의 검', nameEn: 'Genesis Blade', desc: '세계가 처음 쓰인 순간의 획으로 벼려낸 검. 모든 것을 다시 쓴다.', rarity: 'mythic', stats: { atk: 192, crit: 12, critDmg: 20, str: 15 }, tint: '#ff4d6d', level: 90, ...LG }),

  // ── 대검 GREATSWORD ───────────────────────────────────────
  W('greatsword', { id: 'w_zweihander', name: '훈련용 양손검', nameEn: 'Training Zweihänder', desc: '무거워서 휘두르기만 해도 운동이 된다.', rarity: 'common', stats: { atk: 10, def: 1 }, tint: '#ced4da', level: 4, ...SHOP }),
  W('greatsword', { id: 'w_claymore', name: '클레이모어', nameEn: 'Claymore', desc: '고지대 전사들이 쓰던 넓은 양손검.', rarity: 'uncommon', stats: { atk: 21, str: 2 }, level: 10, ...SHOP }),
  W('greatsword', { id: 'w_flamberge', name: '물결 대검 플랑베르주', nameEn: 'Flamberge', desc: '물결치는 칼날이 상처를 넓게 벌린다.', rarity: 'rare', stats: { atk: 38, str: 4, crit: 2 }, tint: '#ffa94d', level: 19, ...LG }),
  W('greatsword', { id: 'w_darkblade', name: '암흑기사의 대검', nameEn: 'Dark Knight Greatsword', desc: '지하묘지의 암흑기사가 쓰던 대검. 상점에서는 팔지 않는다.', rarity: 'epic', price: 2400, stats: { atk: 56, def: 6, crit: -2 }, tint: '#7048e8', level: 30, ...LG }),
  W('greatsword', { id: 'w_dday', name: 'D-DAY 대검', nameEn: 'D-Day Greatsword', desc: '칼등에 시험까지 남은 날짜가 새겨져 있다. 날이 다가올수록 무거워진다.', rarity: 'epic', stats: { atk: 66, str: 5, physDmg: 5 }, tint: '#ff8787', level: 33, ...LG }),
  W('greatsword', { id: 'w_titan', name: '거인의 대검', nameEn: "Titan's Greatsword", desc: '거인족의 전사가 쓰던, 사람 키보다 큰 검.', rarity: 'epic', stats: { atk: 76, hp: 80, str: 6 }, tint: '#adb5bd', level: 38, ...SHOP }),
  W('greatsword', { id: 'w_doomsday', name: '종말의 대검', nameEn: 'Doomsday Greatsword', desc: '마지막 날을 위해 벼려졌다는 검. 휘두르면 땅이 갈라진다.', rarity: 'legendary', stats: { atk: 128, str: 12, physDmg: 10 }, tint: '#e03131', level: 62, ...LG }),

  // ── 도 KATANA ─────────────────────────────────────────────
  W('katana', { id: 'w_bokken', name: '목도', nameEn: 'Bokken', desc: '수련용 나무 칼. 기본기를 다지는 데 최고다.', rarity: 'common', stats: { atk: 7, dex: 1 }, tint: '#c49a6c', level: 3, ...SHOP }),
  W('katana', { id: 'w_katana', name: '무명의 도', nameEn: 'Nameless Katana', desc: '이름 없는 장인이 벼린 도. 날이 놀랍도록 곧다.', rarity: 'uncommon', stats: { atk: 18, crit: 3 }, level: 9, ...SHOP }),
  W('katana', { id: 'w_moonlight', name: '월광도', nameEn: 'Moonlight Katana', desc: '달빛을 받으면 칼날이 푸르게 빛난다.', rarity: 'rare', stats: { atk: 32, crit: 5, dex: 2 }, tint: '#d0ebff', level: 17, ...SHOP }),
  W('katana', { id: 'w_raijin', name: '뇌신의 도', nameEn: 'Raijin Edge', desc: '번개보다 빠른 발도술을 위한 도.', rarity: 'epic', stats: { atk: 70, crit: 7, dex: 6 }, tint: '#ffd43b', level: 36, ...LG }),
  W('katana', { id: 'w_daybreak', name: '여명의 일도', nameEn: 'Daybreak Katana', desc: '밤새 공부한 자의 첫 햇살처럼 단 한 번에 벤다.', rarity: 'legendary', stats: { atk: 106, crit: 10, critDmg: 15 }, tint: '#ffc078', level: 54, ...LG }),

  // ── 단검 DAGGER ───────────────────────────────────────────
  W('dagger', { id: 'w_knife', name: '연필깎이 칼', nameEn: 'Pencil Knife', desc: '연필을 깎던 작은 칼. 의외로 날카롭다.', rarity: 'common', stats: { atk: 3, crit: 3, dex: 1 }, tint: '#ffd43b', level: 1, ...SHOP }),
  W('dagger', { id: 'w_dirk', name: '도적의 단검', nameEn: "Rogue's Dirk", desc: '뒷골목 도적들이 애용하는 단검.', rarity: 'common', stats: { atk: 9, crit: 4, luk: 1 }, tint: '#868e96', level: 5, ...SHOP }),
  W('dagger', { id: 'w_venomfang', name: '독사의 송곳니', nameEn: 'Viper Fang', desc: '독사의 송곳니를 깎아 만든 단검. 독술사에게 잘 맞는다.', rarity: 'uncommon', stats: { atk: 10, matk: 12, poisonDmg: 6, crit: 2 }, tint: '#94d82d', level: 9, ...SHOP }),
  W('dagger', { id: 'w_shadow', name: '그림자 단검', nameEn: 'Shadow Dagger', desc: '그림자 속에서 벼려져 소리 없이 벤다.', rarity: 'rare', stats: { atk: 26, crit: 8, dex: 3 }, tint: '#495057', level: 15, ...SHOP }),
  W('dagger', { id: 'w_assassin', name: '암살자의 쌍단검', nameEn: "Assassin's Twin Daggers", desc: '두 자루가 한 쌍. 하나가 막히면 다른 하나가 찌른다.', rarity: 'epic', stats: { atk: 52, crit: 12, dex: 6 }, tint: '#9775fa', level: 29, ...LG }),
  W('dagger', { id: 'w_nightfang', name: '자정의 송곳니', nameEn: 'Fang of Midnight', desc: '자정에만 독이 차오르는 송곳니 단검.', rarity: 'legendary', stats: { atk: 70, matk: 64, poisonDmg: 14, crit: 10 }, tint: '#66a80f', level: 50, ...LG }),
  W('dagger', { id: 'w_ouroboros', name: '우로보로스의 독아', nameEn: 'Ouroboros Fang', desc: '스스로의 꼬리를 문 뱀의 이빨. 독이 끝없이 순환한다.', rarity: 'mythic', stats: { atk: 90, matk: 176, poisonDmg: 20, crit: 12 }, tint: '#82c91e', level: 88, ...LG }),

  // ── 도끼 AXE ──────────────────────────────────────────────
  W('axe', { id: 'w_hatchet', name: '손도끼', nameEn: 'Hatchet', desc: '장작 패던 손도끼. 단단한 껍질도 쪼갠다.', rarity: 'common', stats: { atk: 6 }, tint: '#a0703c', level: 2, ...SHOP }),
  W('axe', { id: 'w_battleaxe', name: '전투 도끼', nameEn: 'Battle Axe', desc: '양날이 달린 전투용 도끼.', rarity: 'uncommon', stats: { atk: 17, str: 2 }, level: 8, ...SHOP }),
  W('axe', { id: 'w_lumber', name: '벌목꾼의 큰도끼', nameEn: "Lumberjack's Axe", desc: '숲의 거목을 한 번에 넘어뜨리던 큰도끼.', rarity: 'uncommon', stats: { atk: 23, hp: 15 }, tint: '#8d6e4a', level: 11, ...LG }),
  W('axe', { id: 'w_berserker', name: '광전사의 도끼', nameEn: 'Berserker Axe', desc: '피 냄새를 맡으면 손잡이가 뜨거워진다.', rarity: 'rare', stats: { atk: 44, str: 4, def: -3 }, tint: '#c92a2a', level: 21, ...SHOP }),
  W('axe', { id: 'w_glacier', name: '빙하 쪼개기', nameEn: 'Glacier Splitter', desc: '만년설을 쪼개던 거대한 얼음 도끼.', rarity: 'epic', stats: { atk: 70, str: 6, def: 4 }, tint: '#99e9f2', level: 35, ...LG }),
  W('axe', { id: 'w_worldsplitter', name: '세계를 쪼개는 도끼', nameEn: 'World Splitter', desc: '대륙을 둘로 나눴다는 신화 속 도끼.', rarity: 'legendary', stats: { atk: 132, str: 14, pierce: 8 }, tint: '#fab005', level: 66, ...LG }),

  // ── 창 SPEAR ──────────────────────────────────────────────
  W('spear', { id: 'w_pike', name: '나무 창', nameEn: 'Wooden Pike', desc: '끝을 뾰족하게 깎은 긴 나무 막대.', rarity: 'common', stats: { atk: 5, dex: 1 }, tint: '#c49a6c', level: 2, ...SHOP }),
  W('spear', { id: 'w_spear', name: '철창', nameEn: 'Iron Spear', desc: '보병의 기본 무장. 멀리서 찌른다.', rarity: 'common', stats: { atk: 10, dex: 1 }, level: 5, ...SHOP }),
  W('spear', { id: 'w_trident', name: '바다의 삼지창', nameEn: 'Sea Trident', desc: '파도를 다스리는 삼지창. 마력도 함께 깃들어 있다.', rarity: 'rare', stats: { atk: 30, matk: 10, mp: 15 }, tint: '#3bc9db', level: 16, ...SHOP }),
  W('spear', { id: 'w_vector', name: '벡터의 창', nameEn: 'Spear of Vectors', desc: '크기와 방향을 모두 가진 창. 언제나 정확히 급소를 향한다.', rarity: 'rare', stats: { atk: 42, dex: 4, crit: 3 }, tint: '#4dabf7', level: 22, ...LG }),
  W('spear', { id: 'w_dragoon', name: '용기사의 창', nameEn: 'Dragoon Lance', desc: '하늘에서 내리꽂는 용기사의 긴 창.', rarity: 'epic', stats: { atk: 60, dex: 5, crit: 4 }, tint: '#fd7e14', level: 31, ...LG }),
  W('spear', { id: 'w_heavenspear', name: '천공의 창', nameEn: 'Spear of the Heavens', desc: '구름을 꿰뚫고 내려온 빛의 창.', rarity: 'legendary', stats: { atk: 108, matk: 44, holyDmg: 10, dex: 8 }, tint: '#fff3bf', level: 56, ...LG }),

  // ── 둔기 HAMMER ───────────────────────────────────────────
  W('hammer', { id: 'w_club', name: '몽둥이', nameEn: 'Club', desc: '가장 원시적이고 확실한 무기.', rarity: 'common', stats: { atk: 4, hp: 5 }, icon: 'mace', tint: '#8d6e4a', level: 1, ...SHOP }),
  W('hammer', { id: 'w_mace', name: '철퇴', nameEn: 'Mace', desc: '징이 박힌 쇠뭉치. 투구째로 두드린다.', rarity: 'uncommon', stats: { atk: 15, def: 2 }, icon: 'mace', level: 7, ...SHOP }),
  W('hammer', { id: 'w_warhammer', name: '전쟁 망치', nameEn: 'War Hammer', desc: '성벽도 부순다는 전장의 망치.', rarity: 'rare', stats: { atk: 28, str: 3 }, level: 14, ...SHOP }),
  W('hammer', { id: 'w_pascal', name: '파스칼의 압력 망치', nameEn: "Pascal's Pressure Hammer", desc: '압력은 모든 방향으로 똑같이 전달된다. 맞은 쪽은 모든 방향이 아프다.', rarity: 'rare', stats: { atk: 44, str: 4, def: 3 }, tint: '#748ffc', level: 23, ...LG }),
  W('hammer', { id: 'w_newton', name: '뉴턴의 전투망치', nameEn: "Newton's Warhammer", desc: 'F = ma. 질량과 가속도가 곧 파괴력이다.', rarity: 'epic', price: 2600, stats: { atk: 50, str: 8 }, tint: '#adb5bd', level: 26, ...SHOP }),
  W('hammer', { id: 'w_gavel', name: '정의의 의사봉', nameEn: 'Gavel of Justice', desc: '"판결한다." 신성한 판결이 악을 내리친다.', rarity: 'epic', stats: { atk: 70, matk: 34, holyDmg: 8, def: 6 }, icon: 'mace', tint: '#e9c46a', level: 40, ...LG }),
  W('hammer', { id: 'w_thundermaul', name: '천둥의 대망치', nameEn: 'Thunder Maul', desc: '내리칠 때마다 천둥이 친다.', rarity: 'legendary', stats: { atk: 122, str: 12, crit: 6 }, tint: '#ffe066', level: 60, ...LG }),

  // ── 활 BOW ────────────────────────────────────────────────
  W('bow', { id: 'w_shortbow', name: '사냥꾼의 단궁', nameEn: "Hunter's Shortbow", desc: '토끼 사냥에 쓰던 작은 활.', rarity: 'common', stats: { atk: 7, dex: 2 }, tint: '#c49a6c', level: 3, ...SHOP }),
  W('bow', { id: 'w_longbow', name: '장궁', nameEn: 'Longbow', desc: '사람 키만 한 활. 멀리, 강하게 쏜다.', rarity: 'uncommon', stats: { atk: 17, dex: 3 }, tint: '#a0703c', level: 9, ...SHOP }),
  W('bow', { id: 'w_parabola', name: '포물선의 활', nameEn: 'Bow of Parabolas', desc: 'y = ax². 화살은 언제나 계산된 포물선을 그린다.', rarity: 'rare', stats: { atk: 28, crit: 5, dex: 3 }, tint: '#63e6be', level: 15, ...SHOP }),
  W('bow', { id: 'w_sylvan', name: '숲의 정령궁', nameEn: 'Sylvan Bow', desc: '숲의 정령이 시위를 당겨 준다.', rarity: 'rare', stats: { atk: 36, dex: 5, luk: 3 }, tint: '#69db7c', level: 20, ...LG }),
  W('bow', { id: 'w_phoenix', name: '불사조의 활', nameEn: 'Phoenix Bow', desc: '불사조의 깃으로 만든 활. 화살이 불꽃이 되어 날아간다.', rarity: 'epic', stats: { atk: 48, matk: 44, fireDmg: 10 }, tint: '#ff922b', level: 37, ...LG }),
  W('bow', { id: 'w_starfall', name: '별똥별 장궁', nameEn: 'Starfall Longbow', desc: '쏘아 올린 화살이 별똥별이 되어 떨어진다.', rarity: 'legendary', stats: { atk: 100, crit: 10, dex: 10 }, tint: '#91a7ff', level: 52, ...LG }),

  // ── 너클 KNUCKLE ──────────────────────────────────────────
  W('fist', { id: 'w_wraps', name: '붕대 손싸개', nameEn: 'Hand Wraps', desc: '주먹을 감싼 붕대. 마음가짐이 달라진다.', rarity: 'common', stats: { atk: 5, crit: 1 }, tint: '#f1f3f5', level: 2, ...SHOP }),
  W('fist', { id: 'w_knuckle', name: '강철 너클', nameEn: 'Steel Knuckles', desc: '손가락에 끼우는 강철 고리.', rarity: 'uncommon', stats: { atk: 16, crit: 2 }, level: 8, ...SHOP }),
  W('fist', { id: 'w_tigerclaw', name: '호랑이 발톱', nameEn: 'Tiger Claws', desc: '호랑이처럼 할퀴는 갈퀴 너클.', rarity: 'rare', stats: { atk: 31, crit: 5, dex: 3 }, tint: '#ffa94d', level: 17, ...SHOP }),
  W('fist', { id: 'w_monk', name: '수도승의 권갑', nameEn: "Monk's Fists", desc: '천 일의 수행을 버틴 권갑. 몸과 마음을 함께 단련한다.', rarity: 'epic', stats: { atk: 56, hp: 60, crit: 5 }, tint: '#ffd8a8', level: 30, ...LG }),
  W('fist', { id: 'w_dragonfist', name: '용왕의 권', nameEn: 'Fist of the Dragon King', desc: '용의 비늘로 감싼 주먹. 한 방에 산이 울린다.', rarity: 'legendary', stats: { atk: 110, crit: 10, str: 10 }, tint: '#fa5252', level: 57, ...LG }),

  // ── 낫 SCYTHE ─────────────────────────────────────────────
  W('scythe', { id: 'w_sickle', name: '농부의 낫', nameEn: "Farmer's Sickle", desc: '벼를 베던 낫. 잡초도 몬스터도 베어 낸다.', rarity: 'common', stats: { atk: 9, luk: 1 }, tint: '#ced4da', level: 4, ...SHOP }),
  W('scythe', { id: 'w_scythe', name: '사신의 낫', nameEn: "Reaper's Scythe", desc: '4층의 사신을 쓰러뜨린 증표. 죽음을 베어낸 낫.', rarity: 'rare', price: 900, stats: { atk: 20, crit: 12, luk: 4 }, tint: '#9775fa', level: 10, unique: true }),
  W('scythe', { id: 'w_harvest', name: '수확의 달', nameEn: 'Harvest Moon', desc: '보름달 아래에서 휘두르면 마력이 차오르는 낫.', rarity: 'rare', stats: { atk: 30, matk: 16, luk: 4 }, tint: '#ffe8cc', level: 19, ...LG }),
  W('scythe', { id: 'w_bloodscythe', name: '피의 대낫', nameEn: 'Blood Scythe', desc: '벨수록 붉게 물드는 거대한 낫.', rarity: 'epic', stats: { atk: 64, crit: 6, luk: 5 }, tint: '#c92a2a', level: 33, ...LG }),
  W('scythe', { id: 'w_soulreaper', name: '영혼 수확자', nameEn: 'Soul Reaper', desc: '영혼을 거두는 낫. 독기가 칼날을 타고 흐른다.', rarity: 'legendary', stats: { atk: 96, matk: 72, poisonDmg: 8, luk: 10 }, tint: '#7950f2', level: 64, ...LG }),
  W('scythe', { id: 'w_eclipse', name: '일식의 낫', nameEn: 'Eclipse Scythe', desc: '태양을 가린 달의 그림자로 만든 낫. 생명과 빛을 함께 거둔다.', rarity: 'mythic', stats: { atk: 200, matk: 120, lifesteal: 5, luk: 20 }, tint: '#ff4d6d', level: 100, ...LG }),

  // ── 지팡이 STAFF ──────────────────────────────────────────
  W('staff', { id: 'w_branch', name: '마른 나뭇가지', nameEn: 'Dry Branch', desc: '마력이 아주 조금 깃든 나뭇가지. 없는 것보단 낫다.', rarity: 'common', stats: { atk: 1, matk: 5, mp: 5 }, tint: '#a0703c', level: 1, ...SHOP }),
  W('staff', { id: 'w_staff', name: '수습 마법사의 지팡이', nameEn: 'Apprentice Staff', desc: '마력을 담기 좋은 참나무 지팡이. 마법 스킬이 강해진다.', rarity: 'common', price: 70, stats: { atk: 3, matk: 9, mp: 10 }, tint: '#b08050', level: 3, ...SHOP }),
  W('staff', { id: 'w_ember', name: '불씨의 지팡이', nameEn: 'Ember Staff', desc: '끝에서 작은 불씨가 꺼지지 않고 타오른다.', rarity: 'uncommon', stats: { atk: 3, matk: 13, fireDmg: 6 }, tint: '#ff922b', level: 7, ...SHOP }),
  W('staff', { id: 'w_sagestaff', name: '현자의 지팡이', nameEn: "Sage's Staff", desc: '오래된 현자가 짚던 지팡이. 지혜가 스며 있다.', rarity: 'uncommon', stats: { matk: 22, int: 3, mp: 15 }, tint: '#e599f7', level: 11, ...SHOP }),
  W('staff', { id: 'w_periodic', name: '주기율 지팡이', nameEn: 'Periodic Staff', desc: '118개의 원소가 새겨진 지팡이. 원소의 힘을 끌어낸다.', rarity: 'rare', price: 820, stats: { atk: 10, matk: 32, int: 5, mp: 20 }, tint: '#4dabf7', level: 14, ...SHOP }),
  W('staff', { id: 'w_inferno', name: '업화의 지팡이', nameEn: 'Inferno Staff', desc: '지옥불을 담아 둔 지팡이. 화염 마법이 거세진다.', rarity: 'rare', stats: { matk: 38, fireDmg: 8, int: 3 }, tint: '#f03e3e', level: 21, ...SHOP }),
  W('staff', { id: 'w_worldtree', name: '세계수의 지팡이', nameEn: 'Staff of the World Tree', desc: '세계수의 가지로 만든 지팡이. 생명과 빛의 마력이 흐른다.', rarity: 'epic', stats: { matk: 58, holyDmg: 10, hp: 60, mp: 30 }, tint: '#8ce99a', level: 32, ...SHOP }),
  W('staff', { id: 'w_archmage', name: '대마법사의 지팡이', nameEn: "Archmage's Staff", desc: '탑의 꼭대기에 살던 대마법사의 지팡이.', rarity: 'epic', stats: { matk: 74, int: 8, mp: 50, magicDmg: 8 }, tint: '#748ffc', level: 39, ...LG }),
  W('staff', { id: 'w_eureka', name: '유레카의 홀', nameEn: 'Scepter of Eureka', desc: '깨달음의 순간을 응축한 홀. 마법이 폭발적으로 강해진다.', rarity: 'legendary', price: 9500, stats: { atk: 30, matk: 96, int: 16, mp: 60 }, tint: '#ffc531', level: 48, ...LG }),
  W('staff', { id: 'w_bigbang', name: '빅뱅의 지팡이', nameEn: 'Staff of the Big Bang', desc: '우주가 태어난 순간의 폭발을 담은 지팡이.', rarity: 'mythic', stats: { atk: 30, matk: 168, int: 16, mp: 100, magicDmg: 15 }, tint: '#ff4d6d', level: 80, ...LG }),

  // ── 완드 WAND ─────────────────────────────────────────────
  W('wand', { id: 'w_practicewand', name: '연습용 완드', nameEn: 'Practice Wand', desc: '마법학교 1학년 필수품.', rarity: 'common', stats: { matk: 6, mp: 6 }, tint: '#d0bfff', level: 2, ...SHOP }),
  W('wand', { id: 'w_crystalwand', name: '수정 완드', nameEn: 'Crystal Wand', desc: '투명한 수정이 마력을 한 점으로 모은다.', rarity: 'uncommon', stats: { matk: 13, crit: 2, mp: 10 }, tint: '#99e9f2', level: 6, ...SHOP }),
  W('wand', { id: 'w_venomwand', name: '맹독 완드', nameEn: 'Venom Wand', desc: '독초 줄기로 만든 완드. 독 마법을 진하게 만든다.', rarity: 'uncommon', stats: { matk: 18, poisonDmg: 6 }, tint: '#94d82d', level: 10, ...SHOP }),
  W('wand', { id: 'w_lightwand', name: '빛의 완드', nameEn: 'Wand of Light', desc: '끝에서 따스한 빛이 새어 나온다.', rarity: 'rare', stats: { matk: 25, holyDmg: 6, mp: 15 }, tint: '#ffec99', level: 13, ...SHOP }),
  W('wand', { id: 'w_chaoswand', name: '혼돈의 완드', nameEn: 'Chaos Wand', desc: '무엇이 튀어나올지 아무도 모르는 완드.', rarity: 'rare', stats: { matk: 42, crit: 4, magicDmg: 6 }, tint: '#cc5de8', level: 22, ...LG }),
  W('wand', { id: 'w_plague', name: '역병의 완드', nameEn: 'Plague Wand', desc: '역병을 퍼뜨리던 마녀의 완드.', rarity: 'epic', stats: { matk: 64, poisonDmg: 10, int: 5 }, tint: '#5c940d', level: 34, ...LG }),
  W('wand', { id: 'w_seraphwand', name: '세라핌의 완드', nameEn: "Seraph's Wand", desc: '여섯 날개 천사의 깃털이 달린 완드.', rarity: 'legendary', stats: { matk: 108, holyDmg: 14, hp: 100 }, tint: '#fff9db', level: 55, ...LG }),
  W('wand', { id: 'w_halo', name: '천상의 후광', nameEn: 'Celestial Halo', desc: '하늘의 빛이 고리가 되어 완드 끝에 머문다.', rarity: 'mythic', stats: { matk: 188, holyDmg: 20, hp: 200, int: 12 }, tint: '#ffd43b', level: 92, ...LG }),

  // ── 마도서 TOME ───────────────────────────────────────────
  W('tome', { id: 'w_notebook', name: '깜지 노트', nameEn: 'Scribble Notebook', desc: '빽빽하게 채운 깜지. 손목은 아프지만 마력이 담겼다.', rarity: 'common', stats: { matk: 8, int: 1, mp: 5 }, tint: '#f8f9fa', level: 3, ...SHOP }),
  W('tome', { id: 'w_tome', name: '오답노트 마도서', nameEn: 'Tome of Mistakes', desc: '틀린 문제가 빼곡히 적힌 마도서. 실수에서 힘을 얻는다.', rarity: 'uncommon', price: 280, stats: { atk: 6, matk: 18, int: 3 }, tint: '#e8590c', level: 8, ...SHOP }),
  W('tome', { id: 'w_firebook', name: '화염 마법 입문서', nameEn: 'Primer of Flames', desc: '"불꽃은 산소와 연료와 열이 만날 때 태어난다." 1장부터 뜨겁다.', rarity: 'uncommon', stats: { matk: 18, fireDmg: 5, int: 1 }, tint: '#ff6b6b', level: 9, ...LG }),
  W('tome', { id: 'w_herbarium', name: '독초 도감', nameEn: 'Herbarium of Poisons', desc: '세상의 모든 독초가 그려진 도감.', rarity: 'rare', stats: { matk: 30, poisonDmg: 6, int: 3 }, tint: '#74b816', level: 16, ...SHOP }),
  W('tome', { id: 'w_grimoire', name: '금단의 그리모어', nameEn: 'Forbidden Grimoire', desc: '읽으면 안 된다고 적힌 마도서. 그래서 더 읽고 싶다.', rarity: 'rare', stats: { matk: 35, int: 4, magicDmg: 5 }, tint: '#862e9c', level: 18, ...LG }),
  W('tome', { id: 'w_scripture', name: '빛의 경전', nameEn: 'Scripture of Light', desc: '한 줄 읽을 때마다 마음이 맑아진다.', rarity: 'epic', stats: { matk: 52, holyDmg: 10, mp: 30 }, tint: '#fff3bf', level: 28, ...SHOP }),
  W('tome', { id: 'w_pastexam', name: '기출 문제집 마도서', nameEn: 'Tome of Past Exams', desc: '10년 치 기출이 담긴 마도서. 같은 함정에 두 번 빠지지 않는다.', rarity: 'epic', stats: { matk: 70, int: 8, expBonus: 5 }, tint: '#4c6ef5', level: 36, ...LG }),
  W('tome', { id: 'w_akashic', name: '아카식 레코드', nameEn: 'Akashic Records', desc: '세상의 모든 지식이 기록된 책. 한 페이지만으로도 머리가 어지럽다.', rarity: 'legendary', stats: { matk: 124, int: 14, mp: 80, magicDmg: 10 }, tint: '#e599f7', level: 63, ...LG }),

  // ── 오브 ORB ──────────────────────────────────────────────
  W('orb', { id: 'w_marble', name: '유리구슬', nameEn: 'Glass Marble', desc: '어릴 적 갖고 놀던 구슬. 마력이 희미하게 맴돈다.', rarity: 'common', stats: { matk: 9, luk: 1 }, tint: '#a5d8ff', level: 4, ...SHOP }),
  W('orb', { id: 'w_manaorb', name: '마력 구슬', nameEn: 'Mana Orb', desc: '마력을 담아 두는 푸른 구슬.', rarity: 'uncommon', stats: { matk: 16, mp: 15 }, tint: '#4dabf7', level: 8, ...SHOP }),
  W('orb', { id: 'w_atom', name: '보어의 원자 구슬', nameEn: "Bohr's Atomic Orb", desc: '전자가 궤도를 따라 도는 원자 모형. 에너지 준위가 바뀔 때 빛난다.', rarity: 'uncommon', stats: { matk: 22, int: 2, mp: 10 }, tint: '#66d9e8', level: 11, ...LG }),
  W('orb', { id: 'w_blazeorb', name: '작열의 오브', nameEn: 'Blazing Orb', desc: '손에 쥐면 뜨거운, 불꽃이 갇힌 구슬.', rarity: 'rare', stats: { matk: 26, fireDmg: 6 }, tint: '#ff922b', level: 14, ...SHOP }),
  W('orb', { id: 'w_moonorb', name: '달의 오브', nameEn: 'Moon Orb', desc: '달의 조각이라 불리는 은빛 구슬.', rarity: 'rare', stats: { matk: 38, mp: 25, int: 2 }, tint: '#e9ecef', level: 20, ...LG }),
  W('orb', { id: 'w_voidorb', name: '공허의 오브', nameEn: 'Void Orb', desc: '빛을 삼키는 검은 구슬. 마법이 무엇이든 꿰뚫는다.', rarity: 'epic', stats: { matk: 72, int: 6, crit: 4, magicDmg: 6 }, tint: '#5f3dc4', level: 38, ...LG }),
  W('orb', { id: 'w_suncore', name: '태양의 핵', nameEn: 'Core of the Sun', desc: '태양의 중심에서 떼어 온 불덩이.', rarity: 'legendary', stats: { matk: 118, fireDmg: 14, int: 10 }, tint: '#ff6b35', level: 61, ...LG }),
  W('orb', { id: 'w_primordial', name: '태초의 불꽃', nameEn: 'Primordial Flame', desc: '세상에 처음 피어난 불꽃. 꺼지지 않는다.', rarity: 'mythic', stats: { matk: 196, fireDmg: 20, int: 15 }, tint: '#ff4d6d', level: 95, ...LG }),

  // ── 펜 PEN ────────────────────────────────────────────────
  W('pen', { id: 'w_pencil', name: '몽당연필', nameEn: 'Stubby Pencil', desc: '끝까지 아껴 쓴 연필. 작지만 수많은 문제를 풀었다.', rarity: 'common', stats: { atk: 2, matk: 3, int: 1 }, tint: '#ffd43b', level: 1, ...SHOP }),
  W('pen', { id: 'w_fountain', name: '만년필', nameEn: 'Fountain Pen', desc: '잉크가 마르지 않는 고급 만년필.', rarity: 'uncommon', stats: { atk: 10, matk: 14, int: 2, dex: 2 }, tint: '#343a40', level: 10, ...SHOP }),
  W('pen', { id: 'w_quill', name: '백조의 깃펜', nameEn: 'Swan Quill', desc: '하얀 깃털 펜. 쓰는 글자마다 마력이 깃든다.', rarity: 'rare', stats: { atk: 18, matk: 26, int: 4, expBonus: 3 }, tint: '#f8f9fa', level: 19, ...SHOP }),
  W('pen', { id: 'w_redpen', name: '채점의 빨간펜', nameEn: "Grader's Red Pen", desc: '틀린 곳을 정확히 찌르는 빨간 펜.', rarity: 'epic', stats: { atk: 40, matk: 40, crit: 6 }, tint: '#fa5252', level: 31, ...LG }),
  W('pen', { id: 'w_goldpen', name: '합격의 황금펜', nameEn: 'Golden Pen of Acceptance', desc: '합격 통지서에 서명할 때 쓴다는 황금 펜.', rarity: 'legendary', stats: { atk: 60, matk: 60, expBonus: 8, goldBonus: 8, luk: 8 }, tint: '#ffc531', level: 50, ...LG }),
  W('pen', { id: 'w_infinitepen', name: '무한의 펜', nameEn: 'The Infinite Pen', desc: '세상의 모든 답을 써 내려갔다는 신화 속의 펜. 펜은 검보다 강하다.', rarity: 'mythic', price: 30000, stats: { atk: 135, matk: 90, str: 10, int: 10, dex: 10, luk: 10, crit: 10 }, tint: '#ff4d6d', level: 70, gacha: true }),
];

/** Kind passive of a weapon item (empty for non-weapons). */
export function weaponPassive(def: ItemDef): StatBlock {
  return def.kind ? WEAPON_KINDS[def.kind].passive : {};
}
