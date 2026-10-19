import { BUILDINGS } from '../../data/buildings';
import { BUILD_ZONE, NPC_POS, ORE_VEINS, OUTPOST_COLLIDERS, TERMINAL_POS } from '../../data/world';
import { canAfford, missing, scaleCost, spend, stackName, add } from '../resources/inventory';
import { getCapacities, isBuildingUnlocked } from '../research/modifiers';
import { terrainHeight, terrainRoughness } from '../world/terrain';
import type { BuildingInstance, GameState, ResourceId, SystemResult } from '../types';

export const LOCAL_PLAYER_ID = 'local-player';

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
  veinResource?: ResourceId;
}

const STATIC_BLOCKERS = [
  ...OUTPOST_COLLIDERS,
  { x: TERMINAL_POS[0], z: TERMINAL_POS[1], r: 1.2 },
  { x: NPC_POS[0], z: NPC_POS[1], r: 1.2 },
];

export function veinAt(x: number, z: number) {
  return ORE_VEINS.find((v) => Math.hypot(x - v.position[0], z - v.position[1]) <= v.radius);
}

/** Checks everything except cost (used for preview colouring and for actual placement). */
export function checkSite(
  state: GameState,
  type: string,
  x: number,
  z: number,
  playerPos?: { x: number; z: number },
): PlacementCheck {
  const def = BUILDINGS[type];
  if (!def) return { ok: false, reason: '알 수 없는 건물입니다.' };
  if (!isBuildingUnlocked(state, type)) return { ok: false, reason: '필요 기술이 연구되지 않았습니다.' };
  if (def.maxCount !== undefined && state.buildings.filter((b) => b.type === type).length >= def.maxCount) {
    return { ok: false, reason: `최대 ${def.maxCount}개까지 건설할 수 있습니다.` };
  }
  const fromCenter = Math.hypot(x - BUILD_ZONE.center[0], z - BUILD_ZONE.center[1]);
  if (fromCenter + def.radius > BUILD_ZONE.radius) return { ok: false, reason: '건설 구역(기지 반경) 밖입니다.' };
  for (const c of STATIC_BLOCKERS) {
    if (Math.hypot(x - c.x, z - c.z) < c.r + def.radius + 0.3) return { ok: false, reason: '기지 시설과 겹칩니다.' };
  }
  for (const b of state.buildings) {
    const other = BUILDINGS[b.type];
    const r = other?.radius ?? 2;
    if (Math.hypot(x - b.position[0], z - b.position[2]) < r + def.radius + 0.4) return { ok: false, reason: '다른 건물과 겹칩니다.' };
  }
  if (playerPos && Math.hypot(x - playerPos.x, z - playerPos.z) < def.radius + 0.6) {
    return { ok: false, reason: '플레이어 위치와 겹칩니다.' };
  }
  if (terrainRoughness(x, z, def.radius) > 1.2) return { ok: false, reason: '지형이 너무 고르지 않습니다.' };
  const vein = veinAt(x, z);
  if (def.requiresVein && !vein) return { ok: false, reason: '광맥 위에만 건설할 수 있습니다.' };
  return { ok: true, veinResource: vein?.resource };
}

export function checkPlacement(state: GameState, type: string, x: number, z: number, playerPos?: { x: number; z: number }): PlacementCheck {
  const site = checkSite(state, type, x, z, playerPos);
  if (!site.ok) return site;
  const def = BUILDINGS[type];
  if (!canAfford(state.inventory, def.cost)) {
    const m = missing(state.inventory, def.cost)[0];
    return { ok: false, reason: `자원 부족: ${stackName(m.id)} ${m.have}/${m.need}` };
  }
  return site;
}

export function placeBuilding(
  state: GameState,
  type: string,
  x: number,
  z: number,
  rotation: number,
  playerPos?: { x: number; z: number },
): SystemResult {
  const check = checkPlacement(state, type, x, z, playerPos);
  if (!check.ok) return { ok: false, reason: check.reason ?? '건설할 수 없습니다.' };
  const def = BUILDINGS[type];
  const inv = spend(state.inventory, def.cost);
  if (!inv) return { ok: false, reason: '자원이 부족합니다.' };
  const id = `b_${state.nextId}`;
  const building: BuildingInstance = {
    id,
    type,
    ownerId: LOCAL_PLAYER_ID,
    position: [x, terrainHeight(x, z), z],
    rotation,
    enabled: true,
    state: def.powerUse > 0 ? 'unpowered' : 'operational',
    progress: 0,
    produced: 0,
    veinResource: def.requiresVein ? check.veinResource : undefined,
    builtAt: state.time,
  };
  return {
    ok: true,
    state: {
      ...state,
      inventory: inv,
      buildings: [...state.buildings, building],
      nextId: state.nextId + 1,
      stats: { ...state.stats, buildingsPlaced: state.stats.buildingsPlaced + 1 },
    },
    events: [{ type: 'built', building: type, id }],
  };
}

export const DEMOLISH_REFUND = 0.5;

export function demolishBuilding(state: GameState, id: string): SystemResult {
  const b = state.buildings.find((x) => x.id === id);
  if (!b) return { ok: false, reason: '건물을 찾을 수 없습니다.' };
  if (b.prebuilt) return { ok: false, reason: '기지 기본 시설은 철거할 수 없습니다.' };
  const def = BUILDINGS[b.type];
  const without = { ...state, buildings: state.buildings.filter((x) => x.id !== id) };
  // Refund is limited by the capacity *after* demolition (a storage depot may be removed)
  const { inv } = add(without.inventory, def ? scaleCost(def.cost, DEMOLISH_REFUND) : {}, getCapacities(without));
  const caps = getCapacities(without);
  const clamped = { ...inv };
  for (const [k, cap] of Object.entries(caps)) if (cap !== undefined && (clamped[k] ?? 0) > cap) clamped[k] = cap;
  return { ok: true, state: { ...without, inventory: clamped }, events: [] };
}

export function toggleBuilding(state: GameState, id: string): SystemResult {
  const idx = state.buildings.findIndex((x) => x.id === id);
  if (idx < 0) return { ok: false, reason: '건물을 찾을 수 없습니다.' };
  const buildings = state.buildings.slice();
  const b = buildings[idx];
  buildings[idx] = { ...b, enabled: !b.enabled, state: b.enabled ? 'disabled' : 'unpowered' };
  return { ok: true, state: { ...state, buildings }, events: [] };
}
