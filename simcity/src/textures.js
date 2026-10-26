// 코드로 그리는 픽셀 텍스처 아틀라스 (외부 이미지 없음)
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const ATLAS_W = 1024;
const ATLAS_H = 512;
const SMALL = 16;     // 복셀 한 면
const BIG = 64;       // 타일 한 칸 윗면
const PAD_S = 8;
const PAD_B = 16;

class Tex {
  constructor(w, h = w) {
    this.w = w;
    this.h = h;
    this.px = new Uint32Array(w * h);
  }
  set(x, y, c) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  get(x, y) {
    x = ((x % this.w) + this.w) % this.w;
    y = ((y % this.h) + this.h) % this.h;
    return this.px[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  clone() {
    const t = new Tex(this.w, this.h);
    t.px.set(this.px);
    return t;
  }
}

// ---- 색 유틸 ----
function rgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function pack(r, g, b) {
  return (Math.max(0, Math.min(255, r | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, b | 0));
}
export function shade(c, f) { const [r, g, b] = rgb(c); return pack(r * f, g * f, b * f); }
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function speckle(t, pal, rng) {
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(x, y, pick(rng, pal));
}
function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---- 팔레트 ----
const GRASS = [0x5f9f3b, 0x6aad43, 0x58953a, 0x74b84b, 0x63a440, 0x528a35];
const SAND = [0xdbc78c, 0xe2cf98, 0xd2bc80, 0xe8d8a6, 0xd8c288];
const DIRT = [0x7b5637, 0x87603f, 0x6c4a2f, 0x936b47, 0x5f4029];
const STONE = [0x7f7f7f, 0x8b8b8b, 0x737373, 0x969696, 0x6a6a6a];
const ASPHALT = [0x4a4a4e, 0x525256, 0x45454a, 0x58585c, 0x4e4e52];
const WALK = [0xa9a9a4, 0xb5b5b0, 0x9c9c97, 0xafafaa];

// ================= 큰 텍스처 (타일 윗면/옆면) =================
function grassTex(v) {
  const rng = mulberry32(seedOf('grass' + v));
  const t = new Tex(BIG);
  speckle(t, GRASS, rng);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(rng() * BIG), y = Math.floor(rng() * BIG);
    t.set(x, y, 0x4a7f2f); t.set(x, y - 1, 0x4f8833);
  }
  if (v === 3) {
    const flowers = [0xf2d33a, 0xf5f5f5, 0xd83a3a, 0x9b6cf0];
    for (let k = 0; k < 9; k++) {
      const x = 2 + Math.floor(rng() * (BIG - 4)), y = 2 + Math.floor(rng() * (BIG - 4));
      t.set(x, y, pick(rng, flowers)); t.set(x, y + 1, 0x3e7a28);
    }
  }
  return t;
}

function sandTex(v) {
  const rng = mulberry32(seedOf('sand' + v));
  const t = new Tex(BIG);
  speckle(t, SAND, rng);
  for (let k = 0; k < 25; k++) t.set(Math.floor(rng() * BIG), Math.floor(rng() * BIG), 0xc4ad72);
  return t;
}

function dirtSideTex() {
  const rng = mulberry32(seedOf('dirtside'));
  const t = new Tex(BIG);
  speckle(t, DIRT, rng);
  for (let k = 0; k < 30; k++) t.set(Math.floor(rng() * BIG), Math.floor(rng() * BIG), 0x9a9a9a);
  for (let x = 0; x < BIG; x++) {
    const len = 4 + Math.floor(rng() * 4) + (rng() < 0.15 ? 4 : 0);
    for (let y = 0; y < len; y++) t.set(x, y, pick(rng, GRASS));
  }
  return t;
}

function stoneSideTex() {
  const rng = mulberry32(seedOf('stoneside'));
  const t = new Tex(BIG);
  speckle(t, STONE, rng);
  for (let k = 0; k < 18; k++) {
    let x = Math.floor(rng() * BIG), y = Math.floor(rng() * BIG);
    for (let s = 0; s < 6; s++) { t.set(x, y, 0x5c5c5c); x += rng() < 0.5 ? 1 : 0; y += 1; }
  }
  for (let k = 0; k < 5; k++) {
    const x = Math.floor(rng() * 60), y = Math.floor(rng() * 60);
    t.rect(x, y, 2, 2, 0x2b2b2b); t.set(x + 2, y + 1, 0x333333);
  }
  return t;
}

// 도로: 연결 방향 비트(북1 동2 남4 서8)마다 따로 그림
const N = 1, E = 2, S = 4, W = 8;
function roadTex(mask) {
  const rng = mulberry32(seedOf('road' + mask));
  const t = new Tex(BIG);
  speckle(t, ASPHALT, rng);
  const SW = 8;
  const walk = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const seam = (i % 8 === 0) || (j % 8 === 0);
      t.set(i, j, seam ? 0x8e8e89 : pick(rng, WALK));
    }
  };
  // 모서리 보도는 항상
  walk(0, 0, SW, SW); walk(BIG - SW, 0, SW, SW); walk(0, BIG - SW, SW, SW); walk(BIG - SW, BIG - SW, SW, SW);
  if (!(mask & N)) walk(0, 0, BIG, SW);
  if (!(mask & S)) walk(0, BIG - SW, BIG, SW);
  if (!(mask & W)) walk(0, 0, SW, BIG);
  if (!(mask & E)) walk(BIG - SW, 0, SW, BIG);
  // 연석 그림자
  for (let i = 0; i < BIG; i++) for (let j = 0; j < BIG; j++) {
    const inWalk = (x, y) => {
      if (x < 0 || y < 0 || x >= BIG || y >= BIG) return true;
      const c = t.get(x, y);
      return WALK.includes(c) || c === 0x8e8e89;
    };
    if (!inWalk(i, j) && (inWalk(i - 1, j) || inWalk(i + 1, j) || inWalk(i, j - 1) || inWalk(i, j + 1))) {
      t.set(i, j, 0x3a3a3d);
    }
  }
  const count = [N, E, S, W].filter(d => mask & d).length;
  const Y = 0xe8c547;
  const dashV = (y0, y1) => { for (let y = y0; y < y1; y++) if (y % 10 < 6) { t.set(31, y, Y); t.set(32, y, Y); } };
  const dashH = (x0, x1) => { for (let x = x0; x < x1; x++) if (x % 10 < 6) { t.set(x, 31, Y); t.set(x, 32, Y); } };
  if (count <= 2) {
    if (mask & N) dashV(0, 33);
    if (mask & S) dashV(31, BIG);
    if (mask & W) dashH(0, 33);
    if (mask & E) dashH(31, BIG);
  } else {
    // 교차로: 횡단보도
    const WH = 0xe9e9e4;
    for (let k = 10; k < BIG - 10; k += 4) {
      if (mask & N) t.rect(k, 9, 2, 5, WH);
      if (mask & S) t.rect(k, BIG - 14, 2, 5, WH);
      if (mask & W) t.rect(9, k, 5, 2, WH);
      if (mask & E) t.rect(BIG - 14, k, 5, 2, WH);
    }
  }
  return t;
}

