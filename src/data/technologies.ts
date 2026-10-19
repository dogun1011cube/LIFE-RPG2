import type { TechBranch, TechnologyDef } from '../game/types';

export const TECH_BRANCHES: { id: TechBranch; name: string; color: string }[] = [
  { id: 'energy', name: '물리 · 에너지', color: '#5ef2ff' },
  { id: 'materials', name: '화학 · 소재', color: '#7cf0b5' },
  { id: 'electronics', name: '반도체 · 전자', color: '#8fd3ff' },
  { id: 'automation', name: 'AI · 자동화', color: '#f2c14e' },
  { id: 'engineering', name: '탐사 · 공학', color: '#ff9a6b' },
];

export const TECHNOLOGIES: Record<string, TechnologyDef> = {
  // ---------------- Physics & Energy
  improved_generators: {
    id: 'improved_generators',
    name: '개량 발전기',
    branch: 'energy',
    tier: 0,
    description: '터빈 효율을 개선해 모든 발전기의 출력을 30% 높입니다. 발전기 증폭 코일 제작법도 해금됩니다.',
    cost: { research: 8, copper: 8 },
    points: 15,
    prerequisites: [],
    effects: [
      { type: 'modifier', key: 'generatorOutput', value: 0.3, label: '발전 출력 +30%' },
      { type: 'unlockRecipe', recipe: 'generator_coil' },
    ],
  },
  energy_storage: {
    id: 'energy_storage',
    name: '에너지 저장',
    branch: 'energy',
    tier: 1,
    description: '대용량 배터리 셀을 설계합니다.',
    cost: { research: 15, copper: 15, silicon: 5 },
    points: 25,
    prerequisites: ['improved_generators'],
    effects: [{ type: 'unlockBuilding', building: 'battery_bank' }],
  },
  advanced_power: {
    id: 'advanced_power',
    name: '고급 전력 분배',
    branch: 'energy',
    tier: 2,
    description: '플라즈마 격리 기술과 고효율 송전망. 플라즈마 발전기를 해금합니다.',
    cost: { research: 35, alloy: 10, silicon: 15 },
    points: 45,
    prerequisites: ['energy_storage', 'improved_alloys'],
    effects: [{ type: 'unlockBuilding', building: 'plasma_generator' }],
  },
  // ---------------- Chemistry & Materials
  improved_alloys: {
    id: 'improved_alloys',
    name: '개량 합금',
    branch: 'materials',
    tier: 0,
    description: '철-구리 합금 공정. 합금 제련소와 합금 블레이드를 해금합니다.',
    cost: { research: 10, iron: 20 },
    points: 20,
    prerequisites: [],
    effects: [
      { type: 'unlockBuilding', building: 'smelter' },
      { type: 'unlockRecipe', recipe: 'alloy_blade' },
    ],
  },
  composite_materials: {
    id: 'composite_materials',
    name: '고급 복합 소재',
    branch: 'materials',
    tier: 1,
    description: '적층 복합재로 장갑과 저장 설비를 강화합니다.',
    cost: { research: 30, alloy: 12 },
    points: 40,
    prerequisites: ['improved_alloys'],
    effects: [
      { type: 'unlockRecipe', recipe: 'composite_armor' },
      { type: 'modifier', key: 'storageCapacity', value: 0.5, label: '저장 한도 +50%' },
    ],
  },
  // ---------------- Semiconductors & Electronics
  basic_semiconductors: {
    id: 'basic_semiconductors',
    name: '기초 반도체 제조',
    branch: 'electronics',
    tier: 0,
    description: '실리콘 웨이퍼 정제 공정. 정밀 채굴 드릴을 해금하고 자동화 연구의 토대가 됩니다.',
    cost: { research: 10, silicon: 10, copper: 5 },
    points: 20,
    prerequisites: [],
    effects: [{ type: 'unlockRecipe', recipe: 'precision_drill' }],
  },
  advanced_control: {
    id: 'advanced_control',
    name: '고급 제어 시스템',
    branch: 'electronics',
    tier: 2,
    description: '실시간 제어 회로. 방어 포탑을 해금하고 자동 채굴기 속도를 25% 높입니다.',
    cost: { research: 25, silicon: 15, alloy: 5 },
    points: 35,
    prerequisites: ['automated_mining'],
    effects: [
      { type: 'unlockBuilding', building: 'defense_turret' },
      { type: 'modifier', key: 'minerSpeed', value: 0.25, label: '자동 채굴 속도 +25%' },
    ],
  },
  // ---------------- AI & Automation
  automated_mining: {
    id: 'automated_mining',
    name: '자동 채굴',
    branch: 'automation',
    tier: 1,
    description: '자율 드릴 유닛. 자동 채굴기와 자동 채굴 부품 제작법을 해금합니다.',
    cost: { research: 15, iron: 15, silicon: 5 },
    points: 25,
    prerequisites: ['basic_semiconductors'],
    effects: [
      { type: 'unlockBuilding', building: 'auto_miner' },
      { type: 'unlockRecipe', recipe: 'mining_component' },
    ],
  },
  intelligent_production: {
    id: 'intelligent_production',
    name: '지능형 생산 관리',
    branch: 'automation',
    tier: 3,
    description: 'ORION 보조 스케줄러. 모든 생산 속도 +30%, 생산 설비 전력 소비 -20%.',
    cost: { research: 45, alloy: 15, silicon: 20 },
    points: 50,
    prerequisites: ['advanced_control'],
    effects: [
      { type: 'modifier', key: 'productionSpeed', value: 0.3, label: '생산 속도 +30%' },
      { type: 'modifier', key: 'productionPowerUse', value: -0.2, label: '생산 설비 전력 -20%' },
    ],
  },
  // ---------------- Exploration & Engineering
  research_infrastructure: {
    id: 'research_infrastructure',
    name: '연구 인프라 개선',
    branch: 'engineering',
    tier: 1,
    description: '데이터 처리 파이프라인을 정비해 연구 속도를 50% 높입니다.',
    cost: { research: 18, copper: 15, silicon: 10 },
    points: 30,
    prerequisites: ['basic_semiconductors'],
    effects: [{ type: 'modifier', key: 'researchSpeed', value: 0.5, label: '연구 속도 +50%' }],
  },
  advanced_equipment: {
    id: 'advanced_equipment',
    name: '고급 장비',
    branch: 'engineering',
    tier: 2,
    description: '위험 지역 탐사 장비. 환경 보호 모듈과 플라즈마 블레이드를 해금합니다.',
    cost: { research: 25, alloy: 8 },
    points: 30,
    prerequisites: ['improved_alloys', 'basic_semiconductors'],
    effects: [
      { type: 'unlockRecipe', recipe: 'hazard_module' },
      { type: 'unlockRecipe', recipe: 'plasma_blade' },
    ],
  },
  stellar_engineering: {
    id: 'stellar_engineering',
    name: '항성 공학 개론',
    branch: 'engineering',
    tier: 4,
    description: '고대 코어를 분석해 행성 규모의 공학으로 나아갑니다. 제네시스 신호탑을 해금합니다.',
    cost: { research: 80, alloy: 20, ancient_core: 1 },
    points: 60,
    prerequisites: ['advanced_power', 'intelligent_production'],
    effects: [{ type: 'unlockBuilding', building: 'genesis_beacon' }],
  },
};

export function getTech(id: string): TechnologyDef | undefined {
  return TECHNOLOGIES[id];
}
