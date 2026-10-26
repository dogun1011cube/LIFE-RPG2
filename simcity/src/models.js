// 블록 정의와 건물/나무 복셀 모델 (정면 = +z, 타일 한 칸 = 4x4 복셀)
import { VoxelModel, meshVoxels } from './voxel.js';
import { VOXEL } from './config.js';

const one = (t) => ({ top: t, side: t, bottom: t });
const win = (wall, w) => ({ top: wall, side: w, bottom: wall });

export const BLOCKS = {
  log: { top: 'log_top', side: 'log_side', bottom: 'log_top' },
  birch_log: { top: 'log_top', side: 'birch_side', bottom: 'log_top' },
  leaves: one('leaves'), leaves_pine: one('leaves_pine'), leaves_birch: one('leaves_birch'), hedge: one('hedge'),
  stone: one('stone'), cobble: one('cobble'),
  planks: one('planks'), planks_dark: one('planks_dark'), plank_win: win('planks', 'plank_win'),
  brick: one('brick'), brick_win: win('brick', 'brick_win'),
  plaster: one('plaster'), plaster_win: win('plaster', 'plaster_win'),
  plaster_yellow: one('plaster_yellow'), plaster_yellow_win: win('plaster_yellow', 'plaster_yellow_win'),
  concrete: one('concrete'), concrete_dark: one('concrete_dark'), gravel: one('gravel'),
  concrete_win: win('concrete', 'concrete_win'), concrete_win_lit: win('concrete', 'concrete_win_lit'),
  roof_red: one('roof_red'), roof_brown: one('roof_brown'), roof_blue: one('roof_blue'), roof_green: one('roof_green'),
  glass_blue: win('concrete_dark', 'glass_blue'), glass_green: win('concrete_dark', 'glass_green'), glass_dark: win('concrete_dark', 'glass_dark'),
  metal: one('metal'), metal_blue: one('metal_blue'), metal_dark: one('metal_dark'),
  stripe: one('stripe'), tank: one('tank'),
  stack: { top: 'stack_top', side: 'smokestack', bottom: 'smokestack' },
  sign: one('sign'), crate: one('crate'),
  garage: win('concrete', 'garage'), vent: { top: 'vent', side: 'metal', bottom: 'metal' },
  door: win('planks_dark', 'door'), shop: win('plaster', 'shop'),
  awning_red: one('awning_red'), awning_blue: one('awning_blue'), awning_green: one('awning_green'),
};

// 고층 건물 창문에 불 켜진 칸 섞기
function sprinkleLit(m, every = 5) {
  for (let i = 0; i < m.data.length; i++) {
    if (m.data[i] === 'concrete_win' && (i * 7919) % every === 0) m.data[i] = 'concrete_win_lit';
  }
}

// ---------------- 주거 ----------------
const R1 = [
  ['목조 주택', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 3, 1, 2, 'planks').windows(0, 1, 0, 3, 1, 2, 'plank_win');
    m.set(1, 0, 2, 'door');
    m.fill(0, 2, 0, 3, 2, 2, 'roof_red').fill(0, 3, 1, 3, 3, 1, 'roof_red');
    m.set(3, 3, 0, 'brick').set(3, 4, 0, 'brick');
    m.set(0, 0, 3, 'hedge').set(3, 0, 3, 'hedge');
    return m;
  }],
  ['흰 벽 주택', () => {
    const m = new VoxelModel(4, 4, 4);
    m.fill(0, 0, 0, 2, 1, 2, 'plaster').windows(0, 1, 0, 2, 1, 2, 'plaster_win');
    m.set(1, 0, 2, 'door');
    m.fill(0, 2, 0, 2, 2, 2, 'roof_brown').fill(1, 3, 0, 1, 3, 2, 'roof_brown');
    m.fill(3, 0, 0, 3, 0, 2, 'hedge');
    return m;
  }],
  ['벽돌 주택', () => {
    const m = new VoxelModel(4, 4, 4);
    m.fill(0, 0, 1, 3, 1, 3, 'brick').windows(0, 1, 1, 3, 1, 3, 'brick_win');
    m.set(2, 0, 3, 'door').set(1, 0, 3, 'brick_win');
    m.fill(0, 2, 1, 3, 2, 3, 'roof_blue').fill(0, 3, 2, 3, 3, 2, 'roof_blue');
    m.set(0, 0, 0, 'hedge').set(3, 0, 0, 'hedge');
    return m;
  }],
  ['노란 주택', () => {
    const m = new VoxelModel(4, 4, 4);
    m.fill(1, 0, 0, 3, 1, 2, 'plaster_yellow').windows(1, 1, 0, 3, 1, 2, 'plaster_yellow_win');
    m.set(2, 0, 2, 'door');
    m.fill(1, 2, 0, 3, 2, 2, 'roof_green').fill(2, 3, 0, 2, 3, 2, 'roof_green');
    m.set(0, 0, 3, 'hedge').set(0, 0, 0, 'leaves').set(0, 1, 0, 'leaves');
    return m;
  }],
];

