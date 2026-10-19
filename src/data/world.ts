import type { EnemySpawn, OreVein, ResourceNodeDef, ZoneDef } from '../game/types';

// Static world layout. +x = east, -z = north.

export const WORLD_RADIUS = 122;
export const BUILD_ZONE = { center: [0, 0] as [number, number], radius: 44 };
export const PLAYER_START: [number, number] = [4, 40];
export const OUTPOST_RESPAWN: [number, number] = [2, 8];

export const ZONES: ZoneDef[] = [
  { id: 'outpost', name: '제네시스 전초기지', center: [0, 0], radius: 16, danger: 0 },
  { id: 'meadow', name: '녹색 초원', center: [72, 6], radius: 26, danger: 1 },
  { id: 'wreck', name: '추락한 탐사선', center: [-66, 30], radius: 16, danger: 1 },
  { id: 'ridge', name: '결정 능선', center: [-62, -52], radius: 22, danger: 2 },
  { id: 'corruption', name: '타락 지대', center: [14, -98], radius: 26, danger: 3, hazard: true },
];

export const ORE_VEINS: OreVein[] = [
  { id: 'vein_iron', resource: 'iron', position: [-26, 10], radius: 4.5 },
  { id: 'vein_copper', resource: 'copper', position: [24, 18], radius: 4.5 },
  { id: 'vein_silicon', resource: 'silicon', position: [-16, -30], radius: 4.5 },
];

export const RESOURCE_NODES: ResourceNodeDef[] = [
  // Around the landing site / outpost outskirts
  { id: 'n_iron_1', kind: 'iron', position: [-8, 34], charges: 3, regenTime: 60 },
  { id: 'n_iron_2', kind: 'iron', position: [14, 30], charges: 3, regenTime: 60 },
  { id: 'n_iron_3', kind: 'iron', position: [-34, 26], charges: 3, regenTime: 70 },
  { id: 'n_iron_4', kind: 'iron', position: [-48, 4], charges: 4, regenTime: 80 },
  { id: 'n_iron_5', kind: 'iron', position: [46, 34], charges: 4, regenTime: 80 },
  { id: 'n_copper_1', kind: 'copper', position: [20, 40], charges: 3, regenTime: 60 },
  { id: 'n_copper_2', kind: 'copper', position: [38, -14], charges: 3, regenTime: 70 },
  { id: 'n_copper_3', kind: 'copper', position: [56, 26], charges: 4, regenTime: 80 },
  { id: 'n_copper_4', kind: 'copper', position: [86, -12], charges: 4, regenTime: 80 },
  { id: 'n_silicon_1', kind: 'silicon', position: [-30, -40], charges: 3, regenTime: 70 },
  { id: 'n_silicon_2', kind: 'silicon', position: [-52, -40], charges: 4, regenTime: 80 },
  { id: 'n_silicon_3', kind: 'silicon', position: [-70, -60], charges: 4, regenTime: 90 },
  { id: 'n_silicon_4', kind: 'silicon', position: [-46, -66], charges: 4, regenTime: 90 },
  { id: 'n_silicon_5', kind: 'silicon', position: [28, -46], charges: 3, regenTime: 80 },
  // Crashed survey ship wreckage (research data + alloy)
  { id: 'n_wreck_1', kind: 'wreck', position: [-60, 24], charges: 2, regenTime: 150 },
  { id: 'n_wreck_2', kind: 'wreck', position: [-72, 34], charges: 2, regenTime: 150 },
  { id: 'n_wreck_3', kind: 'wreck', position: [-64, 40], charges: 2, regenTime: 150 },
  { id: 'n_wreck_4', kind: 'wreck', position: [-10, 46], charges: 1, regenTime: 200 },
  { id: 'n_wreck_5', kind: 'wreck', position: [78, 20], charges: 2, regenTime: 180 },
  { id: 'n_wreck_6', kind: 'wreck', position: [2, -78], charges: 3, regenTime: 200 },
];

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { id: 'e_meadow_1', type: 'slime', position: [64, 2], zone: 'meadow' },
  { id: 'e_meadow_2', type: 'slime', position: [72, 14], zone: 'meadow' },
  { id: 'e_meadow_3', type: 'slime', position: [80, 0], zone: 'meadow' },
  { id: 'e_meadow_4', type: 'slime', position: [70, -10], zone: 'meadow' },
  { id: 'e_meadow_5', type: 'slime', position: [86, 16], zone: 'meadow' },
  { id: 'e_out_1', type: 'slime', position: [48, -32], zone: 'outskirts' },
  { id: 'e_out_2', type: 'slime', position: [-20, 56], zone: 'outskirts' },
  { id: 'e_wreck_1', type: 'slime', position: [-58, 34], zone: 'wreck' },
  { id: 'e_wreck_2', type: 'slime', position: [-74, 26], zone: 'wreck' },
  { id: 'e_ridge_1', type: 'crystal_slime', position: [-58, -50], zone: 'ridge' },
  { id: 'e_ridge_2', type: 'crystal_slime', position: [-68, -44], zone: 'ridge' },
  { id: 'e_ridge_3', type: 'crystal_slime', position: [-64, -64], zone: 'ridge' },
  { id: 'e_void_1', type: 'void_slime', position: [0, -90], zone: 'corruption' },
  { id: 'e_void_2', type: 'void_slime', position: [26, -92], zone: 'corruption' },
  { id: 'e_void_3', type: 'void_slime', position: [8, -112], zone: 'corruption' },
  { id: 'e_boss', type: 'guardian', position: [16, -104], zone: 'corruption' },
];

