export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
export const dist2 = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

/** Shortest signed angle difference a->b in radians */
export function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Deterministic PRNG (mulberry32) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(min + rng() * (max - min + 1));
}

// ---- 2D gradient noise (deterministic, no dependency) ----
function hash(ix: number, iz: number) {
  let h = ix * 374761393 + iz * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return h;
}
function grad(ix: number, iz: number, x: number, z: number) {
  const h = hash(ix, iz) & 7;
  const gx = [1, -1, 1, -1, 1.41, -1.41, 0, 0][h];
  const gz = [1, 1, -1, -1, 0, 0, 1.41, -1.41][h];
  return gx * (x - ix) + gz * (z - iz);
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function noise2(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fz = fade(z - iz);
  const a = grad(ix, iz, x, z);
  const b = grad(ix + 1, iz, x, z);
  const c = grad(ix, iz + 1, x, z);
  const d = grad(ix + 1, iz + 1, x, z);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

export function fbm(x: number, z: number, octaves = 4) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

export function formatNumber(n: number) {
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}