const R2 = [
  ['벽돌 아파트', () => {
    const m = new VoxelModel(4, 6, 4);
    m.fill(0, 0, 0, 3, 3, 3, 'brick').windows(0, 0, 0, 3, 3, 3, 'brick_win');
    m.set(1, 0, 3, 'door');
    m.fill(0, 4, 0, 3, 4, 3, 'concrete').fill(1, 4, 1, 2, 4, 2, 'gravel');
    m.set(1, 5, 1, 'vent');
    return m;
  }],
  ['빌라', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 3, 2, 2, 'plaster').windows(0, 0, 0, 3, 2, 2, 'plaster_win');
    m.set(1, 0, 2, 'door');
    m.fill(0, 3, 0, 3, 3, 2, 'roof_red').fill(0, 4, 1, 3, 4, 1, 'roof_red');
    m.set(0, 0, 3, 'hedge').set(3, 0, 3, 'hedge');
    return m;
  }],
  ['타운하우스', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 1, 2, 2, 'brick');
    m.fill(0, 1, 2, 1, 2, 2, 'brick_win').set(0, 1, 1, 'brick_win').set(0, 2, 1, 'brick_win');
    m.set(0, 0, 2, 'door').set(1, 0, 2, 'brick_win');
    m.fill(0, 3, 0, 1, 3, 2, 'roof_brown');
    m.fill(2, 0, 0, 3, 3, 2, 'plaster_yellow');
    m.fill(2, 1, 2, 3, 3, 2, 'plaster_yellow_win').fill(3, 1, 1, 3, 3, 1, 'plaster_yellow_win');
    m.set(3, 0, 2, 'door').set(2, 0, 2, 'plaster_yellow_win');
    m.fill(2, 4, 0, 3, 4, 2, 'roof_red');
    m.set(0, 0, 3, 'hedge');
    return m;
  }],
  ['모던 빌라', () => {
    const m = new VoxelModel(4, 6, 4);
    m.fill(0, 0, 0, 3, 4, 3, 'concrete').windows(0, 1, 0, 3, 4, 3, 'concrete_win');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'shop');
    m.fill(0, 5, 0, 3, 5, 3, 'concrete_dark').fill(1, 5, 1, 2, 5, 2, 'hedge');
    sprinkleLit(m, 4);
    return m;
  }],
];