function zoneTex(tint, border) {
  const t = grassTex(1).clone();
  for (let i = 0; i < t.px.length; i++) t.px[i] = mix(t.px[i], tint, 0.32);
  for (let i = 0; i < BIG; i++) {
    if (i % 10 >= 6) continue;
    for (let k = 2; k < 5; k++) {
      t.set(i, k, border); t.set(i, BIG - 1 - k, border);
      t.set(k, i, border); t.set(BIG - 1 - k, i, border);
    }
  }
  return t;
}

function lotTex(kind) {
  const rng = mulberry32(seedOf('lot' + kind));
  if (kind === 'r') {
    const t = grassTex(2).clone();
    for (let i = 0; i < t.px.length; i++) t.px[i] = mix(t.px[i], 0x9ad86a, 0.18);
    const flowers = [0xf2d33a, 0xf5f5f5, 0xe26ba0];
    for (let k = 0; k < 7; k++) t.set(Math.floor(rng() * BIG), Math.floor(rng() * BIG), pick(rng, flowers));
    return t;
  }
  if (kind === 'c') {
    const t = new Tex(BIG);
    const P = [0xbdb8ac, 0xc6c1b5, 0xb2ada2];
    for (let y = 0; y < BIG; y++) for (let x = 0; x < BIG; x++) {
      const seam = (x % 8 === 0) || ((y + (Math.floor(x / 8) % 2) * 4) % 8 === 0);
      t.set(x, y, seam ? 0x958f84 : pick(rng, P));
    }
    return t;
  }
  const t = new Tex(BIG);
  speckle(t, [0x8c8c86, 0x96968f, 0x84847e, 0x909089], rng);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(rng() * 56), y = Math.floor(rng() * 56);
    t.rect(x, y, 3 + Math.floor(rng() * 4), 2 + Math.floor(rng() * 3), 0x6f6f6a);
  }
  for (let x = 6; x < BIG - 6; x++) { t.set(x, 6, 0xe2b93b); t.set(x, BIG - 7, 0xe2b93b); }
  return t;
}

