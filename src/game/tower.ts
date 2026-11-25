import { FLOOR_BOSSES, towerPool } from '../data/monsters';
import { rankAtLeast } from '../data/ranks';
import { ITEMS } from '../data/items';
import type { BgId, QuizQ, SlotSymbol } from '../data/world';
import { QUIZ, SLOT_SYMBOLS, SLOT_WEIGHTS } from '../data/world';
import type { Ctx } from './core';
import { addItem, GameError, gainExp, gainGold, sfx, toast } from './core';
import { currentRank, deriveStats } from './progression';
import { hashStr, pick, seeded, weighted } from './rng';
import type { GameState, ItemDef, RankId } from './types';

export type FloorType = 'battle' | 'elite' | 'boss' | 'treasure' | 'event' | 'merchant' | 'special';

export interface FloorReward {
  exp: number;
  gold: number;
  items: [string, number][];
}

export interface FloorInfo {
  floor: number;
  type: FloorType;
  name: string;
  zone: string;
  desc: string;
  level: number;
  waves: string[];
  elite: boolean;
  stamina: number;
  sealRank?: RankId;
  canEscape: boolean;
  firstClear: FloorReward;
  special?: 4 | 7 | 13;
  eventId?: EventId;
  bg: BgId;
}

export const TOWER_TOP = 100;

export function monsterLevelForFloor(f: number) {
  return 1 + Math.floor(f * 0.62);
}

export function zoneName(f: number) {
  if (f <= 9) return '탑의 입구';
  if (f <= 19) return '고블린의 회랑';
  if (f <= 29) return '망자의 서고';
  if (f <= 44) return '암흑 기사단 요새';
  if (f <= 59) return '심연의 계단';
  if (f <= 79) return '얼어붙은 시간';
  if (f <= 99) return '천공의 성역';
  if (f === 100) return '탑의 정상';
  return '무한의 탑';
}

export function sealRankFor(f: number): RankId | undefined {
  if (f >= 81) return 'S';
  if (f >= 61) return 'A';
  if (f >= 41) return 'B';
  if (f >= 21) return 'C';
  return undefined;
}

export type EventId = 'fountain' | 'library' | 'shrine' | 'trap' | 'gambler';
const EVENT_IDS: EventId[] = ['fountain', 'library', 'shrine', 'trap', 'gambler'];

export function floorType(f: number): FloorType {
  if (f === 4 || f === 7 || f === 13) return 'special';
  if (f % 10 === 0) return 'boss';
  if (f % 10 === 5) return 'elite';
  if (f % 10 === 3) return 'treasure';
  if (f % 10 === 8) return 'event';
  if (f % 10 === 9) return 'merchant';
  return 'battle';
}

