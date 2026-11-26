export type QuestMetric =
  | 'dayStudyMin' | 'daySubjects' | 'dayRecords' | 'dayMonsters' | 'dayFloors' | 'dayBattles'
  | 'totalStudyHours' | 'level' | 'monstersTotal' | 'highestFloor' | 'streak' | 'gachaTotal'
  | 'bossesTotal' | 'upgrades' | 'daysCompleted' | 'subjectsStudied' | 'chests';

export interface QuestReward {
  exp?: number;
  gold?: number;
  stamina?: number;
  items?: [string, number][];
}

export interface QuestDef {
  id: string;
  kind: 'daily' | 'achievement';
  title: string;
  desc: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
}

const D = (id: string, title: string, desc: string, metric: QuestMetric, target: number, reward: QuestReward): QuestDef => ({ id, kind: 'daily', title, desc, metric, target, reward });
const A = (id: string, title: string, desc: string, metric: QuestMetric, target: number, reward: QuestReward): QuestDef => ({ id, kind: 'achievement', title, desc, metric, target, reward });

export const QUESTS: QuestDef[] = [
  // ── Daily (reset at each new RPG day) ──
  D('d_study30', '워밍업', '오늘 30분 공부하기', 'dayStudyMin', 30, { exp: 15, gold: 20 }),
  D('d_study60', '한 시간의 집중', '오늘 1시간 공부하기', 'dayStudyMin', 60, { exp: 30, gold: 35, stamina: 2 }),
  D('d_study180', '몰입의 시간', '오늘 3시간 공부하기', 'dayStudyMin', 180, { exp: 80, gold: 80, items: [['p_small', 2]] }),
  D('d_study360', '불타는 학구열', '오늘 6시간 공부하기', 'dayStudyMin', 360, { exp: 150, gold: 150, stamina: 5, items: [['chest_bronze', 1]] }),
  D('d_subjects2', '균형 잡힌 학습', '오늘 서로 다른 2과목 공부하기', 'daySubjects', 2, { gold: 30, exp: 10 }),
  D('d_records3', '꾸준한 기록', '오늘 공부 기록 3번 남기기', 'dayRecords', 3, { gold: 30, items: [['p_mana', 1]] }),
  D('d_monster1', '첫 사냥', '오늘 몬스터 1마리 처치하기', 'dayMonsters', 1, { gold: 20, items: [['p_small', 1]] }),
  D('d_monster5', '사냥꾼의 하루', '오늘 몬스터 5마리 처치하기', 'dayMonsters', 5, { gold: 60, exp: 20 }),
  D('d_floor1', '한 층 더 위로', '오늘 탑 1개 층 돌파하기', 'dayFloors', 1, { gold: 40, exp: 15 }),

  // ── Long-term achievements ──
  A('a_h10', '공부의 첫걸음', '누적 공부 10시간', 'totalStudyHours', 10, { gold: 150, items: [['chest_bronze', 1]] }),
  A('a_h50', '성실한 학생', '누적 공부 50시간', 'totalStudyHours', 50, { gold: 400, items: [['chest_silver', 1]] }),
  A('a_h100', '백 시간의 벽', '누적 공부 100시간', 'totalStudyHours', 100, { gold: 800, exp: 300, items: [['chest_silver', 2]] }),
  A('a_h250', '학문의 탐구자', '누적 공부 250시간', 'totalStudyHours', 250, { gold: 1500, exp: 600, items: [['chest_gold', 1]] }),
  A('a_h500', '오백 시간의 현자', '누적 공부 500시간', 'totalStudyHours', 500, { gold: 3000, exp: 1200, items: [['chest_gold', 2]] }),
  A('a_h1000', '천 시간의 전설', '누적 공부 1000시간', 'totalStudyHours', 1000, { gold: 8000, exp: 3000, items: [['chest_gold', 3]] }),
  A('a_lv5', '견습 모험가', '레벨 5 달성', 'level', 5, { gold: 100, items: [['p_mid', 2]] }),
  A('a_lv10', '어엿한 모험가', '레벨 10 달성', 'level', 10, { gold: 250, items: [['chest_bronze', 2]] }),
  A('a_lv20', '숙련자', '레벨 20 달성', 'level', 20, { gold: 600, items: [['chest_silver', 1]] }),
  A('a_lv30', '베테랑', '레벨 30 달성', 'level', 30, { gold: 1200, items: [['chest_silver', 2]] }),
  A('a_lv50', '살아있는 전설', '레벨 50 달성', 'level', 50, { gold: 3000, items: [['chest_gold', 2]] }),
  A('a_m10', '초보 사냥꾼', '몬스터 10마리 처치', 'monstersTotal', 10, { gold: 80 }),
  A('a_m100', '백전노장', '몬스터 100마리 처치', 'monstersTotal', 100, { gold: 500, items: [['chest_silver', 1]] }),
  A('a_m500', '학살자', '몬스터 500마리 처치', 'monstersTotal', 500, { gold: 1500, items: [['chest_gold', 1]] }),
  A('a_f4', '죽음을 넘어서', '탑 4층 돌파 (사신 격파)', 'highestFloor', 4, { gold: 120, items: [['p_mid', 2]] }),
  A('a_f7', '행운의 사나이', '탑 7층 돌파 (행운의 전당)', 'highestFloor', 7, { gold: 177, items: [['s_gold', 2]] }),
  A('a_f10', '고블린 킹 토벌', '탑 10층 돌파', 'highestFloor', 10, { gold: 300, items: [['chest_bronze', 1]] }),
  A('a_f13', '금기를 깬 자', '탑 13층 돌파', 'highestFloor', 13, { gold: 1313, items: [['chest_silver', 1]] }),
  A('a_f25', '중층의 정복자', '탑 25층 돌파', 'highestFloor', 25, { gold: 800, items: [['chest_silver', 2]] }),
  A('a_f50', '탑의 심장부', '탑 50층 돌파', 'highestFloor', 50, { gold: 2500, items: [['chest_gold', 1]] }),
  A('a_f100', '정상에 서다', '탑 100층 돌파', 'highestFloor', 100, { gold: 10000, items: [['chest_gold', 3]] }),
  A('a_s3', '사흘의 약속', '3일 연속 목표 달성', 'streak', 3, { gold: 100, stamina: 5 }),
  A('a_s7', '일주일의 기적', '7일 연속 목표 달성', 'streak', 7, { gold: 350, items: [['chest_bronze', 1]] }),
  A('a_s30', '습관의 완성', '30일 연속 목표 달성', 'streak', 30, { gold: 2000, items: [['chest_gold', 1]] }),
  A('a_g10', '운명을 건 자', '가챠 10회', 'gachaTotal', 10, { gold: 150 }),
  A('a_b5', '보스 헌터', '보스 5종 격파', 'bossesTotal', 5, { gold: 700, items: [['chest_silver', 1]] }),
  A('a_u5', '대장장이의 친구', '장비 강화 5회 성공', 'upgrades', 5, { gold: 200 }),
  A('a_sub5', '다재다능', '5개 이상의 과목 공부하기', 'subjectsStudied', 5, { gold: 200, exp: 50 }),
];
