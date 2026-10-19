import * as THREE from 'three';
import { BUILDINGS } from '../../data/buildings';
import { WORLD_RADIUS } from '../../data/world';
import { runtime, type Collider } from '../runtime';
import type { BuildingInstance } from '../types';
import { terrainHeight } from './terrain';

let buildingColliders: Collider[] = [];
let lastBuildings: BuildingInstance[] | null = null;

/** Rebuild building colliders only when the buildings array actually changes. */
export function syncBuildingColliders(buildings: BuildingInstance[]) {
  if (buildings === lastBuildings) return;
  lastBuildings = buildings;
  buildingColliders = buildings.map((b) => {
    const def = BUILDINGS[b.type];
    return { x: b.position[0], z: b.position[2], r: (def?.radius ?? 2) * 0.85, h: b.position[1] + (def?.height ?? 3) };
  });
}

export function allColliders() {
  return [runtime.staticColliders, buildingColliders];
}

/** Pushes a circle at `pos` out of every collider. Returns true if a collision occurred. */
export function resolveCircle(pos: THREE.Vector3, radius: number) {
  let hit = false;
  for (const list of allColliders()) {
    for (const c of list) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const min = c.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && pos.y < c.h) {
        const d = Math.sqrt(d2) || 0.0001;
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
        hit = true;
      }
    }
  }
  // World boundary
  const r = Math.hypot(pos.x, pos.z);
  if (r > WORLD_RADIUS) {
    pos.x *= WORLD_RADIUS / r;
    pos.z *= WORLD_RADIUS / r;
    hit = true;
  }
  return hit;
}

/** True if the segment point is inside any solid (terrain or collider) — used by the camera. */
export function pointBlocked(p: THREE.Vector3) {
  if (p.y < terrainHeight(p.x, p.z) + 0.25) return true;
  for (const list of allColliders()) {
    for (const c of list) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      if (dx * dx + dz * dz < c.r * c.r * 1.1 && p.y < c.h) return true;
    }
  }
  return false;
}