export function floorInfo(f: number): FloorInfo {
  const type = floorType(f);
  const level = monsterLevelForFloor(f);
  const rng = seeded(hashStr('floor' + f));
  const zone = zoneName(f);
  const base: FloorReward = { exp: 10 + 6 * f, gold: 20 + 10 * f, items: [] };
  const info: FloorInfo = {
    floor: f,
    type,
    name: `${f}층`,
    zone,
    desc: '',
    level,
    waves: [],
    elite: false,
    stamina: 2,
    sealRank: sealRankFor(f),
    canEscape: true,
    firstClear: base,
    bg: f >= 100 ? 'summit' : 'tower',
  };
  switch (type) {
    case 'battle': {
      const pool = towerPool(f);
      info.waves = [pick(rng, pool)];
      if (f > 30 && rng() < 0.35) info.waves.push(pick(rng, pool));
      info.desc = '몬스터가 계단을 가로막고 있다.';
      break;
    }
    case 'elite': {
      info.waves = [f === 5 ? 'slime_king' : pick(rng, towerPool(f))];
      info.elite = f !== 5;
      info.stamina = 3;
      info.name = `${f}층 · 정예`;
      info.desc = f === 5 ? '푸른 수정 왕관을 쓴 슬라임 킹이 기다리고 있다.' : '강화된 정예 몬스터가 지키는 층.';
      info.firstClear = { exp: Math.round(base.exp * 1.6), gold: Math.round(base.gold * 1.6), items: [['p_small', 2]] };
      break;
    }
    case 'boss': {
      const boss = FLOOR_BOSSES[f] ?? pick(rng, ['dk_commander', 'abyss_dragon', 'archdemon', 'void_reaper', 'ancient_golem', 'frost_queen']);
      info.waves = [boss];
      info.stamina = 3;
      info.canEscape = false;
      info.name = `${f}층 · BOSS`;
      info.desc = '탑의 수호자가 기다리는 보스 층. 도망칠 수 없다.';
      info.firstClear = { exp: base.exp * 3, gold: base.gold * 3, items: [[f >= 50 ? 'chest_gold' : f >= 20 ? 'chest_silver' : 'chest_bronze', 1]] };
      break;
    }
    case 'treasure':
      info.stamina = 1;
      info.name = `${f}층 · 보물고`;
      info.desc = '먼지 쌓인 보물상자가 놓여 있다.';
      info.firstClear = { exp: base.exp, gold: base.gold, items: [[f >= 50 ? 'chest_gold' : f >= 20 ? 'chest_silver' : 'chest_bronze', 1]] };
      break;
    case 'event':
      info.stamina = 1;
      info.eventId = EVENT_IDS[hashStr('ev' + f) % EVENT_IDS.length];
      info.name = `${f}층 · 이벤트`;
      info.desc = EVENTS[info.eventId].title;
      info.firstClear = { exp: Math.round(base.exp * 0.5), gold: Math.round(base.gold * 0.5), items: [] };
      break;
    case 'merchant':
      info.stamina = 1;
      info.name = `${f}층 · 떠돌이 상인`;
      info.desc = '보스 층을 앞두고 상인이 좌판을 펼쳤다. 특별 할인!';
      info.firstClear = { exp: Math.round(base.exp * 0.5), gold: Math.round(base.gold * 0.3), items: [] };
      break;
    case 'special':
      info.special = f as 4 | 7 | 13;
      info.stamina = 3;
      info.canEscape = false;
      if (f === 4) {
        info.name = '4층 · 死 망자의 회랑';
        info.bg = 'f4';
        info.waves = ['wisp', 'wraith', 'reaper'];
        info.desc = '죽음(死)과 같은 소리를 가진 불길한 층. 연속 3전투, 회복 효과 절반.';
        info.firstClear = { exp: base.exp * 3, gold: base.gold * 3, items: [['w_scythe', 1], ['n_deathcharm', 1]] };
      } else if (f === 7) {
        info.name = '7층 · 행운의 전당';
        info.bg = 'f7';
        info.waves = ['slime_king_gold'];
        info.desc = '행운의 숫자 7. 황금 슬롯머신과 황금 슬라임 킹이 기다린다.';
        info.firstClear = { exp: base.exp * 3, gold: 777, items: [['n_lucky7', 1]] };
      } else {
        info.name = '13층 · 금기의 층';
        info.bg = 'f13';
        info.waves = ['guest13'];
        info.desc = '탑의 상층부를 봉인한 금기의 층. 지식의 봉인과 파멸의 시계.';
        info.firstClear = { exp: base.exp * 4, gold: 1313, items: [['n_seal13', 1], ['chest_silver', 1]] };
      }
      break;
  }
  return info;
}

export function floorAccess(s: GameState, f: number): { ok: boolean; reason?: string } {
  if (f < 1) return { ok: false, reason: '존재하지 않는 층' };
  if (f > s.tower.highestCleared + 1) return { ok: false, reason: '아래층을 먼저 돌파하세요.' };
  const seal = sealRankFor(f);
  if (seal && !rankAtLeast(currentRank(s), seal)) return { ok: false, reason: `봉인됨 — 랭크 ${seal} 필요` };
  return { ok: true };
}

export function isCleared(s: GameState, f: number) {
  return f <= s.tower.highestCleared;
}

/** Grants first-clear rewards & advances progress. Returns reward summary lines. */
export function clearFloor(s: GameState, ctx: Ctx, f: number): string[] {
  const lines: string[] = [];
  if (f !== s.tower.highestCleared + 1) {
    // repeat clear: no first-clear reward
    s.tower.runs += 1;
    return lines;
  }
  const info = floorInfo(f);
  s.tower.highestCleared = f;
  s.tower.currentFloor = f + 1;
  s.tower.runs += 1;
  s.day.floorsCleared += 1;
  const exp = gainExp(s, info.firstClear.exp, 'other');
  const gold = gainGold(s, info.firstClear.gold);
  lines.push(`첫 돌파 보상: EXP +${exp} · +${gold} G`);
  for (const [id, q] of info.firstClear.items) {
    const r = addItem(s, id, q, ctx, false);
    lines.push(`획득: ${r.label}`);
  }
  toast(ctx, 'tower', 'TOWER FLOOR CLEARED', `${info.name} 돌파!`);
  sfx(ctx, 'stairs');
  return lines;
}

