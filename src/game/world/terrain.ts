import { BUILD_ZONE, ZONES } from '../../data/world';
import { fbm, lerp, smoothstep } from '../../utils/math';

const gaussian = (x: number, z: number, cx: number, cz: number, r: number) => {
  const d2 = (x - cx) * (x - cx) + (z - cz) * (z - cz);
  return Math.exp(-d2 / (r * r));
};

/**
 * Deterministic terrain height. Shared by rendering, physics, placement and AI so that
 * every system agrees on where the ground is.
 */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h = fbm(x * 0.017, z * 0.017, 4) * 7 + fbm(x * 0.06 + 31, z * 0.06 - 17, 2) * 1.1;
  // Crystal ridge: raised plateau
  h += gaussian(x, z, -62, -52, 28) * 5;
  // Corruption basin
  h -= gaussian(x, z, 14, -98, 24) * 2.5;
  // Flatten the buildable outpost area
  const flat = smoothstep(BUILD_ZONE.radius + 2, BUILD_ZONE.radius + 24, r);
  h = lerp(fbm(x * 0.05, z * 0.05, 2) * 0.25, h, flat);
  // Boundary mountains
  const edge = smoothstep(104, 150, r);
  h += edge * edge * 60 + edge * fbm(x * 0.035, z * 0.035, 3) * 14;
  return h;
}

/** Max height difference across a circular footprint (for placement validation) */
export function terrainRoughness(x: number, z: number, radius: number): number {
  let min = Infinity;
  let max = -Infinity;
  const samples = 8;
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const rr = i === samples ? 0 : radius;
    const h = terrainHeight(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  return max - min;
}

export function zoneAt(x: number, z: number) {
  // Smallest containing zone wins (zones are disjoint in practice)
  for (const zone of ZONES) {
    if (Math.hypot(x - zone.center[0], z - zone.center[1]) <= zone.radius) return zone;
  }
  return null;
}