const R3 = [
  ['콘크리트 아파트', () => {
    const H = 14;
    const m = new VoxelModel(4, H + 3, 4);
    m.fill(0, 0, 0, 3, H - 1, 3, 'concrete').windows(0, 1, 0, 3, H - 1, 3, 'concrete_win', (y) => y % 4 !== 0);
    m.set(1, 0, 3, 'shop').set(2, 0, 3, 'door');
    m.fill(0, H, 0, 3, H, 3, 'concrete_dark').fill(1, H, 1, 2, H, 2, 'gravel');
    m.set(1, H + 1, 1, 'tank').set(1, H + 2, 1, 'tank').set(2, H + 1, 2, 'vent');
    sprinkleLit(m, 6);
    return m;
  }],
  ['유리 타워', () => {
    const m = new VoxelModel(4, 21, 4);
    m.fill(0, 0, 0, 3, 1, 3, 'concrete').windows(0, 0, 0, 3, 0, 3, 'shop');
    m.set(1, 0, 3, 'door');
    m.fill(1, 2, 1, 2, 17, 2, 'glass_green');
    m.fill(1, 18, 1, 2, 18, 2, 'concrete_dark');
    m.fill(1, 19, 1, 1, 20, 1, 'metal_dark');
    m.set(0, 2, 0, 'hedge').set(3, 2, 3, 'hedge');
    return m;
  }],
  ['벽돌 맨션', () => {
    const H = 12;
    const m = new VoxelModel(4, H + 2, 4);
    m.fill(0, 0, 0, 3, H - 1, 3, 'brick').windows(0, 1, 0, 3, H - 1, 3, 'brick_win');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'door');
    m.fill(0, H, 0, 3, H, 3, 'roof_red').fill(1, H + 1, 1, 2, H + 1, 2, 'roof_red');
    return m;
  }],
];

// ---------------- 상업 ----------------
const C1 = [
  ['모퉁이 상점', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 3, 2, 2, 'plaster').windows(0, 2, 0, 3, 2, 2, 'plaster_win');
    m.fill(1, 0, 2, 3, 0, 2, 'shop').set(0, 0, 2, 'door').set(3, 0, 1, 'shop');
    m.fill(0, 1, 3, 3, 1, 3, 'awning_red');
    m.fill(0, 3, 0, 3, 3, 2, 'concrete');
    m.set(1, 4, 2, 'sign').set(2, 4, 2, 'sign');
    return m;
  }],
  ['벽돌 가게', () => {
    const m = new VoxelModel(4, 4, 4);
    m.fill(0, 0, 0, 3, 2, 2, 'brick').windows(0, 2, 0, 3, 2, 2, 'brick_win');
    m.fill(0, 0, 2, 2, 0, 2, 'shop').set(3, 0, 2, 'door');
    m.fill(0, 1, 3, 3, 1, 3, 'awning_blue');
    m.fill(0, 3, 0, 3, 3, 2, 'roof_brown');
    return m;
  }],
  ['카페', () => {
    const m = new VoxelModel(4, 4, 4);
    m.fill(0, 0, 0, 2, 1, 2, 'planks');
    m.set(0, 0, 2, 'shop').set(1, 0, 2, 'shop').set(2, 0, 2, 'door');
    m.fill(0, 1, 3, 2, 1, 3, 'awning_green');
    m.fill(0, 2, 0, 2, 2, 2, 'roof_red').fill(0, 3, 1, 2, 3, 1, 'roof_red');
    m.fill(3, 0, 0, 3, 0, 1, 'hedge').set(3, 0, 3, 'crate');
    return m;
  }],
];