// ── Event floors ─────────────────────────────────────────────
export interface EventOption {
  id: string;
  label: string;
  hint: string;
}
export const EVENTS: Record<EventId, { title: string; text: string; options: EventOption[] }> = {
  fountain: {
    title: '지혜의 샘',
    text: '맑은 물이 솟는 샘이 있다. 물에 비친 얼굴이 어제보다 조금 더 똑똑해 보인다.',
    options: [
      { id: 'drink', label: '샘물을 마신다', hint: 'HP·MP 완전 회복' },
      { id: 'bottle', label: '병에 담아 간다', hint: '회복 물약 ×2' },
    ],
  },
  library: {
    title: '고대 도서관',
    text: '먼지 쌓인 서가에 오래된 책들이 꽂혀 있다. 누군가의 공부 기록 같다.',
    options: [
      { id: 'read', label: '책을 읽는다', hint: 'EXP 획득' },
      { id: 'sell', label: '책을 챙겨 판다', hint: '골드 획득' },
    ],
  },
  shrine: {
    title: '행운의 제단',
    text: '희미하게 빛나는 제단. 기도를 올리면 무언가 일어날 것 같다.',
    options: [
      { id: 'pray', label: '기도한다', hint: '무작위 두루마리 / 아이템' },
      { id: 'offer', label: '골드를 바친다', hint: '골드를 내고 희귀 아이템 확정' },
    ],
  },
  trap: {
    title: '함정의 방',
    text: '바닥 곳곳에 수상한 타일이 깔려 있다. 반대편에 금화 더미가 보인다.',
    options: [
      { id: 'careful', label: '조심히 건넌다', hint: 'DEX 판정 — 성공 시 골드, 실패 시 피해' },
      { id: 'rush', label: '힘으로 돌파한다', hint: 'HP 10% 잃고 골드 조금' },
    ],
  },
  gambler: {
    title: '떠돌이 도박사',
    text: '"동전 하나로 운명을 걸어 보겠나?" 수상한 도박사가 웃고 있다.',
    options: [
      { id: 'bet', label: '골드를 건다', hint: '50% 확률로 2배' },
      { id: 'decline', label: '거절한다', hint: '도박사가 팁을 준다' },
    ],
  },
};

export function eventBetAmount(f: number) {
  return 50 + 5 * f;
}
export function shrineOffer(f: number) {
  return 100 + 8 * f;
}

