import type { RankId, Rarity } from '../game/types';

export type BgId = 'town' | 'training' | 'forest' | 'dungeon' | 'arena' | 'tower' | 'f4' | 'f7' | 'f13' | 'summit';

export interface LocationDef {
  id: 'town' | 'training' | 'forest' | 'dungeon' | 'arena' | 'tower';
  name: string;
  nameEn: string;
  desc: string;
  kind: 'town' | 'training' | 'field' | 'arena' | 'tower';
  unlock?: { rank?: RankId; floor?: number; text: string };
  pool?: string[];
  levelRange?: [number, number];
  stamina: number;
  bg: BgId;
  map: { x: number; y: number }; // % position on the world map
}

export const LOCATIONS: LocationDef[] = [
  { id: 'town', name: '시작의 마을', nameEn: 'TOWN', desc: '모험가들이 쉬어 가는 마을. 여관에서 쉬고, 상점과 소환의 제단을 이용할 수 있다.', kind: 'town', stamina: 0, bg: 'town', map: { x: 22, y: 70 } },
  { id: 'training', name: '훈련장', nameEn: 'TRAINING GROUND', desc: '허수아비를 상대로 스킬을 연습한다. 기력이 들지 않지만 보상도 없다.', kind: 'training', stamina: 0, bg: 'training', map: { x: 10, y: 45 } },
  { id: 'forest', name: '속삭이는 숲', nameEn: 'WHISPERING FOREST', desc: '슬라임과 고블린, 도깨비불이 사는 숲. 몬스터 레벨이 나보다 조금 낮게 맞춰진다. (Lv 1~15)', kind: 'field', pool: ['slime_green', 'slime_blue', 'goblin', 'goblin_archer', 'wisp', 'slime_red'], levelRange: [1, 15], stamina: 1, bg: 'forest', map: { x: 40, y: 50 } },
  { id: 'dungeon', name: '잊혀진 지하묘지', nameEn: 'FORGOTTEN CATACOMBS', desc: '해골과 암흑기사가 잠든 지하묘지. 좋은 장비를 떨어뜨린다. (Lv 10~50)', kind: 'field', pool: ['skeleton', 'skeleton_warrior', 'skeleton_mage', 'imp', 'dark_knight', 'gargoyle', 'wraith', 'black_paladin', 'golem'], levelRange: [10, 50], stamina: 1, bg: 'dungeon', unlock: { rank: 'D', text: '랭크 D 필요' }, map: { x: 62, y: 76 } },
  { id: 'arena', name: '투기장', nameEn: 'ARENA', desc: '강화된 엘리트 몬스터와 싸운다. 기력 2, 보상 2배, 영웅 장비 확률 상승.', kind: 'arena', stamina: 2, bg: 'arena', unlock: { rank: 'C', floor: 13, text: '랭크 C + 탑 13층 돌파 필요' }, map: { x: 80, y: 52 } },
  { id: 'tower', name: '시련의 탑', nameEn: 'TOWER OF TRIALS', desc: '구름 너머로 끝없이 솟은 탑. 100층 정상에 무엇이 있는지 아무도 모른다.', kind: 'tower', stamina: 2, bg: 'tower', map: { x: 58, y: 22 } },
];

export function getLocation(id: string) {
  return LOCATIONS.find((l) => l.id === id)!;
}

// ── Gacha ───────────────────────────────────────────────────
export const GACHA = {
  single: 150,
  multi: 1350,
  pity: 60, // guaranteed Legendary+ after this many pulls without one
  rates: [
    ['common', 45],
    ['uncommon', 30],
    ['rare', 15],
    ['epic', 7.5],
    ['legendary', 2.2],
    ['mythic', 0.3],
  ] as [Rarity, number][],
};

// ── Treasure chests ─────────────────────────────────────────
export const CHESTS: Record<'bronze' | 'silver' | 'gold', { gold: [number, number]; items: number; weights: [Rarity, number][]; guarantee?: Rarity[] }> = {
  bronze: { gold: [30, 90], items: 1, weights: [['common', 50], ['uncommon', 35], ['rare', 13], ['epic', 2]] },
  silver: { gold: [100, 260], items: 2, weights: [['uncommon', 40], ['rare', 40], ['epic', 17], ['legendary', 3]] },
  gold: { gold: [300, 650], items: 2, weights: [['rare', 45], ['epic', 40], ['legendary', 13], ['mythic', 2]], guarantee: ['epic', 'legendary', 'mythic'] },
};

// ── Floor-7 slot machine ────────────────────────────────────
export const SLOT_SYMBOLS = ['seven', 'gem', 'coin', 'potion', 'star'] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = { seven: 12, gem: 16, coin: 26, potion: 24, star: 22 };

// ── Knowledge quiz (floor 13 seals) ─────────────────────────
export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  subject: string;
}