const C2 = [
  ['유리 오피스', () => {
    const m = new VoxelModel(4, 9, 4);
    m.fill(0, 0, 0, 3, 6, 3, 'glass_blue');
    for (const [x, z] of [[0, 0], [3, 0], [0, 3], [3, 3]]) m.fill(x, 0, z, x, 6, z, 'concrete');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'shop');
    m.fill(0, 7, 0, 3, 7, 3, 'concrete_dark');
    m.set(1, 8, 1, 'vent').set(2, 8, 2, 'vent');
    return m;
  }],
  ['오피스 빌딩', () => {
    const m = new VoxelModel(4, 8, 4);
    m.fill(0, 0, 0, 3, 5, 3, 'concrete').windows(0, 1, 0, 3, 5, 3, 'concrete_win');
    m.set(1, 0, 3, 'shop').set(2, 0, 3, 'shop').set(0, 0, 3, 'door');
    m.fill(0, 6, 0, 3, 6, 3, 'gravel');
    m.set(1, 7, 3, 'sign').set(2, 7, 3, 'sign');
    sprinkleLit(m, 5);
    return m;
  }],
  ['백화점', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 3, 2, 3, 'plaster_yellow');
    m.windows(0, 0, 0, 3, 0, 3, 'shop', () => true, true);
    m.windows(0, 1, 0, 3, 2, 3, 'plaster_yellow_win');
    m.set(1, 0, 3, 'door');
    m.fill(0, 3, 0, 3, 3, 3, 'concrete');
    m.set(1, 4, 1, 'sign').set(2, 4, 1, 'sign').set(2, 4, 2, 'vent');
    return m;
  }],
];

const C3 = [
  ['스카이 타워', () => {
    const m = new VoxelModel(4, 25, 4);
    m.fill(0, 0, 0, 3, 13, 3, 'glass_blue');
    m.fill(0, 5, 0, 3, 5, 3, 'concrete').fill(0, 10, 0, 3, 10, 3, 'concrete');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'shop');
    m.fill(1, 14, 1, 2, 19, 2, 'glass_blue');
    m.fill(1, 20, 1, 2, 20, 2, 'concrete_dark');
    m.fill(1, 21, 1, 1, 24, 1, 'metal_dark');
    return m;
  }],
  ['블랙 타워', () => {
    const m = new VoxelModel(4, 24, 4);
    m.fill(0, 0, 0, 3, 21, 3, 'glass_dark');
    for (let y = 6; y < 22; y += 6) m.fill(0, y, 0, 3, y, 3, 'concrete');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'door');
    m.fill(0, 22, 0, 3, 22, 3, 'concrete_dark');
    m.set(1, 23, 1, 'vent').set(2, 23, 2, 'vent');
    return m;
  }],
  ['계단식 빌딩', () => {
    const m = new VoxelModel(4, 20, 4);
    m.fill(0, 0, 0, 3, 9, 3, 'concrete').windows(0, 1, 0, 3, 9, 3, 'concrete_win');
    m.set(1, 0, 3, 'door').set(2, 0, 3, 'shop');
    m.fill(0, 10, 0, 2, 17, 2, 'glass_green');
    m.fill(0, 18, 0, 2, 18, 2, 'concrete_dark');
    m.set(1, 19, 1, 'tank');
    sprinkleLit(m, 5);
    return m;
  }],
];

// ---------------- 공업 ----------------
const I1 = [
  ['창고', () => {
    const m = new VoxelModel(4, 3, 4);
    m.fill(0, 0, 0, 3, 1, 2, 'metal');
    m.set(1, 0, 2, 'garage').set(2, 0, 2, 'garage');
    m.fill(0, 2, 0, 3, 2, 2, 'metal_dark');
    m.set(0, 0, 3, 'crate').set(3, 0, 3, 'crate').set(3, 1, 3, 'crate');
    return m;
  }],
  ['작업장', () => {
    const m = new VoxelModel(4, 5, 4);
    m.fill(0, 0, 0, 2, 1, 2, 'brick').windows(0, 1, 0, 2, 1, 2, 'brick_win');
    m.set(1, 0, 2, 'garage');
    m.fill(0, 2, 0, 2, 2, 2, 'metal_dark');
    m.fill(3, 0, 0, 3, 3, 0, 'stack');
    m.set(3, 0, 3, 'crate');
    m.smoke.push([3, 4, 0]);
    return m;
  }],
  ['정비소', () => {
    const m = new VoxelModel(4, 3, 4);
    m.fill(0, 0, 0, 3, 1, 1, 'metal_blue');
    m.set(1, 0, 1, 'garage').set(2, 0, 1, 'garage');
    m.fill(0, 2, 0, 3, 2, 1, 'metal_dark');
    m.fill(3, 0, 3, 3, 1, 3, 'tank').set(0, 0, 3, 'crate').set(1, 0, 3, 'stripe');
    return m;
  }],
];