export function resolveEvent(s: GameState, ctx: Ctx, f: number, optionId: string): string {
  const info = floorInfo(f);
  if (info.type !== 'event' || !info.eventId) throw new GameError('이벤트 층이 아닙니다.');
  const d = deriveStats(s);
  let text = '';
  switch (`${info.eventId}:${optionId}`) {
    case 'fountain:drink':
      s.player.hp = d.maxHp;
      s.player.mp = d.maxMp;
      text = '몸과 마음이 맑아졌다. HP·MP 완전 회복!';
      break;
    case 'fountain:bottle':
      addItem(s, 'p_mid', 2, ctx, false);
      text = '회복 물약 2개를 얻었다.';
      break;
    case 'library:read': {
      const e = gainExp(s, 20 + 4 * f, 'other');
      text = `지식이 쌓였다. EXP +${e}`;
      break;
    }
    case 'library:sell': {
      const g = gainGold(s, 30 + 6 * f, true);
      text = `책을 팔아 +${g} G를 얻었다.`;
      break;
    }
    case 'shrine:pray': {
      const id = weighted(ctx.rng, [['s_focus', 30], ['s_gold', 30], ['p_mid', 20], ['d_stamina', 12], ['d_tome', 8]] as [string, number][]);
      const r = addItem(s, id, 1, ctx, false);
      text = `제단이 빛났다! ${r.label} 획득.`;
      break;
    }
    case 'shrine:offer': {
      const cost = shrineOffer(f);
      if (s.player.gold < cost) throw new GameError(`골드가 부족합니다. (${cost} G 필요)`);
      s.player.gold -= cost;
      s.stats.goldSpent += cost;
      s.day.goldSpent += cost;
      const pool = ITEMS.filter((i) => i.rarity === 'rare' && i.loot);
      const it = pick(ctx.rng, pool);
      addItem(s, it.id, 1, ctx, false);
      text = `${cost} G를 바치자 ${it.name}이(가) 나타났다!`;
      break;
    }
    case 'trap:careful': {
      if (d.dex >= f * 0.8 + 5 || ctx.rng() < 0.35) {
        const g = gainGold(s, 40 + 5 * f, true);
        text = `함정을 모두 피했다! +${g} G`;
      } else {
        const dmg = Math.round(d.maxHp * 0.2);
        s.player.hp = Math.max(1, s.player.hp - dmg);
        text = `함정에 걸렸다! HP −${dmg}`;
      }
      break;
    }
    case 'trap:rush': {
      const dmg = Math.round(d.maxHp * 0.1);
      s.player.hp = Math.max(1, s.player.hp - dmg);
      const g = gainGold(s, 20 + 3 * f, true);
      text = `HP −${dmg}, 그래도 +${g} G를 챙겼다.`;
      break;
    }
    case 'gambler:bet': {
      const bet = eventBetAmount(f);
      if (s.player.gold < bet) throw new GameError(`골드가 부족합니다. (${bet} G 필요)`);
      if (ctx.rng() < 0.5) {
        const g = gainGold(s, bet);
        text = `승리! +${g} G`;
      } else {
        s.player.gold -= bet;
        s.stats.goldSpent += bet;
        s.day.goldSpent += bet;
        text = `패배… −${bet} G. 도박사가 낄낄 웃으며 사라졌다.`;
      }
      break;
    }
    case 'gambler:decline': {
      const g = gainGold(s, 15 + 2 * f);
      text = `"현명하군." 도박사가 팁으로 ${g} G를 건넸다.`;
      break;
    }
    default:
      throw new GameError('알 수 없는 선택');
  }
  return text;
}

// ── Merchant floors ──────────────────────────────────────────
export const MERCHANT_DISCOUNT = 0.2;
export function merchantStock(f: number): { item: ItemDef; price: number }[] {
  const rng = seeded(hashStr('merchant' + f));
  const level = monsterLevelForFloor(f);
  const consumables = ITEMS.filter((i) => i.category === 'consumable' && i.shop === 'consumables');
  const gear = ITEMS.filter((i) => i.category === 'equipment' && i.loot && (i.level ?? 1) <= level + 8 && (i.level ?? 1) >= level - 10);
  const picks: ItemDef[] = [];
  const add = (it: ItemDef) => {
    if (!picks.some((p) => p.id === it.id)) picks.push(it);
  };
  add(consumables.find((c) => c.id === (level > 20 ? 'p_large' : level > 8 ? 'p_mid' : 'p_small'))!);
  add(pick(rng, consumables));
  add(pick(rng, consumables));
  if (gear.length) {
    add(pick(rng, gear));
    add(pick(rng, gear));
  }
  return picks.map((item) => ({ item, price: Math.max(1, Math.floor(item.price * (1 - MERCHANT_DISCOUNT))) }));
}

// ── Floor 7 slot machine ─────────────────────────────────────
export interface SlotResult {
  reels: SlotSymbol[];
  text: string;
  gold: number;
  items: string[];
}

export function slotAvailable(s: GameState): { ok: boolean; free: number; reason?: string } {
  if (s.tower.highestCleared < 6) return { ok: false, free: 0, reason: '7층에 도달해야 합니다.' };
  if (s.tower.highestCleared < 7) {
    const used = s.tower.flags['f7_spins'] || 0;
    return { ok: used < 3, free: 3 - used, reason: used >= 3 ? '도전 전 무료 3회를 모두 사용했습니다.' : undefined };
  }
  const usedToday = s.tower.flags['f7_slot_day'] === s.day.number;
  return { ok: !usedToday, free: usedToday ? 0 : 1, reason: usedToday ? '오늘의 무료 스핀을 사용했습니다. (새 RPG 하루에 다시)' : undefined };
}

