import type { ItemDef, Rarity } from '../game/types';
import { WEAPONS } from './weapons';
import { ARMORS } from './armor';
import { ACCESSORIES } from './accessories';

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
  // ───────────── WEAPONS (src/data/weapons.ts) ─────────────
  ...WEAPONS,

  // ───────────── ARMOR (src/data/armor.ts) & ACCESSORIES (src/data/accessories.ts) ─────────────
  ...ARMORS,
  ...ACCESSORIES,

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
