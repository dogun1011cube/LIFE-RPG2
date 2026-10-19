import type { ItemDef } from '../game/types';

export const ITEMS: Record<string, ItemDef> = {
  // ---- Weapons
  rusty_blade: {
    id: 'rusty_blade',
    name: '탐사용 마체테',
    description: '착륙선에 비치된 기본 근접 무기.',
    category: 'equipment',
    slot: 'weapon',
    color: '#9aa5b1',
    stats: { attack: 4 },
  },
  reinforced_sword: {
    id: 'reinforced_sword',
    name: '강화 철검',
    description: '철 프레임에 구리 전극을 두른 검.',
    category: 'equipment',
    slot: 'weapon',
    color: '#c9d3df',
    stats: { attack: 10 },
  },
  alloy_blade: {
    id: 'alloy_blade',
    name: '합금 블레이드',
    description: '고강도 합금으로 단조한 날. 결정 슬라임에게 효과적.',
    category: 'equipment',
    slot: 'weapon',
    color: '#7cf0b5',
    stats: { attack: 18 },
  },
  plasma_blade: {
    id: 'plasma_blade',
    name: '플라즈마 블레이드',
    description: '에너지 셀로 플라즈마 칼날을 형성하는 최첨단 무기.',
    category: 'equipment',
    slot: 'weapon',
    color: '#5ef2ff',
    stats: { attack: 30 },
  },
  // ---- Armor
  basic_armor: {
    id: 'basic_armor',
    name: '기본 방호복',
    description: '철판을 덧댄 현장용 방호복.',
    category: 'equipment',
    slot: 'armor',
    color: '#a9b4c2',
    stats: { defense: 3, maxHp: 20 },
  },
  composite_armor: {
    id: 'composite_armor',
    name: '복합 장갑',
    description: '합금과 실리콘 층을 겹친 경량 장갑.',
    category: 'equipment',
    slot: 'armor',
    color: '#7cf0b5',
    stats: { defense: 7, maxHp: 50 },
  },
  // ---- Tools
  improved_pickaxe: {
    id: 'improved_pickaxe',
    name: '개량 채굴 도구',
    description: '채집 시 자원을 1개 더 얻습니다.',
    category: 'equipment',
    slot: 'tool',
    color: '#e0874a',
    stats: { miningYield: 1 },
  },
  precision_drill: {
    id: 'precision_drill',
    name: '정밀 채굴 드릴',
    description: '반도체 제어 드릴. 채집 시 자원을 3개 더 얻습니다.',
    category: 'equipment',
    slot: 'tool',
    color: '#8fd3ff',
    stats: { miningYield: 3 },
  },
  // ---- Modules
  hazard_module: {
    id: 'hazard_module',
    name: '환경 보호 모듈',
    description: '타락 지대의 부식성 에너지를 차단합니다.',
    category: 'equipment',
    slot: 'module',
    color: '#b18cff',
    stats: { hazardProtection: true, defense: 2 },
  },
  // ---- Materials
  mining_component: {
    id: 'mining_component',
    name: '자동 채굴 부품',
    description: '자동 채굴기 건설에 필요한 제어 드릴 유닛.',
    category: 'material',
    color: '#f2c14e',
  },
  ancient_core: {
    id: 'ancient_core',
    name: '고대 코어',
    description: '타락한 수호자에게서 회수한 미지의 에너지 결정. 항성 공학의 열쇠.',
    category: 'material',
    color: '#ff7ad9',
  },
  // ---- Consumables
  med_pack: {
    id: 'med_pack',
    name: '응급 치료 팩',
    description: '사용 시 체력을 60 회복합니다. (Q 키)',
    category: 'consumable',
    color: '#ff6b6b',
    heal: 60,
  },
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}