export function spinSlots(s: GameState, ctx: Ctx): SlotResult {
  const av = slotAvailable(s);
  if (!av.ok) throw new GameError(av.reason || '사용할 수 없습니다.');
  if (s.tower.highestCleared < 7) s.tower.flags['f7_spins'] = (s.tower.flags['f7_spins'] || 0) + 1;
  else s.tower.flags['f7_slot_day'] = s.day.number;
  const entries = SLOT_SYMBOLS.map((sym) => [sym, SLOT_WEIGHTS[sym]] as [SlotSymbol, number]);
  const reels = [0, 1, 2].map(() => weighted(ctx.rng, entries));
  const count = (sym: SlotSymbol) => reels.filter((r) => r === sym).length;
  let gold = 0;
  const items: string[] = [];
  let text = '';
  if (count('seven') === 3) {
    gold = 777;
    items.push('chest_silver');
    text = 'JACKPOT!! 7 · 7 · 7';
  } else if (reels[0] === reels[1] && reels[1] === reels[2]) {
    const sym = reels[0];
    if (sym === 'gem') {
      items.push('chest_bronze');
      gold = 150;
    } else if (sym === 'coin') gold = 300;
    else if (sym === 'potion') items.push('p_mid', 'p_mid', 'p_mana');
    else items.push('s_focus', 's_gold');
    text = 'TRIPLE! 세 개가 일치했다!';
  } else if (count('seven') === 2) {
    gold = 77;
    text = '7이 두 개! 럭키!';
  } else if (count('seven') === 1) {
    gold = 17;
    text = '7이 하나. 작은 행운.';
  } else {
    items.push('p_small');
    text = '꽝… 위로의 물약을 받았다.';
  }
  const g = gold ? gainGold(s, gold) : 0;
  for (const id of items) addItem(s, id, 1, ctx, false);
  sfx(ctx, gold >= 300 || count('seven') === 3 ? 'gachaLegend' : 'coin');
  return { reels, text, gold: g, items };
}

// ── Floor 13 knowledge seals ─────────────────────────────────
export function pickQuiz(rng: () => number, n = 3): QuizQ[] {
  const pool = [...QUIZ];
  const out: QuizQ[] = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export const FLOOR13_LORE = [
  '열세 번째 층 — 금기의 층.',
  '서양에서 13은 오래전부터 불길한 숫자였다. 최후의 만찬에 앉은 열세 번째 사람, 신들의 연회에 초대받지 않고 나타난 열세 번째 손님… 그래서 많은 건물에는 13층이 없다.',
  '이 탑을 세운 고대의 현자들은 탑의 상층부로 가는 길을 바로 이 13층에 봉인했다. 그 봉인을 지키는 것이 "열세 번째 손님"이다.',
  '봉인은 오직 지식으로만 풀 수 있다. 전투 전에 지식의 봉인 3개가 나타난다. 문제를 맞힐 때마다 봉인이 깨지고 손님이 약해진다.',
  '손님은 "파멸의 시계"를 품고 있다. 시계가 13에서 0이 되는 순간 강력한 일격이 떨어진다. 그 턴에 방어하거나, 그 전에 쓰러뜨려라. 이 전투에서는 도망칠 수 없다.',
  '13층을 넘으면 탑의 상층부(14층~)가 열리고, 전설의 증표 "열세 번째 인장"을 얻는다.',
];

export const FLOOR4_LORE = [
  '네 번째 층 — 死, 망자의 회랑.',
  '동양에서 숫자 4는 죽을 사(死)와 소리가 같아 불길하게 여겨진다. 그래서 엘리베이터에는 4 대신 F가 적혀 있곤 하다.',
  '이 층에서는 망자들이 세 번 연달아 덤벼든다. 도깨비불, 레이스, 그리고 사신. 전투 사이에 회복할 틈은 없다.',
  '죽음의 저주가 깃들어 모든 회복 효과가 절반이 된다. 사신의 "죽음의 선고"가 내려지면, 카운트가 1일 때 반드시 방어하라.',
];

export const FLOOR7_LORE = [
  '일곱 번째 층 — 행운의 전당.',
  '7은 동서양 모두에서 행운의 숫자다. 이 층의 주인은 온몸이 금화로 된 황금 슬라임 킹.',
  '전당에는 황금 슬롯머신이 있다. 도전 전 3번 무료로 돌릴 수 있고, 층을 돌파한 뒤에는 RPG 하루마다 1번씩 무료로 돌릴 수 있다.',
  '황금 슬라임 킹을 쓰러뜨리면 전설의 장신구 "럭키 세븐 펜던트"를 얻는다.',
];