export interface SignDef {
  id: string;
  position: [number, number];
  /** direction the sign faces (yaw) */
  yaw: number;
  title: string;
  text: string;
}

export const SIGNS: SignDef[] = [
  {
    id: 'sign_landing',
    position: [8, 34],
    yaw: 0,
    title: '낙하 지점 안내',
    text: '제네시스 전초기지는 북쪽 30m. 주변의 철광석(회색)과 구리(주황) 광상을 E 키로 채집할 수 있습니다.',
  },
  {
    id: 'sign_east',
    position: [42, 4],
    yaw: -Math.PI / 2,
    title: '동쪽: 녹색 초원',
    text: '슬라임 서식지. 처치하면 골드와 연구 데이터를 얻을 수 있습니다. 체력이 낮으면 기지로 돌아오세요.',
  },
  {
    id: 'sign_west',
    position: [-40, 20],
    yaw: Math.PI / 2,
    title: '서쪽: 추락한 탐사선',
    text: '선행 탐사대의 잔해. 빛나는 기술 잔해에서 연구 데이터와 합금 부품을 회수할 수 있습니다.',
  },
  {
    id: 'sign_north',
    position: [6, -52],
    yaw: Math.PI,
    title: '경고: 타락 지대',
    text: '북쪽은 부식성 에너지로 오염된 지역입니다. 환경 보호 모듈 없이 진입하면 지속 피해를 입습니다. 수호자 개체가 감지되었습니다.',
  },
  {
    id: 'sign_ridge',
    position: [-36, -34],
    yaw: Math.PI * 0.75,
    title: '북서쪽: 결정 능선',
    text: '실리콘 광상이 풍부한 능선. 단단한 결정 슬라임이 서식합니다.',
  },
];

/** Outpost static structures (rendered in world/Outpost.tsx). Circle colliders. */
export const OUTPOST_COLLIDERS: { x: number; z: number; r: number }[] = [
  { x: 0, z: -12, r: 6.2 }, // HQ tower
  { x: 12, z: -12, r: 3.6 }, // comms dish
  { x: 4, z: 46, r: 2.6 }, // drop pod
];

export const TERMINAL_POS: [number, number] = [5, -4];
export const NPC_POS: [number, number] = [-4, -4];
export const PREBUILT_LAB_POS: [number, number] = [-12, -2];

/** Ancient spire landmark (far north, outside the playable boundary) */
export const SPIRE_POS: [number, number] = [-30, -250];
