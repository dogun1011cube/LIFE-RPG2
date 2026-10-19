import type { ResourceDef, ResourceId } from '../game/types';

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  gold: {
    id: 'gold',
    name: '골드',
    short: 'G',
    description: '교역과 훈련, 일부 건설에 쓰이는 범용 화폐.',
    color: '#f2c14e',
    capped: false,
  },
  iron: {
    id: 'iron',
    name: '철광석',
    short: '철',
    description: '대부분의 구조물과 장비의 기본 재료.',
    color: '#a9b4c2',
    capped: true,
  },
  copper: {
    id: 'copper',
    name: '구리 광석',
    short: '구리',
    description: '전력 설비와 회로에 필요한 전도성 금속.',
    color: '#e0874a',
    capped: true,
  },
  silicon: {
    id: 'silicon',
    name: '실리콘',
    short: 'Si',
    description: '반도체와 제어 시스템의 핵심 원료.',
    color: '#8fd3ff',
    capped: true,
  },
  energy: {
    id: 'energy',
    name: '에너지',
    short: 'E',
    description: '잉여 전력이 저장된 에너지. 전력 부족 시 자동으로 방전됩니다.',
    color: '#5ef2ff',
    capped: true,
  },
  research: {
    id: 'research',
    name: '연구 데이터',
    short: 'RD',
    description: '탐사, 잔해 회수, 전투에서 얻는 과학 데이터.',
    color: '#b18cff',
    capped: true,
  },
  alloy: {
    id: 'alloy',
    name: '합금 부품',
    short: '합금',
    description: '제련소에서 생산되는 고강도 부품.',
    color: '#7cf0b5',
    capped: true,
  },
};

export const RESOURCE_ORDER: ResourceId[] = ['gold', 'iron', 'copper', 'silicon', 'alloy', 'research', 'energy'];

export function isResourceId(id: string): id is ResourceId {
  return id in RESOURCES;
}