const I2 = [
  ['톱니 지붕 공장', () => {
    const m = new VoxelModel(4, 9, 4);
    m.fill(0, 0, 0, 3, 2, 2, 'metal');
    m.set(1, 0, 2, 'garage').set(2, 0, 2, 'garage');
    m.fill(0, 3, 0, 3, 3, 0, 'metal_dark').fill(0, 3, 2, 3, 3, 2, 'metal_dark');
    m.fill(3, 0, 3, 3, 7, 3, 'stack');
    m.smoke.push([3, 8, 3]);
    return m;
  }],
  ['벽돌 공장', () => {
    const m = new VoxelModel(4, 9, 4);
    m.fill(0, 0, 1, 3, 2, 3, 'brick').windows(0, 1, 1, 3, 2, 3, 'brick_win');
    m.set(1, 0, 3, 'garage').set(2, 0, 3, 'garage');
    m.fill(0, 3, 1, 3, 3, 3, 'metal_dark');
    m.fill(0, 0, 0, 0, 7, 0, 'stack').fill(3, 0, 0, 3, 6, 0, 'stack');
    m.smoke.push([0, 8, 0], [3, 7, 0]);
    return m;
  }],
  ['탱크 시설', () => {
    const m = new VoxelModel(4, 8, 4);
    m.fill(0, 0, 0, 1, 2, 1, 'tank').fill(2, 0, 2, 3, 2, 3, 'tank');
    m.fill(2, 0, 0, 3, 1, 1, 'metal_blue').set(2, 0, 1, 'garage');
    m.fill(0, 1, 2, 1, 1, 2, 'metal_dark');
    m.fill(0, 0, 3, 0, 6, 3, 'stack');
    m.smoke.push([0, 7, 3]);
    return m;
  }],
];

const I3 = [
  ['대형 발전 공장', () => {
    const m = new VoxelModel(4, 13, 4);
    m.fill(0, 0, 0, 3, 3, 3, 'metal_blue');
    m.windows(0, 0, 0, 3, 0, 3, 'stripe', () => true, true);
    m.set(1, 0, 3, 'garage').set(2, 0, 3, 'garage');
    m.fill(0, 4, 0, 3, 4, 3, 'metal_dark');
    m.fill(0, 5, 0, 0, 10, 0, 'stack').fill(3, 5, 0, 3, 9, 0, 'stack');
    m.set(1, 5, 2, 'vent').set(2, 5, 2, 'vent');
    m.smoke.push([0, 11, 0], [3, 10, 0]);
    return m;
  }],
  ['정유 시설', () => {
    const m = new VoxelModel(4, 13, 4);
    m.fill(0, 0, 0, 1, 4, 1, 'tank').fill(2, 0, 0, 3, 3, 1, 'tank');
    m.fill(0, 0, 2, 2, 2, 3, 'metal').set(1, 0, 3, 'garage');
    m.fill(0, 3, 2, 2, 3, 3, 'metal_dark');
    m.fill(3, 0, 3, 3, 11, 3, 'stack');
    m.smoke.push([3, 12, 3]);
    return m;
  }],
  ['중공업 공장', () => {
    const m = new VoxelModel(4, 12, 4);
    m.fill(0, 0, 0, 3, 4, 3, 'metal_dark');
    m.windows(0, 0, 0, 3, 0, 3, 'stripe', () => true, true);
    m.set(1, 0, 3, 'garage').set(2, 0, 3, 'garage');
    m.fill(0, 5, 0, 3, 5, 3, 'concrete_dark');
    m.fill(1, 6, 1, 1, 10, 1, 'stack');
    m.set(3, 6, 3, 'tank').set(2, 6, 3, 'vent');
    m.smoke.push([1, 11, 1]);
    return m;
  }],
];