// ================= 작은 텍스처 (복셀 면) =================
function S16(name, fn) {
  const rng = mulberry32(seedOf(name));
  const t = new Tex(SMALL);
  fn(t, rng);
  return t;
}

function window16(base, glass = [0x7fb8e6, 0x9cc9ee, 0x6aa6d8], frame = 0xf0f0ea, wide = false) {
  const t = base.clone();
  const x0 = wide ? 2 : 4, x1 = wide ? 13 : 11, y0 = 3, y1 = 12;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    t.set(x, y, edge ? frame : glass[(x + y) % glass.length]);
  }
  for (let x = x0 + 1; x < x1; x++) t.set(x, Math.floor((y0 + y1) / 2), frame);
  for (let y = y0 + 1; y < y1; y++) t.set(Math.floor((x0 + x1) / 2), y, frame);
  t.set(x0 + 1, y0 + 1, 0xdff0ff); t.set(x0 + 2, y0 + 1, 0xdff0ff); t.set(x0 + 1, y0 + 2, 0xdff0ff);
  for (let x = x0; x <= x1; x++) t.set(x, y1 + 1, shade(base.get(x, y1 + 1), 0.7));
  return t;
}

function buildSmall() {
  const T = {};
  T.log_side = S16('log_side', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = [0x6b4f2a, 0x5a4022, 0x7a5c34, 0x634826][(x + (r() < 0.2 ? 1 : 0)) % 4];
      t.set(x, y, r() < 0.15 ? shade(band, 0.85) : band);
    }
  });
  T.log_top = S16('log_top', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      t.set(x, y, d > 6.5 ? 0x5a4022 : (Math.floor(d) % 2 ? 0xb0894f : 0x9c7642));
    }
  });
  T.birch_side = S16('birch_side', (t, r) => {
    speckle(t, [0xe8e8e0, 0xdedcd2, 0xf0efe8], r);
    for (let k = 0; k < 7; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 16); t.rect(x, y, 2 + Math.floor(r() * 2), 1, 0x2e2e2e); }
  });
  const leaves = (name, pal, hole) => S16(name, (t, r) => {
    speckle(t, pal, r);
    for (let k = 0; k < 18; k++) t.set(Math.floor(r() * 16), Math.floor(r() * 16), hole);
  });
  T.leaves = leaves('leaves', [0x3f8a2a, 0x4a9a32, 0x357a22, 0x2f6e1e, 0x449330], 0x23521a);
  T.leaves_pine = leaves('leaves_pine', [0x2e5e34, 0x376b3c, 0x264f2b, 0x31623a], 0x1b3a1f);
  T.leaves_birch = leaves('leaves_birch', [0x6aa84f, 0x77b55a, 0x5e9a46, 0x80bd62], 0x4a7d36);
  T.hedge = leaves('hedge', [0x3b7d2c, 0x458c33, 0x336f26], 0x25541c);
  T.stone = S16('stone', (t, r) => speckle(t, STONE, r));
  T.cobble = S16('cobble', (t, r) => {
    speckle(t, [0x8a8a8a, 0x7a7a7a, 0x969696], r);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((y % 5 === 0) || ((x + (Math.floor(y / 5) % 2) * 3) % 6 === 0)) t.set(x, y, 0x555555);
    }
  });
  const planks = (name, pal, seam) => S16(name, (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const end = (x + row * 5) % 16 === 0;
      t.set(x, y, (y % 4 === 3 || end) ? seam : pick(r, pal));
    }
  });
  T.planks = planks('planks', [0xb08a52, 0xa98449, 0xb8925c], 0x7c5f36);
  T.planks_dark = planks('planks_dark', [0x6e4f2e, 0x654828, 0x775734], 0x46321c);
  T.brick = S16('brick', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7;
      t.set(x, y, mortar ? 0xb3aa9b : pick(r, [0x9c4a3a, 0xa8533f, 0x8e4234, 0xa04d3c]));
    }
  });
  T.plaster = S16('plaster', (t, r) => speckle(t, [0xece6d6, 0xe6dfcd, 0xf2ecde, 0xe9e2d1], r));
  T.plaster_yellow = S16('plaster_y', (t, r) => speckle(t, [0xe9cf8a, 0xe2c77f, 0xefd694], r));
  T.concrete = S16('concrete', (t, r) => speckle(t, [0xa6a6a0, 0xb0b0aa, 0x9c9c96, 0xababa5], r));
  T.concrete_dark = S16('concrete_dark', (t, r) => speckle(t, [0x5e5f63, 0x67686c, 0x55565a], r));
  T.gravel = S16('gravel', (t, r) => speckle(t, [0x8d8a86, 0x7a7773, 0x9b9893, 0x6d6a66, 0xa6a39e], r));
  const roof = (name, pal, line) => S16(name, (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const seam = y % 4 === 3 || (y % 4 === 0 && (x + Math.floor(y / 4) * 3) % 5 === 0);
      t.set(x, y, seam ? line : pick(r, pal));
    }
  });
  T.roof_red = roof('roof_red', [0xa83a2c, 0xb84434, 0x9c3427], 0x6e2219);
  T.roof_brown = roof('roof_brown', [0x6b4a32, 0x775338, 0x5f412b], 0x3e2a1b);
  T.roof_blue = roof('roof_blue', [0x3e5c8a, 0x46669a, 0x37527c], 0x243652);
  T.roof_green = roof('roof_green', [0x3c7a5a, 0x448866, 0x346c4f], 0x234a36);
  const glass = (name, pal, frameC) => S16(name, (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x % 8 === 0 || y % 8 === 0;
      t.set(x, y, frame ? frameC : pal[((x + y) >> 2) % pal.length]);
    }
    for (let k = 1; k < 6; k++) { t.set(k + 1, 8 - k, 0xe6f2ff); t.set(k + 9, 16 - k, 0xd0e6ff); }
  });
  T.glass_blue = glass('glass_blue', [0x5c8fc4, 0x6a9fd4, 0x4f7fb2], 0x34414f);
  T.glass_green = glass('glass_green', [0x4fa59a, 0x5cb5aa, 0x438f85], 0x2f4542);
  T.glass_dark = glass('glass_dark', [0x2d3d57, 0x354766, 0x26344b], 0x16191f);
  const corrugated = (name, pal) => S16(name, (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const c = pal[x % pal.length];
      t.set(x, y, r() < 0.08 ? shade(c, 0.9) : c);
    }
  });
  T.metal = corrugated('metal', [0xb4b8bc, 0xc2c6ca, 0x9ea2a6, 0x8a8e92]);
  T.metal_blue = corrugated('metal_blue', [0x5a7ca0, 0x6789ad, 0x4e6e90, 0x435f7d]);
  T.metal_dark = corrugated('metal_dark', [0x4a4e54, 0x555960, 0x404349, 0x383b40]);
  T.stripe = S16('stripe', (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, ((x + y) >> 2) % 2 ? 0x222222 : 0xf0c419);
  });
  T.tank = S16('tank', (t, r) => {
    speckle(t, [0xe4e4e0, 0xdcdcd8, 0xeaeae6], r);
    for (let x = 0; x < 16; x++) { t.set(x, 0, 0xa0a09c); t.set(x, 8, 0xb5b5b1); }
    for (let y = 0; y < 16; y += 4) t.set(15, y, 0x9a9a96);
  });
  T.smokestack = S16('smokestack', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = y < 8 ? [0xb33a2e, 0xa63327] : [0xe8e8e2, 0xdcdcd6];
      t.set(x, y, pick(r, band));
    }
  });
  T.stack_top = S16('stack_top', (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x < 2 || y < 2 || x > 13 || y > 13;
      t.set(x, y, edge ? 0xb33a2e : 0x1d1d1d);
    }
  });
  T.sign = S16('sign', (t, r) => {
    t.rect(0, 0, 16, 16, 0x24202e);
    for (let x = 0; x < 16; x++) { t.set(x, 0, 0x4a4458); t.set(x, 15, 0x4a4458); }
    const neon = [0xff4fa3, 0x4ff0ff, 0xffe14f];
    const c = pick(r, neon);
    for (let x = 3; x < 13; x++) if (r() < 0.7) { t.set(x, 6, c); t.set(x, 9, c); }
    for (let y = 6; y < 10; y++) { t.set(3, y, c); t.set(12, y, c); }
  });
  T.crate = S16('crate', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, pick(r, [0xb88a4a, 0xae8043, 0xc29452]));
    for (let k = 0; k < 16; k++) { t.set(k, 0, 0x6e4f2a); t.set(k, 15, 0x6e4f2a); t.set(0, k, 0x6e4f2a); t.set(15, k, 0x6e4f2a); t.set(k, k, 0x7c5a31); }
  });
  T.garage = S16('garage', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, y % 3 === 2 ? 0x7d8288 : pick(r, [0xaab0b6, 0xb3b9bf]));
    for (let y = 0; y < 16; y++) { t.set(0, y, 0x55595e); t.set(15, y, 0x55595e); }
  });
  T.vent = S16('vent', (t, r) => {
    t.rect(0, 0, 16, 16, 0x9ca0a4);
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) t.set(x, y, (x + y) % 2 ? 0x55595e : 0x6c7075);
    for (let k = 0; k < 16; k++) { t.set(k, 0, 0x7a7e82); t.set(k, 15, 0x7a7e82); }
  });
  T.door = S16('door', (t, r) => {
    t.rect(0, 0, 16, 16, 0x8a6a45);
    for (let y = 1; y < 16; y++) for (let x = 3; x < 13; x++) t.set(x, y, x % 3 === 0 ? 0x4e3720 : pick(r, [0x6e4f2e, 0x775734]));
    for (let x = 3; x < 13; x++) t.set(x, 1, 0x3b2a18);
    t.set(10, 9, 0xe2c055); t.set(10, 10, 0xc9a640);
    t.rect(5, 3, 2, 3, 0x9cc9ee); t.rect(9, 3, 2, 3, 0x9cc9ee);
  });
  T.shop = S16('shop', (t, r) => {
    t.rect(0, 0, 16, 16, 0x3c3f45);
    for (let y = 2; y < 14; y++) for (let x = 1; x < 15; x++) t.set(x, y, [0x9ccbe8, 0xaed6ee, 0x8fbfdf][(x + y) % 3]);
    const goods = [0xe25a4a, 0xf2c94c, 0x5ab36a, 0x5a8ee2, 0xe28ad2];
    for (let x = 2; x < 14; x++) { if (r() < 0.6) t.set(x, 12, pick(r, goods)); if (r() < 0.5) t.set(x, 11, pick(r, goods)); }
    for (let x = 2; x < 14; x++) t.set(x, 13, 0x6b4f33);
    t.set(2, 3, 0xffffff); t.set(3, 3, 0xffffff); t.set(2, 4, 0xffffff);
    for (let x = 0; x < 16; x++) t.set(x, 15, 0x2a2c30);
  });
  const awning = (name, c) => S16(name, (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const stripe = Math.floor(x / 2) % 2 ? 0xf2efe6 : c;
      t.set(x, y, stripe);
    }
    for (let x = 0; x < 16; x++) t.set(x, 15 - (x % 2), shade(c, 0.7));
  });
  T.awning_red = awning('awning_red', 0xd2463a);
  T.awning_blue = awning('awning_blue', 0x3f6fd0);
  T.awning_green = awning('awning_green', 0x3fa05a);

  T.plaster_win = window16(T.plaster);
  T.plaster_yellow_win = window16(T.plaster_yellow, undefined, 0xfaf6ea);
  T.brick_win = window16(T.brick, undefined, 0xe8e2d4);
  T.plank_win = window16(T.planks, undefined, 0x5a4022);
  T.concrete_win = window16(T.concrete, [0x6b8fb3, 0x7fa2c4, 0x5f83a8], 0x86868a, true);
  T.concrete_win_lit = window16(T.concrete, [0xf2d98a, 0xf7e3a3, 0xe8cd7a], 0x86868a, true);

  // 아이콘용
  T.tnt = S16('tnt', (t, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.set(x, y, pick(r, [0xc9302c, 0xd6403a, 0xb82a26]));
    t.rect(0, 5, 16, 6, 0xeeeeea);
    const L = 0x222222;
    [[2, 6], [3, 6], [4, 6], [3, 7], [3, 8], [3, 9], [6, 6], [6, 7], [6, 8], [6, 9], [7, 7], [8, 8], [9, 6], [9, 7], [9, 8], [9, 9],
      [11, 6], [12, 6], [13, 6], [12, 7], [12, 8], [12, 9]].forEach(([x, y]) => t.set(x, y, L));
  });
  T.lens = S16('lens', (t) => {
    t.rect(0, 0, 16, 16, 0x5a6f8c);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 6, y - 6);
      if (d < 4) t.set(x, y, 0xbfe4ff);
      else if (d < 5.3) t.set(x, y, 0xf0f0f0);
    }
    for (let k = 0; k < 5; k++) { t.set(9 + k, 10 + k, 0x8a6a45); t.set(10 + k, 10 + k, 0x6e4f2e); }
    t.set(4, 4, 0xffffff); t.set(5, 4, 0xffffff);
  });
  return T;
}

