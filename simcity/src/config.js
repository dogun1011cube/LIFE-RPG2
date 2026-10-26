// 게임 전역 설정값
export const MAP_W = 64;
export const MAP_H = 64;
export const VOX = 4;          // 타일 한 칸 = 4x4 복셀
export const VOXEL = 1 / VOX;  // 복셀 한 개의 월드 크기
export const CHUNK = 16;       // 지형 메시 청크 크기(타일)

export const TERRAIN = { GRASS: 0, SAND: 1, WATER: 2 };
export const FEATURE = { NONE: 0, TREE: 1, ROCK: 2 };
export const ZONE = { NONE: 0, R: 1, C: 2, I: 3 };
export const ZONE_KEYS = ['', 'r', 'c', 'i'];
export const ZONE_NAMES = ['없음', '주거', '상업', '공업'];

export const START_MONEY = 20000;
export const DEFAULT_TAX = 9;

export const COST = {
  road: 10,
  zone: 5,
  clearFeature: 3,  // 나무/바위 치우기
  bulldoze: 2,
};

// 도로가 이 거리(맨해튼) 안에 있어야 구역에 건물이 들어선다
export const ROAD_REACH = 3;

// 건물 단계별 수용 인원 (주거=주민, 상업/공업=일자리)
export const CAPACITY = {
  1: [0, 10, 40, 140],
  2: [0, 6, 24, 90],
  3: [0, 12, 36, 80],
};

export const LEVEL_NAMES = {
  1: ['', '단독주택', '연립주택', '고층 아파트'],
  2: ['', '동네 상점', '오피스', '고층 빌딩'],
  3: ['', '작업장', '공장', '대형 공장'],
};

// 단계 상승 조건: 도시 인구, 주변(8칸) 건물 수
export const UPGRADE_REQ = {
  2: { pop: 200, neighbors: 2, neighborLevel: 1 },
  3: { pop: 1200, neighbors: 4, neighborLevel: 2 },
};

// 속도별 초당 진행 일수 (0 = 일시정지)
export const SPEEDS = [0, 2, 5, 12];
export const DAYS_PER_MONTH = 30;
export const START_YEAR = 2026;

export const MILESTONES = [
  [100, '작은 마을이 생겼어요!'],
  [500, '동네가 북적이기 시작해요.'],
  [1000, '소도시로 성장했어요!'],
  [2500, '어엿한 도시가 되었어요!'],
  [5000, '대도시 달성!'],
  [10000, '메트로폴리스! 대단해요!'],
];

export const SAVE_KEY = 'pixelcity.save.v1';
