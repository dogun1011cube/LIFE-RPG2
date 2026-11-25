import type { RankId } from '../game/types';

export interface RankDef {
  id: RankId;
  title: string;
  color: string;
  level: number;
  floor: number;
  bosses: number;
  staminaMax: number;
  perks: string[];
}

/** A rank is reached when ALL criteria (level, highest tower floor, bosses) are met. */
export const RANKS: RankDef[] = [
  { id: 'F', title: '새내기 모험가', color: '#868e96', level: 1, floor: 0, bosses: 0, staminaMax: 60, perks: ['기본 상점', '속삭이는 숲', '시련의 탑 1~20층'] },
  { id: 'E', title: '견습 모험가', color: '#69db7c', level: 5, floor: 3, bosses: 0, staminaMax: 70, perks: ['고급 장비 판매', '회복 물약 판매', '현실 보상: 게임 1시간'] },
  { id: 'D', title: '정식 모험가', color: '#4dabf7', level: 10, floor: 10, bosses: 1, staminaMax: 80, perks: ['희귀 장비 판매', '잊혀진 지하묘지 개방', '은 보물상자'] },
  { id: 'C', title: '숙련 모험가', color: '#38d9a9', level: 15, floor: 15, bosses: 3, staminaMax: 90, perks: ['탑 21층 봉인 해제', '투기장 개방', '엘릭서 판매'] },
  { id: 'B', title: '베테랑', color: '#b57bff', level: 22, floor: 25, bosses: 5, staminaMax: 100, perks: ['영웅 장비 판매', '탑 41층 봉인 해제', '황금 보물상자'] },
  { id: 'A', title: '엘리트', color: '#ff922b', level: 30, floor: 40, bosses: 7, staminaMax: 110, perks: ['최상급 방어구', '탑 61층 봉인 해제'] },
  { id: 'S', title: '영웅', color: '#ffc531', level: 40, floor: 55, bosses: 8, staminaMax: 120, perks: ['전설 장비 판매', '탑 81층 봉인 해제'] },
  { id: 'SS', title: '전설', color: '#ff6b6b', level: 52, floor: 75, bosses: 11, staminaMax: 135, perks: ['기력 최대치 증가'] },
  { id: 'SSS', title: '탑의 정복자', color: '#ff4d6d', level: 65, floor: 100, bosses: 13, staminaMax: 150, perks: ['모든 콘텐츠 정복'] },
];

export const RANK_ORDER: RankId[] = RANKS.map((r) => r.id);

export function rankIndex(r: RankId) {
  return RANK_ORDER.indexOf(r);
}

export function rankAtLeast(have: RankId, need: RankId | undefined) {
  if (!need) return true;
  return rankIndex(have) >= rankIndex(need);
}

export function getRank(id: RankId): RankDef {
  return RANKS[rankIndex(id)];
}

export function computeRank(level: number, floor: number, bosses: number): RankId {
  let r: RankId = 'F';
  for (const def of RANKS) {
    if (level >= def.level && floor >= def.floor && bosses >= def.bosses) r = def.id;
    else break;
  }
  return r;
}

export function nextRank(id: RankId): RankDef | null {
  const i = rankIndex(id);
  return i < RANKS.length - 1 ? RANKS[i + 1] : null;
}
