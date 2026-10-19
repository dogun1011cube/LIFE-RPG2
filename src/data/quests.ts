import type { QuestDef } from '../game/types';

// Quests unlock sequentially in this order.
export const QUESTS: QuestDef[] = [
  {
    id: 'q1_first_contact',
    name: '첫 접촉',
    summary: '착륙선에서 나와 제네시스 전초기지를 찾고 기초 자원을 확보하세요.',
    hint: '북쪽의 전초기지로 이동하고, 회색 철광석과 주황색 구리 광상을 E 키로 채집하세요.',
    objectives: [
      { type: 'reach', zone: 'outpost', label: '제네시스 전초기지 발견' },
      { type: 'collect', resource: 'iron', amount: 10, label: '철광석 채집' },
      { type: 'collect', resource: 'copper', amount: 5, label: '구리 광석 채집' },
    ],
    reward: { xp: 50, stacks: { gold: 30, research: 5, iron: 5 } },
  },
  {
    id: 'q2_restore_power',
    name: '전력 복구',
    summary: '전초기지의 연구소가 정전 상태입니다. 발전기를 건설해 전력을 복구하세요.',
    hint: 'B 키로 건설 모드에 들어가 발전기를 선택하고 기지 구역에 설치하세요.',
    objectives: [
      { type: 'build', building: 'power_generator', amount: 1, label: '발전기 건설' },
      { type: 'condition', condition: 'labPowered', label: '연구소 전력 공급' },
    ],
    reward: { xp: 60, stacks: { iron: 15, copper: 10, silicon: 10 } },
  },
  {
    id: 'q3_first_discovery',
    name: '첫 번째 발견',
    summary: '연구 데이터를 모아 첫 기술을 완성하세요.',
    hint: '서쪽의 탐사선 잔해를 회수하거나 슬라임을 처치하면 연구 데이터를 얻습니다. K 키로 연구 트리를 여세요.',
    objectives: [
      { type: 'collect', resource: 'research', amount: 10, label: '연구 데이터 수집' },
      { type: 'research', tech: 'any', label: '기술 연구 완료' },
    ],
    reward: { xp: 80, stacks: { gold: 40, research: 10, silicon: 10 } },
  },
  {
    id: 'q4_automation',
    name: '자동화',
    summary: '자동 채굴 기술을 확보하고 광맥 위에 자동 채굴기를 가동하세요.',
    hint: '기초 반도체 → 자동 채굴 순서로 연구하세요. 작업장에서 자동 채굴 부품을 제작하고, 전력이 충분한지 확인하세요.',
    objectives: [
      { type: 'research', tech: 'automated_mining', label: '자동 채굴 연구' },
      { type: 'build', building: 'auto_miner', amount: 1, label: '자동 채굴기 건설' },
      { type: 'produce', building: 'auto_miner', amount: 5, label: '자동 채굴로 자원 생산' },
    ],
    reward: { xp: 120, stacks: { gold: 60, alloy: 6, research: 10 } },
  },
  {
    id: 'q5_dangerous_territory',
    name: '위험 지역',
    summary: '북쪽 타락 지대에 진입해 수호자를 쓰러뜨리고 희귀 부품을 회수하세요.',
    hint: '환경 보호 모듈(고급 장비 연구)과 강한 무기를 준비하세요. 응급 치료 팩은 Q 키로 사용합니다.',
    objectives: [
      { type: 'reach', zone: 'corruption', label: '타락 지대 진입' },
      { type: 'kill', enemy: 'guardian', amount: 1, label: '타락한 수호자 처치' },
      { type: 'condition', condition: 'hasItem:ancient_core', label: '고대 코어 회수' },
    ],
    reward: { xp: 300, stacks: { gold: 200, research: 30 } },
  },
  {
    id: 'q6_genesis',
    name: '제네시스',
    summary: '고대 코어를 분석해 항성 공학을 연구하고 제네시스 신호탑을 세우세요.',
    hint: '항성 공학 개론은 고급 전력 분배와 지능형 생산 관리가 필요합니다.',
    objectives: [
      { type: 'research', tech: 'stellar_engineering', label: '항성 공학 개론 연구' },
      { type: 'build', building: 'genesis_beacon', amount: 1, label: '제네시스 신호탑 건설' },
    ],
    reward: { xp: 500, stacks: { gold: 500 } },
  },
];
