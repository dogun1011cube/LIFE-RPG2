import { BUILD_ZONE, OUTPOST_COLLIDERS, RESOURCE_NODES, SIGNS, WORLD_RADIUS, ZONES } from '../../data/world';
import { mulberry32 } from '../../utils/math';
import { terrainHeight } from './terrain';
import type { Collider } from '../runtime';

export interface ScatterItem {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
  variant: number;
}

const corruption = ZONES.find((z) => z.id === 'corruption')!;
const ridge = ZONES.find((z) => z.id === 'ridge')!;
const meadow = ZONES.find((z) => z.id === 'meadow')!;

function clearOfPoints(x: number, z: number, minDist: number) {
  for (const n of RESOURCE_NODES) if (Math.hypot(x - n.position[0], z - n.position[1]) < minDist) return false;
  for (const s of SIGNS) if (Math.hypot(x - s.position[0], z - s.position[1]) < minDist) return false;
  return true;
}

const inZone = (x: number, z: number, zone: { center: [number, number]; radius: number }, pad = 0) =>
  Math.hypot(x - zone.center[0], z - zone.center[1]) < zone.radius + pad;

/** Deterministic world scatter, generated once and shared by rendering and collision. */
export function generateScatter() {
  const rng = mulberry32(1234);
  const trees: ScatterItem[] = [];
  const rocks: ScatterItem[] = [];
  const crystals: ScatterItem[] = [];
  const grass: ScatterItem[] = [];

  let attempts = 0;
  while (trees.length < 260 && attempts++ < 6000) {
    const a = rng() * Math.PI * 2;
    const r = BUILD_ZONE.radius + 6 + Math.sqrt(rng()) * (WORLD_RADIUS + 20 - BUILD_ZONE.radius);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (inZone(x, z, corruption, 6) || inZone(x, z, ridge, -4) || inZone(x, z, meadow, -6)) continue;
    // Keep a clear path from the landing site to the outpost
    if (Math.abs(x - 4) < 8 && z > 20 && z < 60) continue;
    if (!clearOfPoints(x, z, 4.5)) continue;
    // Forest clusters: density driven by a coarse noise-like rule
    const cluster = Math.sin(x * 0.045) * Math.cos(z * 0.05) + Math.sin((x + z) * 0.02);
    if (cluster < -0.2 && rng() < 0.7) continue;
    const scale = 0.8 + rng() * 0.8;
    trees.push({ x, y: terrainHeight(x, z), z, scale, rot: rng() * Math.PI * 2, variant: rng() < 0.3 ? 1 : 0 });
  }

  attempts = 0;
  while (rocks.length < 110 && attempts++ < 4000) {
    const a = rng() * Math.PI * 2;
    const r = 18 + Math.sqrt(rng()) * (WORLD_RADIUS + 10);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (r < BUILD_ZONE.radius + 3 && rng() < 0.85) continue;
    if (!clearOfPoints(x, z, 3.5)) continue;
    if (OUTPOST_COLLIDERS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 3)) continue;
    const big = rng() < 0.25;
    const scale = big ? 1.8 + rng() * 1.6 : 0.4 + rng() * 0.8;
    rocks.push({ x, y: terrainHeight(x, z), z, scale, rot: rng() * Math.PI * 2, variant: big ? 1 : 0 });
  }

  // Crystal formations (ridge + corruption)
  for (const [zone, count, variant] of [
    [ridge, 46, 0],
    [corruption, 60, 1],
  ] as const) {
    let made = 0;
    attempts = 0;
    while (made < count && attempts++ < 2000) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (zone.radius + 6);
      const x = zone.center[0] + Math.cos(a) * r;
      const z = zone.center[1] + Math.sin(a) * r;
      if (!clearOfPoints(x, z, 3)) continue;
      crystals.push({ x, y: terrainHeight(x, z), z, scale: 0.6 + rng() * 1.6, rot: rng() * Math.PI * 2, variant });
      made++;
    }
  }

  attempts = 0;
  while (grass.length < 1600 && attempts++ < 8000) {
    const a = rng() * Math.PI * 2;
    const r = 14 + Math.sqrt(rng()) * (WORLD_RADIUS - 6);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (inZone(x, z, corruption, 2)) continue;
    grass.push({ x, y: terrainHeight(x, z), z, scale: 0.5 + rng() * 0.8, rot: rng() * Math.PI * 2, variant: rng() < 0.12 ? 1 : 0 });
  }

  const colliders: Collider[] = [
    ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.scale, h: t.y + 6 * t.scale })),
    ...rocks.filter((r) => r.variant === 1).map((r) => ({ x: r.x, z: r.z, r: 0.95 * r.scale, h: r.y + r.scale * 1.2 })),
    ...crystals.filter((c) => c.scale > 1.4).map((c) => ({ x: c.x, z: c.z, r: 0.5 * c.scale, h: c.y + c.scale * 2.5 })),
    ...OUTPOST_COLLIDERS.map((c) => ({ ...c, h: 30 })),
  ];

  return { trees, rocks, crystals, grass, colliders };
}

let cached: ReturnType<typeof generateScatter> | null = null;
export function getScatter() {
  if (!cached) cached = generateScatter();
  return cached;
}