export const QUIZ: QuizQ[] = [
  { subject: '화학', q: '물 분자(H₂O)의 결합각에 가장 가까운 값은?', options: ['90°', '104.5°', '109.5°', '120°'], answer: 1 },
  { subject: '화학', q: '아보가드로수에 가장 가까운 값은?', options: ['3.00×10⁸', '6.02×10²³', '1.60×10⁻¹⁹', '9.81×10¹'], answer: 1 },
  { subject: '화학', q: '0°C, 1기압에서 이상 기체 1몰의 부피는 약?', options: ['11.2 L', '22.4 L', '24.5 L', '1.0 L'], answer: 1 },
  { subject: '화학', q: '망가니즈(Mn)의 산화수가 +7인 화합물은?', options: ['MnO₂', 'KMnO₄', 'MnCl₂', 'Mn₂O₃'], answer: 1 },
  { subject: '화학', q: 'pH가 3인 수용액의 [H⁺]는?', options: ['3 M', '1×10⁻³ M', '1×10⁻¹¹ M', '0.3 M'], answer: 1 },
  { subject: '화학', q: '메테인(CH₄) 분자의 구조는?', options: ['평면 삼각형', '굽은형', '정사면체', '직선형'], answer: 2 },
  { subject: '화학', q: '전자 배치가 1s² 2s² 2p⁶ 3s¹ 인 원소는?', options: ['Ne', 'Na', 'Mg', 'K'], answer: 1 },
  { subject: '화학', q: '같은 주기에서 원자 번호가 커질수록 원자 반지름은 대체로?', options: ['커진다', '작아진다', '변하지 않는다', '불규칙하다'], answer: 1 },
  { subject: '화학', q: 'ΔH < 0 인 반응은?', options: ['흡열 반응', '발열 반응', '중화 반응만', '상태 변화만'], answer: 1 },
  { subject: '화학', q: '발열 반응이 평형일 때 온도를 높이면 평형은?', options: ['정반응 쪽으로', '역반응 쪽으로', '이동하지 않음', '반응이 멈춤'], answer: 1 },
  { subject: '물리', q: '힘의 단위 N(뉴턴)을 SI 기본 단위로 나타내면?', options: ['kg·m/s', 'kg·m/s²', 'kg·m²/s²', 'J/s'], answer: 1 },
  { subject: '물리', q: '지표면 근처에서 자유 낙하하는 물체의 가속도는 약?', options: ['1.6 m/s²', '9.8 m/s²', '3.0 m/s²', '98 m/s²'], answer: 1 },
  { subject: '물리', q: '질량 2 kg인 물체가 3 m/s로 움직일 때 운동 에너지는?', options: ['3 J', '6 J', '9 J', '18 J'], answer: 2 },
  { subject: '물리', q: '진공에서 빛의 속력은 약?', options: ['3×10⁵ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s', '340 m/s'], answer: 1 },
  { subject: '물리', q: '저항값이 R인 저항 두 개를 병렬로 연결한 합성 저항은?', options: ['2R', 'R', 'R/2', 'R/4'], answer: 2 },
  { subject: '물리', q: '파동의 속력 v, 진동수 f, 파장 λ의 관계는?', options: ['v = f/λ', 'v = fλ', 'v = λ/f', 'v = f + λ'], answer: 1 },
  { subject: '물리', q: '등속 원운동하는 물체의 가속도 방향은?', options: ['운동 방향', '원의 중심 방향', '원의 바깥 방향', '가속도가 0'], answer: 1 },
  { subject: '물리', q: '광전 효과에서 튀어나오는 전자의 최대 운동 에너지를 결정하는 것은?', options: ['빛의 세기', '빛의 진동수', '비춘 시간', '금속의 질량'], answer: 1 },
  { subject: '물리', q: '운동량의 단위는?', options: ['kg·m/s', 'kg·m/s²', 'N/m', 'J·s'], answer: 0 },
  { subject: '물리', q: '특수 상대성 이론에 따르면, 빠르게 움직이는 시계는 정지한 관찰자가 볼 때?', options: ['빠르게 간다', '느리게 간다', '똑같이 간다', '멈춘다'], answer: 1 },
  { subject: '수학', q: 'f(x) = x³ 일 때 f′(2)의 값은?', options: ['6', '8', '12', '4'], answer: 2 },
  { subject: '수학', q: '∫₀¹ 2x dx 의 값은?', options: ['1/2', '1', '2', '0'], answer: 1 },
  { subject: '수학', q: 'log₂ 32 의 값은?', options: ['4', '5', '6', '16'], answer: 1 },
  { subject: '수학', q: 'sin²θ + cos²θ 의 값은?', options: ['0', '1', '2', 'tanθ'], answer: 1 },
  { subject: '수학', q: '등차수열 2, 5, 8, … 의 10번째 항은?', options: ['26', '29', '32', '30'], answer: 1 },
  { subject: '수학', q: '이차방정식 x² − 5x + 6 = 0 의 두 근의 합은?', options: ['−5', '5', '6', '−6'], answer: 1 },
  { subject: '수학', q: 'lim(x→0) (sin x)/x 의 값은?', options: ['0', '1', '∞', '존재하지 않음'], answer: 1 },
  { subject: '수학', q: '5! 의 값은?', options: ['25', '60', '120', '720'], answer: 2 },
  { subject: '기하', q: '두 변의 길이가 3, 4인 직각삼각형의 빗변의 길이는?', options: ['5', '6', '7', '√7'], answer: 0 },
  { subject: '기하', q: '원 x² + y² = 25 의 반지름은?', options: ['5', '25', '√5', '10'], answer: 0 },
  { subject: '기하', q: '정육면체의 꼭짓점 개수는?', options: ['6', '8', '12', '4'], answer: 1 },
];
