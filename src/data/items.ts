import type { ItemDef, Rarity } from '../game/types';

export const RARITY_INFO: Record<Rarity, { ko: string; en: string; color: string; glow: string; value: number }> = {
  common: { ko: '일반', en: 'COMMON', color: '#c3c8d4', glow: 'rgba(195,200,212,.35)', value: 30 },
  uncommon: { ko: '고급', en: 'UNCOMMON', color: '#51cf66', glow: 'rgba(81,207,102,.45)', value: 120 },
  rare: { ko: '희귀', en: 'RARE', color: '#4dabf7', glow: 'rgba(77,171,247,.5)', value: 400 },
  epic: { ko: '영웅', en: 'EPIC', color: '#b57bff', glow: 'rgba(181,123,255,.55)', value: 1200 },
  legendary: { ko: '전설', en: 'LEGENDARY', color: '#ffc531', glow: 'rgba(255,197,49,.6)', value: 4000 },
  mythic: { ko: '신화', en: 'MYTHIC', color: '#ff4d6d', glow: 'rgba(255,77,109,.65)', value: 12000 },
};

const I = (d: ItemDef) => d;

export const ITEMS: ItemDef[] = [
  // ───────────── WEAPONS ─────────────
  I({ id: 'w_wood', name: '견습생의 목검', nameEn: 'Wooden Sword', desc: '모든 모험가가 처음 쥐는 검. 가볍고 정직하다.', category: 'equipment', slot: 'weapon', rarity: 'common', price: 20, stats: { atk: 4 }, icon: 'sword', tint: '#b08050', shop: 'weapons', level: 1, loot: true, gacha: true }),
  I({ id: 'w_iron', name: '낡은 철검', nameEn: 'Iron Sword', desc: '녹이 조금 슬었지만 슬라임 정도는 가뿐히 벤다.', category: 'equipment', slot: 'weapon', rarity: 'common', price: 70, stats: { atk: 8 }, icon: 'sword', shop: 'weapons', level: 3, loot: true, gacha: true }),
  I({ id: 'w_staff', name: '수습 마법사의 지팡이', nameEn: 'Apprentice Staff', desc: '마력을 담기 좋은 참나무 지팡이. 마법 스킬이 강해진다.', category: 'equipment', slot: 'weapon', rarity: 'common', price: 70, stats: { atk: 3, matk: 9, mp: 10 }, icon: 'staff', tint: '#b08050', shop: 'weapons', level: 3, loot: true, gacha: true }),
  I({ id: 'w_steel', name: '강철 브로드소드', nameEn: 'Steel Broadsword', desc: '대장간에서 단단하게 벼려낸 표준 전투용 검.', category: 'equipment', slot: 'weapon', rarity: 'uncommon', price: 240, stats: { atk: 15 }, icon: 'sword', shop: 'weapons', minRank: 'E', level: 7, loot: true, gacha: true }),
  I({ id: 'w_rapier', name: '샤프심 레이피어', nameEn: 'Graphite Rapier', desc: '0.5mm 샤프심처럼 가늘고 날카롭다. 치명타에 특화.', category: 'equipment', slot: 'weapon', rarity: 'uncommon', price: 260, stats: { atk: 12, crit: 5, dex: 2 }, icon: 'sword', tint: '#868e96', shop: 'weapons', minRank: 'E', level: 8, loot: true, gacha: true }),
  I({ id: 'w_tome', name: '오답노트 마도서', nameEn: 'Tome of Mistakes', desc: '틀린 문제가 빼곡히 적힌 마도서. 실수에서 힘을 얻는다.', category: 'equipment', slot: 'weapon', rarity: 'uncommon', price: 280, stats: { atk: 6, matk: 18, int: 3 }, icon: 'book', tint: '#e8590c', shop: 'weapons', minRank: 'E', level: 8, loot: true, gacha: true }),
  I({ id: 'w_flame', name: '화염의 세이버', nameEn: 'Flame Sabre', desc: '연소 반응의 열기를 품은 곡도. 베일 때마다 불꽃이 튄다.', category: 'equipment', slot: 'weapon', rarity: 'rare', price: 780, stats: { atk: 27, str: 3 }, icon: 'sword', tint: '#ff6b35', shop: 'weapons', minRank: 'D', level: 13, loot: true, gacha: true }),
  I({ id: 'w_periodic', name: '주기율 지팡이', nameEn: 'Periodic Staff', desc: '118개의 원소가 새겨진 지팡이. 원소의 힘을 끌어낸다.', category: 'equipment', slot: 'weapon', rarity: 'rare', price: 820, stats: { atk: 10, matk: 32, int: 5, mp: 20 }, icon: 'staff', tint: '#4dabf7', shop: 'weapons', minRank: 'D', level: 14, loot: true, gacha: true }),
  I({ id: 'w_calculus', name: '미적분의 칼날', nameEn: 'Calculus Edge', desc: '순간 변화율을 읽어 급소를 찌른다.', category: 'equipment', slot: 'weapon', rarity: 'rare', price: 840, stats: { atk: 24, crit: 8, dex: 3 }, icon: 'sword', tint: '#74c0fc', shop: 'weapons', minRank: 'C', level: 16, loot: true, gacha: true }),
  I({ id: 'w_newton', name: '뉴턴의 전투망치', nameEn: "Newton's Warhammer", desc: 'F = ma. 질량과 가속도가 곧 파괴력이다.', category: 'equipment', slot: 'weapon', rarity: 'epic', price: 2600, stats: { atk: 50, str: 8 }, icon: 'hammer', tint: '#adb5bd', shop: 'weapons', minRank: 'B', level: 26, loot: true, gacha: true }),
  I({ id: 'w_avogadro', name: '아보가드로의 성검', nameEn: "Avogadro's Holy Blade", desc: '6.02×10²³의 빛 입자로 이루어진 성검.', category: 'equipment', slot: 'weapon', rarity: 'epic', price: 2800, stats: { atk: 44, matk: 24, int: 6 }, icon: 'sword', tint: '#ffe066', shop: 'weapons', minRank: 'B', level: 28, loot: true, gacha: true }),
  I({ id: 'w_darkblade', name: '암흑기사의 대검', nameEn: 'Dark Knight Greatsword', desc: '지하묘지의 암흑기사가 쓰던 대검. 상점에서는 팔지 않는다.', category: 'equipment', slot: 'weapon', rarity: 'epic', price: 2400, stats: { atk: 56, def: 6, crit: -2 }, icon: 'sword', tint: '#7048e8', level: 30, loot: true, gacha: true }),
  I({ id: 'w_aurora', name: '새벽의 성검 오로라', nameEn: 'Aurora, Blade of Dawn', desc: '밤을 새운 자에게만 새벽빛을 허락하는 전설의 검.', category: 'equipment', slot: 'weapon', rarity: 'legendary', price: 9000, stats: { atk: 88, crit: 10, str: 10 }, icon: 'sword', tint: '#ffd8a8', shop: 'weapons', minRank: 'S', level: 45, loot: true, gacha: true }),
  I({ id: 'w_eureka', name: '유레카의 홀', nameEn: 'Scepter of Eureka', desc: '깨달음의 순간을 응축한 홀. 마법이 폭발적으로 강해진다.', category: 'equipment', slot: 'weapon', rarity: 'legendary', price: 9500, stats: { atk: 30, matk: 96, int: 16, mp: 60 }, icon: 'staff', tint: '#ffc531', level: 48, loot: true, gacha: true }),
  I({ id: 'w_infinitepen', name: '무한의 펜', nameEn: 'The Infinite Pen', desc: '세상의 모든 답을 써 내려갔다는 신화 속의 펜. 펜은 검보다 강하다.', category: 'equipment', slot: 'weapon', rarity: 'mythic', price: 30000, stats: { atk: 135, matk: 90, str: 10, int: 10, dex: 10, luk: 10, crit: 10 }, icon: 'pen', tint: '#ff4d6d', level: 70, gacha: true }),
  I({ id: 'w_scythe', name: '사신의 낫', nameEn: "Reaper's Scythe", desc: '4층의 사신을 쓰러뜨린 증표. 죽음을 베어낸 낫.', category: 'equipment', slot: 'weapon', rarity: 'rare', price: 900, stats: { atk: 20, crit: 12, luk: 4 }, icon: 'scythe', tint: '#9775fa', level: 10, unique: true }),

  // ───────────── HELMETS ─────────────
  I({ id: 'h_leather', name: '가죽 모자', nameEn: 'Leather Cap', desc: '머리를 보호하는 최소한의 장비.', category: 'equipment', slot: 'helmet', rarity: 'common', price: 25, stats: { def: 2, hp: 5 }, icon: 'helmet', tint: '#a0703c', shop: 'armor', level: 1, loot: true, gacha: true }),
  I({ id: 'h_iron', name: '철 투구', nameEn: 'Iron Helm', desc: '묵직하지만 든든하다.', category: 'equipment', slot: 'helmet', rarity: 'common', price: 80, stats: { def: 4, hp: 15 }, icon: 'helmet', shop: 'armor', level: 4, loot: true, gacha: true }),
  I({ id: 'h_scholar', name: '학자의 두건', nameEn: "Scholar's Hood", desc: '집중력을 높여주는 짙은 남색 두건.', category: 'equipment', slot: 'helmet', rarity: 'uncommon', price: 230, stats: { def: 6, int: 3, mp: 10 }, icon: 'helmet', tint: '#364fc7', shop: 'armor', minRank: 'E', level: 8, loot: true, gacha: true }),
  I({ id: 'h_knight', name: '기사의 투구', nameEn: 'Knight Helm', desc: '깃털 장식이 달린 기사단의 투구.', category: 'equipment', slot: 'helmet', rarity: 'rare', price: 700, stats: { def: 12, hp: 40, str: 2 }, icon: 'helmet', tint: '#dee2e6', shop: 'armor', minRank: 'D', level: 14, loot: true, gacha: true }),
  I({ id: 'h_sage', name: '현자의 서클릿', nameEn: "Sage's Circlet", desc: '지혜의 보석이 박힌 머리띠.', category: 'equipment', slot: 'helmet', rarity: 'epic', price: 2300, stats: { def: 18, int: 10, mp: 40 }, icon: 'crown', tint: '#e599f7', shop: 'armor', minRank: 'B', level: 26, loot: true, gacha: true }),
  I({ id: 'h_dragon', name: '용비늘 투구', nameEn: 'Dragonscale Helm', desc: '심연의 용 비늘로 만든 투구. 화염을 막아낸다.', category: 'equipment', slot: 'helmet', rarity: 'legendary', price: 8000, stats: { def: 32, hp: 160, str: 6 }, icon: 'helmet', tint: '#ff922b', level: 45, loot: true, gacha: true }),

  // ───────────── ARMOR ─────────────
  I({ id: 'a_tunic', name: '천 튜닉', nameEn: 'Cloth Tunic', desc: '편하게 공부할 때 입는 옷. 전투용은 아니다.', category: 'equipment', slot: 'armor', rarity: 'common', price: 30, stats: { def: 3, hp: 5 }, icon: 'armor', tint: '#8ce99a', shop: 'armor', level: 1, loot: true, gacha: true }),
  I({ id: 'a_leather', name: '가죽 갑옷', nameEn: 'Leather Armor', desc: '움직임을 방해하지 않는 가벼운 갑옷.', category: 'equipment', slot: 'armor', rarity: 'common', price: 90, stats: { def: 6, hp: 15 }, icon: 'armor', tint: '#a0703c', shop: 'armor', level: 4, loot: true, gacha: true }),
  I({ id: 'a_chain', name: '사슬 갑옷', nameEn: 'Chainmail', desc: '촘촘히 엮은 쇠사슬 갑옷.', category: 'equipment', slot: 'armor', rarity: 'uncommon', price: 270, stats: { def: 12, hp: 25 }, icon: 'armor', shop: 'armor', minRank: 'E', level: 8, loot: true, gacha: true }),
  I({ id: 'a_robe', name: '마도사의 로브', nameEn: "Mage's Robe", desc: '마력이 흐르는 실로 짠 로브.', category: 'equipment', slot: 'armor', rarity: 'uncommon', price: 260, stats: { def: 7, mp: 30, int: 3, matk: 4 }, icon: 'robe', tint: '#7950f2', shop: 'armor', minRank: 'E', level: 8, loot: true, gacha: true }),
  I({ id: 'a_mithril', name: '미스릴 흉갑', nameEn: 'Mithril Cuirass', desc: '은빛으로 빛나는 가볍고 단단한 흉갑.', category: 'equipment', slot: 'armor', rarity: 'rare', price: 860, stats: { def: 22, hp: 60 }, icon: 'armor', tint: '#a5d8ff', shop: 'armor', minRank: 'D', level: 15, loot: true, gacha: true }),
  I({ id: 'a_starrobe', name: '별빛 로브', nameEn: 'Starlight Robe', desc: '새벽 3시의 별빛을 수놓은 로브.', category: 'equipment', slot: 'armor', rarity: 'epic', price: 2700, stats: { def: 26, mp: 70, int: 12, matk: 12 }, icon: 'robe', tint: '#5c7cfa', shop: 'armor', minRank: 'B', level: 27, loot: true, gacha: true }),
  I({ id: 'a_darkplate', name: '암흑 판금갑옷', nameEn: 'Dark Plate', desc: '암흑기사단의 판금갑옷. 무겁지만 단단하다.', category: 'equipment', slot: 'armor', rarity: 'epic', price: 2500, stats: { def: 42, hp: 130 }, icon: 'armor', tint: '#5f3dc4', level: 30, loot: true, gacha: true }),
  I({ id: 'a_dragon', name: '용기사의 갑옷', nameEn: 'Dragoon Armor', desc: '용을 타던 기사의 전설적인 갑옷.', category: 'equipment', slot: 'armor', rarity: 'legendary', price: 9500, stats: { def: 58, hp: 260, str: 8 }, icon: 'armor', tint: '#fd7e14', shop: 'armor', minRank: 'S', level: 46, loot: true, gacha: true }),

  // ───────────── GLOVES ─────────────
  I({ id: 'g_cotton', name: '면장갑', nameEn: 'Cotton Gloves', desc: '필기할 때 손이 미끄러지지 않는다.', category: 'equipment', slot: 'gloves', rarity: 'common', price: 20, stats: { def: 1, dex: 1 }, icon: 'gloves', tint: '#f1f3f5', shop: 'armor', level: 1, loot: true, gacha: true }),
  I({ id: 'g_leather', name: '가죽 건틀릿', nameEn: 'Leather Gauntlets', desc: '주먹에 힘이 들어간다.', category: 'equipment', slot: 'gloves', rarity: 'common', price: 65, stats: { def: 3, atk: 2 }, icon: 'gloves', tint: '#a0703c', shop: 'armor', level: 4, loot: true, gacha: true }),
  I({ id: 'g_focus', name: '집중의 장갑', nameEn: 'Gloves of Focus', desc: '손끝까지 집중력이 흐른다.', category: 'equipment', slot: 'gloves', rarity: 'uncommon', price: 240, stats: { dex: 4, crit: 3, def: 2 }, icon: 'gloves', tint: '#38d9a9', shop: 'armor', minRank: 'E', level: 9, loot: true, gacha: true }),
  I({ id: 'g_steel', name: '강철 건틀릿', nameEn: 'Steel Gauntlets', desc: '강철로 감싼 주먹은 그 자체로 무기다.', category: 'equipment', slot: 'gloves', rarity: 'rare', price: 680, stats: { def: 8, atk: 8 }, icon: 'gloves', shop: 'armor', minRank: 'D', level: 15, loot: true, gacha: true }),
  I({ id: 'g_thunder', name: '번개의 장갑', nameEn: 'Thunder Gloves', desc: '번개처럼 빠른 손놀림을 선사한다.', category: 'equipment', slot: 'gloves', rarity: 'epic', price: 2200, stats: { atk: 14, crit: 8, dex: 6 }, icon: 'gloves', tint: '#ffe066', shop: 'armor', minRank: 'A', level: 30, loot: true, gacha: true }),

  // ───────────── BOOTS ─────────────
  I({ id: 'b_sandal', name: '짚신', nameEn: 'Straw Sandals', desc: '발이 편하면 오래 앉아 있을 수 있다.', category: 'equipment', slot: 'boots', rarity: 'common', price: 15, stats: { def: 1, hp: 5 }, icon: 'boots', tint: '#e9c46a', shop: 'armor', level: 1, loot: true, gacha: true }),
  I({ id: 'b_leather', name: '가죽 부츠', nameEn: 'Leather Boots', desc: '탑의 계단을 오르기에 알맞은 신발.', category: 'equipment', slot: 'boots', rarity: 'common', price: 65, stats: { def: 3, dex: 1 }, icon: 'boots', tint: '#a0703c', shop: 'armor', level: 4, loot: true, gacha: true }),
  I({ id: 'b_gale', name: '질풍의 신발', nameEn: 'Gale Shoes', desc: '바람처럼 가볍게 움직인다.', category: 'equipment', slot: 'boots', rarity: 'uncommon', price: 250, stats: { dex: 5, def: 4 }, icon: 'boots', tint: '#66d9e8', shop: 'armor', minRank: 'E', level: 9, loot: true, gacha: true }),
  I({ id: 'b_knight', name: '기사의 그리브', nameEn: 'Knight Greaves', desc: '단단한 강철 정강이 보호대.', category: 'equipment', slot: 'boots', rarity: 'rare', price: 690, stats: { def: 10, hp: 35 }, icon: 'boots', tint: '#dee2e6', shop: 'armor', minRank: 'D', level: 15, loot: true, gacha: true }),
  I({ id: 'b_spirit', name: '바람 정령의 부츠', nameEn: 'Windspirit Boots', desc: '바람의 정령이 깃든 부츠.', category: 'equipment', slot: 'boots', rarity: 'epic', price: 2300, stats: { dex: 12, def: 14, crit: 5 }, icon: 'boots', tint: '#3bc9db', shop: 'armor', minRank: 'A', level: 30, loot: true, gacha: true }),

  // ───────────── ACCESSORIES ─────────────
  I({ id: 'r_copper', name: '구리 반지', nameEn: 'Copper Ring', desc: '전도성이 좋은 구리 반지. 힘이 약간 오른다.', category: 'equipment', slot: 'accessory', rarity: 'common', price: 40, stats: { str: 1, atk: 1 }, icon: 'ring', tint: '#d9480f', shop: 'accessories', level: 2, loot: true, gacha: true }),
  I({ id: 'r_silver', name: '은 반지', nameEn: 'Silver Ring', desc: '맑은 은빛이 마음을 차분하게 한다.', category: 'equipment', slot: 'accessory', rarity: 'common', price: 60, stats: { int: 1, mp: 8 }, icon: 'ring', tint: '#dee2e6', shop: 'accessories', level: 3, loot: true, gacha: true }),
  I({ id: 'c_focus', name: '집중의 부적', nameEn: 'Charm of Focus', desc: '공부로 얻는 EXP가 5% 증가한다.', category: 'equipment', slot: 'accessory', rarity: 'uncommon', price: 320, stats: { expBonus: 5 }, icon: 'charm', tint: '#ff8787', shop: 'accessories', minRank: 'E', level: 6, loot: true, gacha: true }),
  I({ id: 'c_purse', name: '금화 주머니', nameEn: 'Coin Purse', desc: '모든 골드 획득량이 8% 증가한다.', category: 'equipment', slot: 'accessory', rarity: 'uncommon', price: 320, stats: { goldBonus: 8 }, icon: 'coin', tint: '#ffd43b', shop: 'accessories', minRank: 'E', level: 6, loot: true, gacha: true }),
  I({ id: 'n_wisdom', name: '지혜의 펜던트', nameEn: 'Pendant of Wisdom', desc: '지능과 MP, 공부 EXP를 함께 올려준다.', category: 'equipment', slot: 'accessory', rarity: 'rare', price: 950, stats: { int: 6, mp: 20, expBonus: 5 }, icon: 'amulet', tint: '#4dabf7', shop: 'accessories', minRank: 'D', level: 14, loot: true, gacha: true }),
  I({ id: 'c_rabbit', name: '행운의 토끼발', nameEn: "Lucky Rabbit's Foot", desc: '행운과 치명타율이 오른다.', category: 'equipment', slot: 'accessory', rarity: 'rare', price: 900, stats: { luk: 8, crit: 3 }, icon: 'charm', tint: '#fff3bf', shop: 'accessories', minRank: 'D', level: 14, loot: true, gacha: true }),
  I({ id: 'r_power', name: '투사의 반지', nameEn: "Gladiator's Ring", desc: '투기장 챔피언의 반지.', category: 'equipment', slot: 'accessory', rarity: 'rare', price: 980, stats: { str: 5, atk: 8 }, icon: 'ring', tint: '#fa5252', shop: 'accessories', minRank: 'C', level: 18, loot: true, gacha: true }),
  I({ id: 'h_hourglass', name: '시간의 모래시계', nameEn: 'Hourglass of Time', desc: '같은 시간도 더 길게 쓴다. 공부 EXP +12%.', category: 'equipment', slot: 'accessory', rarity: 'epic', price: 3200, stats: { expBonus: 12, int: 4 }, icon: 'hourglass', tint: '#ffd8a8', shop: 'accessories', minRank: 'B', level: 25, loot: true, gacha: true }),
  I({ id: 'r_dragon', name: '용의 심장 반지', nameEn: 'Dragonheart Ring', desc: '용의 심장처럼 뜨겁게 뛰는 반지.', category: 'equipment', slot: 'accessory', rarity: 'legendary', price: 8500, stats: { str: 10, hp: 120, atk: 15 }, icon: 'ring', tint: '#ff6b6b', level: 45, loot: true, gacha: true }),
  I({ id: 'n_scholar', name: '대학자의 인장', nameEn: "Grand Scholar's Seal", desc: '모든 공부 보상이 크게 증가한다.', category: 'equipment', slot: 'accessory', rarity: 'legendary', price: 10000, stats: { expBonus: 18, goldBonus: 15, int: 8 }, icon: 'seal', tint: '#ffc531', level: 45, gacha: true }),
  I({ id: 'n_cosmos', name: '우주의 방정식', nameEn: 'Equation of the Cosmos', desc: '우주를 설명하는 단 하나의 식. 모든 능력이 상승한다.', category: 'equipment', slot: 'accessory', rarity: 'mythic', price: 30000, stats: { str: 15, int: 15, dex: 15, luk: 15, expBonus: 20, goldBonus: 20 }, icon: 'amulet', tint: '#ff4d6d', level: 70, gacha: true }),
  // unique tower rewards
  I({ id: 'n_deathcharm', name: '망자의 부적', nameEn: 'Charm of the Departed', desc: '4층의 사신이 남긴 부적. 죽음의 기운을 막아준다.', category: 'equipment', slot: 'accessory', rarity: 'rare', price: 800, stats: { hp: 60, def: 6, luk: 4 }, icon: 'charm', tint: '#9775fa', level: 8, unique: true }),
  I({ id: 'n_lucky7', name: '럭키 세븐 펜던트', nameEn: 'Lucky Seven Pendant', desc: '7층 행운의 전당의 보물. LUK +7, 치명타 +7%, EXP +7%, 골드 +7%.', category: 'equipment', slot: 'accessory', rarity: 'legendary', price: 7777, stats: { luk: 7, crit: 7, expBonus: 7, goldBonus: 7 }, icon: 'amulet', tint: '#ffd43b', level: 10, unique: true }),
  I({ id: 'n_seal13', name: '열세 번째 인장', nameEn: 'The Thirteenth Seal', desc: '금기의 13층을 깨뜨린 자의 증표. 모든 능력치 +5, 공격·마공 +13, EXP +13%.', category: 'equipment', slot: 'accessory', rarity: 'legendary', price: 13000, stats: { str: 5, int: 5, dex: 5, luk: 5, atk: 13, matk: 13, expBonus: 13 }, icon: 'seal', tint: '#ff4d6d', level: 14, unique: true }),

  // ───────────── CONSUMABLES ─────────────
  I({ id: 'p_small', name: '작은 회복 물약', nameEn: 'Small Potion', desc: 'HP를 60 회복한다.', category: 'consumable', rarity: 'common', price: 15, icon: 'potion', tint: '#ff6b6b', shop: 'consumables', use: { type: 'heal', hp: 60 }, battle: true, loot: true, gacha: true }),
  I({ id: 'p_mid', name: '회복 물약', nameEn: 'Potion', desc: 'HP를 200 회복한다.', category: 'consumable', rarity: 'uncommon', price: 45, icon: 'potion', tint: '#fa5252', shop: 'consumables', minRank: 'E', use: { type: 'heal', hp: 200 }, battle: true, loot: true, gacha: true }),
  I({ id: 'p_large', name: '고급 회복 물약', nameEn: 'Hi-Potion', desc: 'HP를 500 회복한다.', category: 'consumable', rarity: 'rare', price: 120, icon: 'potion', tint: '#e03131', shop: 'consumables', minRank: 'C', use: { type: 'heal', hp: 500 }, battle: true, loot: true, gacha: true }),
  I({ id: 'p_mana', name: '마나 물약', nameEn: 'Ether', desc: 'MP를 40 회복한다.', category: 'consumable', rarity: 'common', price: 25, icon: 'ether', tint: '#4dabf7', shop: 'consumables', use: { type: 'heal', mp: 40 }, battle: true, loot: true, gacha: true }),
  I({ id: 'p_mana2', name: '고급 마나 물약', nameEn: 'Hi-Ether', desc: 'MP를 120 회복한다.', category: 'consumable', rarity: 'uncommon', price: 70, icon: 'ether', tint: '#228be6', shop: 'consumables', minRank: 'D', use: { type: 'heal', mp: 120 }, battle: true, loot: true, gacha: true }),
  I({ id: 'p_elixir', name: '엘릭서', nameEn: 'Elixir', desc: 'HP와 MP를 모두 회복한다.', category: 'consumable', rarity: 'epic', price: 420, icon: 'elixir', tint: '#ffd43b', shop: 'consumables', minRank: 'C', use: { type: 'heal', full: true }, battle: true, loot: true, gacha: true }),
  I({ id: 'x_power', name: '힘의 비약', nameEn: 'Power Tonic', desc: '전투 중 3턴 동안 공격력 +30%.', category: 'consumable', rarity: 'uncommon', price: 60, icon: 'flask', tint: '#ff922b', shop: 'consumables', use: { type: 'battleBuff', atkPct: 30, turns: 3 }, battle: true, loot: true, gacha: true }),
  I({ id: 'x_iron', name: '철벽의 비약', nameEn: 'Iron Tonic', desc: '전투 중 3턴 동안 방어력 +40%.', category: 'consumable', rarity: 'uncommon', price: 60, icon: 'flask', tint: '#adb5bd', shop: 'consumables', use: { type: 'battleBuff', defPct: 40, turns: 3 }, battle: true, loot: true, gacha: true }),
  I({ id: 'x_smoke', name: '연막탄', nameEn: 'Smoke Bomb', desc: '보스가 아닌 전투에서 반드시 도망칠 수 있다.', category: 'consumable', rarity: 'common', price: 40, icon: 'bomb', tint: '#868e96', shop: 'consumables', use: { type: 'escape' }, battle: true, loot: true, gacha: true }),
  I({ id: 's_focus', name: '집중의 두루마리', nameEn: 'Scroll of Focus', desc: '다음 공부 기록의 EXP +30%.', category: 'consumable', rarity: 'uncommon', price: 110, icon: 'scroll', tint: '#ffa8a8', shop: 'consumables', use: { type: 'studyBuff', expPct: 30 }, loot: true, gacha: true }),
  I({ id: 's_gold', name: '황금의 두루마리', nameEn: 'Scroll of Gold', desc: '다음 공부 기록의 골드 +50%.', category: 'consumable', rarity: 'uncommon', price: 90, icon: 'scroll', tint: '#ffd43b', shop: 'consumables', use: { type: 'studyBuff', goldPct: 50 }, loot: true, gacha: true }),
  I({ id: 'd_stamina', name: '기력 드링크', nameEn: 'Stamina Drink', desc: '기력을 5 회복한다. (상점 판매 안 함)', category: 'consumable', rarity: 'rare', price: 150, icon: 'drink', tint: '#94d82d', use: { type: 'stamina', amount: 5 }, loot: true, gacha: true }),
  I({ id: 'd_tome', name: '경험의 서', nameEn: 'Tome of Experience', desc: '읽으면 즉시 EXP 150을 얻는다.', category: 'consumable', rarity: 'epic', price: 600, icon: 'book', tint: '#b57bff', use: { type: 'exp', amount: 150 }, loot: true, gacha: true }),

  // ───────────── SPECIAL (chests & reward coupons) ─────────────
  I({ id: 'chest_bronze', name: '청동 보물상자', nameEn: 'Bronze Chest', desc: '열면 골드와 아이템이 무작위로 나온다.', category: 'special', rarity: 'uncommon', price: 120, icon: 'chest', tint: '#cd7f32', shop: 'special', use: { type: 'chest', tier: 'bronze' }, loot: true, gacha: true }),
  I({ id: 'chest_silver', name: '은 보물상자', nameEn: 'Silver Chest', desc: '희귀 이상의 아이템이 나올 확률이 높다.', category: 'special', rarity: 'rare', price: 420, icon: 'chest', tint: '#ced4da', shop: 'special', minRank: 'D', use: { type: 'chest', tier: 'silver' }, loot: true, gacha: true }),
  I({ id: 'chest_gold', name: '황금 보물상자', nameEn: 'Golden Chest', desc: '영웅 이상의 아이템이 반드시 하나 들어 있다.', category: 'special', rarity: 'epic', price: 1300, icon: 'chest', tint: '#ffd43b', shop: 'special', minRank: 'B', use: { type: 'chest', tier: 'gold' }, gacha: true }),
  I({ id: 'rw_walk', name: '현실 보상: 산책 20분', nameEn: 'Reward: 20min Walk', desc: '사용하면 20분 보상 타이머가 시작된다. 바깥 공기를 마시고 오자!', category: 'special', rarity: 'common', price: 50, icon: 'ticket', tint: '#8ce99a', shop: 'special', use: { type: 'realReward', minutes: 20, label: '산책' } }),
  I({ id: 'rw_dessert', name: '현실 보상: 디저트 20분', nameEn: 'Reward: Dessert', desc: '사용하면 20분 보상 타이머가 시작된다. 달콤한 휴식!', category: 'special', rarity: 'common', price: 80, icon: 'ticket', tint: '#ffa8a8', shop: 'special', use: { type: 'realReward', minutes: 20, label: '디저트' } }),
  I({ id: 'rw_youtube', name: '현실 보상: 유튜브 30분', nameEn: 'Reward: 30min Video', desc: '사용하면 30분 보상 타이머가 시작된다. 시간이 끝나면 다시 공부!', category: 'special', rarity: 'uncommon', price: 100, icon: 'ticket', tint: '#ff6b6b', shop: 'special', use: { type: 'realReward', minutes: 30, label: '유튜브' } }),
  I({ id: 'rw_game', name: '현실 보상: 게임 1시간', nameEn: 'Reward: 1h Game', desc: '사용하면 60분 보상 타이머가 시작된다. 열심히 공부한 날의 특권.', category: 'special', rarity: 'rare', price: 250, icon: 'ticket', tint: '#b197fc', shop: 'special', minRank: 'E', use: { type: 'realReward', minutes: 60, label: '게임' } }),

  // ───────────── COSMETICS (gacha only) ─────────────
  I({ id: 'cos_t_slime', name: '칭호: 슬라임의 친구', nameEn: 'Title: Slime Friend', desc: '슬라임들이 왠지 친근하게 군다.', category: 'cosmetic', rarity: 'rare', price: 300, icon: 'crown', tint: '#69db7c', cosmetic: { kind: 'title', value: '슬라임의 친구' }, gacha: true }),
  I({ id: 'cos_t_night', name: '칭호: 밤샘의 군주', nameEn: 'Title: Lord of All-Nighters', desc: '새벽 4시의 고요함을 아는 자.', category: 'cosmetic', rarity: 'epic', price: 900, icon: 'crown', tint: '#748ffc', cosmetic: { kind: 'title', value: '밤샘의 군주' }, gacha: true }),
  I({ id: 'cos_t_perfect', name: '칭호: 만점의 사도', nameEn: 'Title: Apostle of Perfect Scores', desc: '오답노트가 필요 없는 자.', category: 'cosmetic', rarity: 'legendary', price: 3000, icon: 'crown', tint: '#ffd43b', cosmetic: { kind: 'title', value: '만점의 사도' }, gacha: true }),
  I({ id: 'cos_t_genius', name: '칭호: 노력하는 천재', nameEn: 'Title: Hardworking Genius', desc: '재능보다 무서운 건 꾸준함이다.', category: 'cosmetic', rarity: 'mythic', price: 9000, icon: 'crown', tint: '#ff4d6d', cosmetic: { kind: 'title', value: '노력하는 천재' }, gacha: true }),
  I({ id: 'cos_c_red', name: '진홍의 망토', nameEn: 'Crimson Cape', desc: '캐릭터에게 붉은 망토를 입힌다.', category: 'cosmetic', rarity: 'rare', price: 300, icon: 'cape', tint: '#e03131', cosmetic: { kind: 'cape', value: '#c92a2a' }, gacha: true }),
  I({ id: 'cos_c_blue', name: '심해의 망토', nameEn: 'Abyssal Cape', desc: '캐릭터에게 푸른 망토를 입힌다.', category: 'cosmetic', rarity: 'rare', price: 300, icon: 'cape', tint: '#1c7ed6', cosmetic: { kind: 'cape', value: '#1864ab' }, gacha: true }),
  I({ id: 'cos_c_purple', name: '황혼의 망토', nameEn: 'Twilight Cape', desc: '캐릭터에게 보랏빛 망토를 입힌다.', category: 'cosmetic', rarity: 'epic', price: 900, icon: 'cape', tint: '#9c36b5', cosmetic: { kind: 'cape', value: '#862e9c' }, gacha: true }),
  I({ id: 'cos_c_gold', name: '황금 망토', nameEn: 'Golden Cape', desc: '캐릭터에게 황금 망토를 입힌다.', category: 'cosmetic', rarity: 'legendary', price: 3000, icon: 'cape', tint: '#fab005', cosmetic: { kind: 'cape', value: '#f59f00' }, gacha: true }),
  I({ id: 'cos_a_gold', name: '금빛 오라', nameEn: 'Golden Aura', desc: '캐릭터 주위에 금빛 입자가 흐른다.', category: 'cosmetic', rarity: 'epic', price: 900, icon: 'aura', tint: '#ffd43b', cosmetic: { kind: 'aura', value: '#ffd43b' }, gacha: true }),
  I({ id: 'cos_a_void', name: '심연의 오라', nameEn: 'Void Aura', desc: '캐릭터 주위에 보랏빛 심연이 일렁인다.', category: 'cosmetic', rarity: 'legendary', price: 3000, icon: 'aura', tint: '#b57bff', cosmetic: { kind: 'aura', value: '#9c6bff' }, gacha: true }),
  I({ id: 'cos_a_rainbow', name: '무지개 오라', nameEn: 'Prismatic Aura', desc: '신화의 빛. 캐릭터 주위에 무지개가 흐른다.', category: 'cosmetic', rarity: 'mythic', price: 9000, icon: 'aura', tint: '#ff4d6d', cosmetic: { kind: 'aura', value: 'rainbow' }, gacha: true }),

  // ───────────── CHARACTERS (gacha only) ─────────────
  I({ id: 'char_mage', name: '캐릭터: 에테르 (마도사)', nameEn: 'Character: Aether', desc: '마법 유형 캐릭터. 방어를 무시하는 마법을 쓴다. 소환하면 출전 캐릭터로 고를 수 있다.', category: 'character', rarity: 'epic', price: 0, icon: 'person', tint: '#74c0fc', character: 'mage' }),
  I({ id: 'char_pyro', name: '캐릭터: 이그니스 (화염술사)', nameEn: 'Character: Ignis', desc: '화염 유형 캐릭터. 화상으로 적을 오래 태운다.', category: 'character', rarity: 'epic', price: 0, icon: 'person', tint: '#ff922b', character: 'pyro' }),
  I({ id: 'char_toxin', name: '캐릭터: 비올라 (독술사)', nameEn: 'Character: Viola', desc: '독 유형 캐릭터. 독을 겹겹이 쌓아 끈질기게 녹인다.', category: 'character', rarity: 'epic', price: 0, icon: 'person', tint: '#94d82d', character: 'toxin' }),
  I({ id: 'char_cleric', name: '캐릭터: 세라핌 (성직자)', nameEn: 'Character: Seraphim', desc: '신성 유형 캐릭터. 피해를 흡수하고 언데드를 정화한다.', category: 'character', rarity: 'legendary', price: 0, icon: 'person', tint: '#ffe066', character: 'cleric' }),
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const it = ITEM_MAP[id];
  if (!it) throw new Error('Unknown item: ' + id);
  return it;
}

export function itemValue(def: ItemDef, plus = 0) {
  const base = def.price || RARITY_INFO[def.rarity].value;
  return Math.round(base * (1 + plus * 0.25));
}

export const SLOT_LABEL: Record<string, string> = {
  weapon: '무기',
  helmet: '투구',
  armor: '갑옷',
  gloves: '장갑',
  boots: '신발',
  accessory: '장신구',
  acc1: '장신구 1',
  acc2: '장신구 2',
};

export const SHOP_TABS: { id: import('../game/types').ShopTab; label: string; en: string }[] = [
  { id: 'weapons', label: '무기', en: 'WEAPONS' },
  { id: 'armor', label: '방어구', en: 'ARMOR' },
  { id: 'accessories', label: '장신구', en: 'ACCESSORIES' },
  { id: 'consumables', label: '소모품', en: 'CONSUMABLES' },
  { id: 'special', label: '특수', en: 'SPECIAL' },
];
