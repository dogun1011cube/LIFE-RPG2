// 맵 데이터와 타일 조작
import { MAP_W, MAP_H, TERRAIN, FEATURE, ZONE, ROAD_REACH } from './config.js';
import { fbm, mulberry32, hash2 } from './noise.js';

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 북 동 남 서

const FIELDS = ['terrain', 'feature', 'featVar', 'road', 'zone', 'level', 'variant', 'rot'];

export class World {
  constructor(w = MAP_W, h = MAP_H) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    for (const f of FIELDS) this[f] = new Uint8Array(this.n);
    this.access = new Uint8Array(this.n);
    this.accessDirty = true;
    this.listeners = [];
    this.seed = 1;
  }

  idx(x, z) { return z * this.w + x; }
  xz(i) { return [i % this.w, Math.floor(i / this.w)]; }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  onChange(fn) { this.listeners.push(fn); }
  emit(i, kind) { for (const fn of this.listeners) fn(i, kind); }

  generate(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    const rng = mulberry32(seed);
    const cx = this.w / 2, cz = this.h / 2;
    // 높이값: 중심부는 육지가 되도록 살짝 보정
    const elev = new Float32Array(this.n);
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const d = Math.hypot(x - cx, z - cz) / (this.w / 2);
      elev[this.idx(x, z)] = fbm(x / 22, z / 22, seed) - d * 0.12;
    }
    // 분위수로 물/모래 비율을 일정하게
    const sorted = Float32Array.from(elev).sort();
    const waterT = sorted[Math.floor(this.n * 0.1)];
    const sandT = sorted[Math.floor(this.n * 0.15)];
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const i = this.idx(x, z);
      const e = elev[i];
      // 강: 구불구불한 띠
      const river = Math.abs(fbm(x / 40, z / 40, seed + 77) - 0.5);
      let t = TERRAIN.GRASS;
      if (e < waterT || river < 0.012) t = TERRAIN.WATER;
      else if (e < sandT || river < 0.02) t = TERRAIN.SAND;
      this.terrain[i] = t;
      for (const f of FIELDS) if (f !== 'terrain') this[f][i] = 0;
      if (t === TERRAIN.GRASS) {
        const forest = fbm(x / 9, z / 9, seed + 31);
        if (forest > 0.6 && rng() < 0.75) this.setFeature(i, FEATURE.TREE, rng);
        else if (rng() < 0.025) this.setFeature(i, FEATURE.TREE, rng);
        else if (rng() < 0.008) this.setFeature(i, FEATURE.ROCK, rng);
      } else if (t === TERRAIN.SAND && rng() < 0.02) {
        this.setFeature(i, FEATURE.ROCK, rng);
      }
    }
    this.accessDirty = true;
    this.emit(-1, 'all');
  }

  setFeature(i, f, rng) {
    this.feature[i] = f;
    this.featVar[i] = Math.floor(rng() * 256);
    this.rot[i] = Math.floor(rng() * 4);
  }

  grassVariant(i) {
    const [x, z] = this.xz(i);
    const h = hash2(x, z, 9);
    return h < 0.55 ? 0 : h < 0.8 ? 1 : h < 0.95 ? 2 : 3;
  }

  isLand(i) { return this.terrain[i] !== TERRAIN.WATER; }
  hasBuilding(i) { return this.zone[i] !== ZONE.NONE && this.level[i] > 0; }

  roadMask(x, z) {
    let m = 0;
    DIRS.forEach(([dx, dz], k) => {
      const nx = x + dx, nz = z + dz;
      if (this.inBounds(nx, nz) && this.road[this.idx(nx, nz)]) m |= 1 << k;
    });
    return m;
  }

  // ---- 조작 (비용 계산은 tools.js) ----
  clearTile(i) {
    this.feature[i] = FEATURE.NONE;
    this.road[i] = 0;
    this.zone[i] = ZONE.NONE;
    this.level[i] = 0;
  }

  placeRoad(i) {
    this.feature[i] = FEATURE.NONE;
    this.zone[i] = ZONE.NONE;
    this.level[i] = 0;
    this.road[i] = 1;
    this.accessDirty = true;
    this.emit(i, 'road');
  }

  placeZone(i, z) {
    this.feature[i] = FEATURE.NONE;
    this.zone[i] = z;
    this.level[i] = 0;
    this.emit(i, 'zone');
  }

  bulldoze(i) {
    const hadRoad = this.road[i];
    this.clearTile(i);
    if (hadRoad) this.accessDirty = true;
    this.emit(i, hadRoad ? 'road' : 'bulldoze');
  }

  setBuilding(i, level, variant, rot) {
    const prev = this.level[i];
    this.level[i] = level;
    this.variant[i] = variant;
    this.rot[i] = rot;
    this.emit(i, level > prev ? 'grow' : 'shrink');
  }

  // 도로 접근성 (맨해튼 거리 ROAD_REACH 이내)
  updateAccess() {
    if (!this.accessDirty) return;
    this.accessDirty = false;
    const R = ROAD_REACH;
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      let ok = 0;
      for (let dz = -R; dz <= R && !ok; dz++) {
        const rem = R - Math.abs(dz);
        for (let dx = -rem; dx <= rem; dx++) {
          const nx = x + dx, nz = z + dz;
          if (this.inBounds(nx, nz) && this.road[this.idx(nx, nz)]) { ok = 1; break; }
        }
      }
      this.access[this.idx(x, z)] = ok;
    }
  }

  // 건물이 바라볼 방향: 가장 가까운 도로 쪽 (0=북 1=동 2=남 3=서)
  facing(i) {
    const [x, z] = this.xz(i);
    for (let r = 1; r <= ROAD_REACH; r++) {
      for (let k = 0; k < 4; k++) {
        const [dx, dz] = DIRS[k];
        const nx = x + dx * r, nz = z + dz * r;
        if (this.inBounds(nx, nz) && this.road[this.idx(nx, nz)]) return k;
      }
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dz) !== r) continue;
        const nx = x + dx, nz = z + dz;
        if (this.inBounds(nx, nz) && this.road[this.idx(nx, nz)]) {
          if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 1 : 3;
          return dz > 0 ? 2 : 0;
        }
      }
    }
    return 2;
  }

  serialize() {
    const o = { w: this.w, h: this.h, seed: this.seed };
    for (const f of FIELDS) o[f] = Array.from(this[f]);
    return o;
  }

  load(o) {
    if (o.w !== this.w || o.h !== this.h) throw new Error('map size mismatch');
    this.seed = o.seed;
    for (const f of FIELDS) this[f].set(o[f]);
    this.accessDirty = true;
    this.emit(-1, 'all');
  }
}