// ================= 아틀라스 조립 =================
function blit(data, tex, X, Y, pad) {
  for (let j = -pad; j < tex.h + pad; j++) {
    for (let i = -pad; i < tex.w + pad; i++) {
      const c = tex.get(i, j);
      const o = ((Y + pad + j) * ATLAS_W + (X + pad + i)) * 4;
      data[o] = (c >> 16) & 255; data[o + 1] = (c >> 8) & 255; data[o + 2] = c & 255; data[o + 3] = 255;
    }
  }
}

export function createAtlas(maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W; canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(ATLAS_W, ATLAS_H);
  const rects = {};

  const big = {};
  for (let v = 0; v < 4; v++) big['grass' + v] = grassTex(v);
  for (let v = 0; v < 2; v++) big['sand' + v] = sandTex(v);
  big.dirtside = dirtSideTex();
  big.stoneside = stoneSideTex();
  for (let m = 0; m < 16; m++) big['road' + m] = roadTex(m);
  big.zone_r = zoneTex(0x5be35b, 0x9dff6e);
  big.zone_c = zoneTex(0x5aa0ff, 0x8fd0ff);
  big.zone_i = zoneTex(0xffd640, 0xffe680);
  big.lot_r = lotTex('r');
  big.lot_c = lotTex('c');
  big.lot_i = lotTex('i');

  const slotB = BIG + PAD_B * 2;
  let bx = 0, by = 0;
  for (const [name, tex] of Object.entries(big)) {
    if (bx + slotB > ATLAS_W) { bx = 0; by += slotB; }
    blit(img.data, tex, bx, by, PAD_B);
    rects[name] = { x: bx + PAD_B, y: by + PAD_B, w: BIG, h: BIG };
    bx += slotB;
  }
  by += slotB;

  const small = buildSmall();
  const slotS = SMALL + PAD_S * 2;
  let sx = 0, sy = by;
  for (const [name, tex] of Object.entries(small)) {
    if (sx + slotS > ATLAS_W) { sx = 0; sy += slotS; }
    blit(img.data, tex, sx, sy, PAD_S);
    rects[name] = { x: sx + PAD_S, y: sy + PAD_S, w: SMALL, h: SMALL };
    sx += slotS;
  }
  if (sy + slotS > ATLAS_H) console.warn('atlas overflow');
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.generateMipmaps = true;

  // UV 사각형: 이미지 위쪽 = vt
  const uv = (name, sub) => {
    const r = rects[name];
    if (!r) throw new Error('no texture ' + name);
    const s = sub || { x0: 0, y0: 0, x1: 1, y1: 1 };
    return {
      u0: (r.x + s.x0 * r.w) / ATLAS_W,
      u1: (r.x + s.x1 * r.w) / ATLAS_W,
      vt: 1 - (r.y + s.y0 * r.h) / ATLAS_H,
      vb: 1 - (r.y + s.y1 * r.h) / ATLAS_H,
    };
  };
  return { canvas, texture, rects, uv };
}

export function createWaterTexture() {
  const rng = mulberry32(seedOf('water'));
  const canvas = document.createElement('canvas');
  canvas.width = BIG; canvas.height = BIG;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(BIG, BIG);
  const pal = [0x3366cc, 0x3a70d6, 0x2f5ebf, 0x3d74da, 0x3569cf];
  for (let y = 0; y < BIG; y++) for (let x = 0; x < BIG; x++) {
    let c = pal[Math.floor(rng() * pal.length)];
    if (rng() < 0.015) c = 0x8fb8f2;
    const o = (y * BIG + x) * 4;
    img.data[o] = (c >> 16) & 255; img.data[o + 1] = (c >> 8) & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  }
  for (let k = 0; k < 10; k++) {
    const x = Math.floor(rng() * 56), y = Math.floor(rng() * 64);
    for (let i = 0; i < 4 + Math.floor(rng() * 5); i++) {
      const o = (y * BIG + x + i) * 4;
      img.data[o] = 0x9c; img.data[o + 1] = 0xc4; img.data[o + 2] = 0xf6;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  return tex;
}