export const BUILDINGS = {
  1: { 1: R1, 2: R2, 3: R3 },
  2: { 1: C1, 2: C2, 3: C3 },
  3: { 1: I1, 2: I2, 3: I3 },
};

export function variantCount(zone, level) { return BUILDINGS[zone][level].length; }
export function buildingName(zone, level, variant) {
  const list = BUILDINGS[zone]?.[level];
  return list ? list[variant % list.length][0] : '';
}

// ---------------- 자연물 ----------------
const TREES = [
  () => {
    const m = new VoxelModel(5, 7, 5);
    m.fill(0, 2, 0, 4, 3, 4, 'leaves');
    for (const y of [2, 3]) for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]) m.set(x, y, z, null);
    m.fill(1, 4, 1, 3, 4, 3, 'leaves');
    m.set(2, 5, 1, 'leaves').set(1, 5, 2, 'leaves').set(2, 5, 2, 'leaves').set(3, 5, 2, 'leaves').set(2, 5, 3, 'leaves');
    m.fill(2, 0, 2, 2, 3, 2, 'log');
    return m;
  },
  () => {
    const m = new VoxelModel(3, 7, 3);
    m.fill(0, 3, 0, 2, 5, 2, 'leaves_birch').set(1, 6, 1, 'leaves_birch');
    m.set(0, 5, 0, null).set(2, 5, 2, null);
    m.fill(1, 0, 1, 1, 4, 1, 'birch_log');
    return m;
  },
  () => {
    const m = new VoxelModel(5, 9, 5);
    for (const y of [2, 3]) for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) {
      if (Math.abs(x - 2) + Math.abs(z - 2) <= 2) m.set(x, y, z, 'leaves_pine');
    }
    m.fill(1, 4, 1, 3, 5, 3, 'leaves_pine');
    m.set(2, 6, 1, 'leaves_pine').set(1, 6, 2, 'leaves_pine').set(2, 6, 2, 'leaves_pine').set(3, 6, 2, 'leaves_pine').set(2, 6, 3, 'leaves_pine');
    m.set(2, 7, 2, 'leaves_pine');
    m.fill(2, 0, 2, 2, 5, 2, 'log');
    return m;
  },
  () => {
    const m = new VoxelModel(3, 2, 3);
    m.fill(0, 0, 0, 2, 0, 2, 'leaves').set(1, 1, 1, 'leaves');
    return m;
  },
];

const ROCKS = [
  () => new VoxelModel(3, 2, 3).fill(0, 0, 0, 2, 0, 1, 'stone').set(1, 1, 0, 'stone').set(2, 0, 2, 'cobble'),
  () => new VoxelModel(2, 2, 2).fill(0, 0, 0, 1, 0, 1, 'cobble').set(0, 1, 0, 'stone'),
];

export const TREE_VARIANTS = TREES.length;
export const ROCK_VARIANTS = ROCKS.length;

// 모든 모델을 지오메트리로 굽기: key -> { geometry, smoke, height }
export function buildModelGeometries(atlas) {
  const out = new Map();
  const add = (key, model) => {
    const smoke = model.smoke.map(([x, y, z]) => [
      (x + 0.5 - model.w / 2) * VOXEL, y * VOXEL, (z + 0.5 - model.d / 2) * VOXEL,
    ]);
    out.set(key, { geometry: meshVoxels(model, BLOCKS, atlas), smoke, height: model.h * VOXEL });
  };
  for (const zone of [1, 2, 3]) for (const level of [1, 2, 3]) {
    BUILDINGS[zone][level].forEach(([, fn], v) => add(`b${zone}${level}${v}`, fn()));
  }
  TREES.forEach((fn, v) => add('tree' + v, fn()));
  ROCKS.forEach((fn, v) => add('rock' + v, fn()));
  return out;
}
