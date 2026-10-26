// 복셀 모델과 메시 생성기 (면 컬링 + 꼭짓점 앰비언트 오클루전)
import * as THREE from 'three';
import { VOXEL } from './config.js';

// 각 면: 법선, 밝기(마크처럼 면마다 다른 명암), 단위 큐브 꼭짓점(반시계)
export const FACES = [
  { n: [1, 0, 0], kind: 'side', shade: 0.68, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], kind: 'side', shade: 0.68, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], kind: 'top', shade: 1.0, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], kind: 'bottom', shade: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], kind: 'side', shade: 0.84, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], kind: 'side', shade: 0.84, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const CORNER_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];

const lin = (s) => Math.pow(s, 2.2);

export class GeoBuilder {
  constructor() {
    this.pos = [];
    this.uv = [];
    this.col = [];
    this.idx = [];
  }
  // p: 꼭짓점 4개, r: 아틀라스 UV 사각형, s: 밝기(숫자 또는 4개 배열)
  quad(p, r, s, flip = false) {
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pos.push(p[k][0], p[k][1], p[k][2]);
      const [a, b] = CORNER_UV[k];
      this.uv.push(r.u0 + a * (r.u1 - r.u0), r.vb + b * (r.vt - r.vb));
      const v = lin(Array.isArray(s) ? s[k] : s);
      this.col.push(v, v, v);
    }
    if (flip) this.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  get empty() { return this.idx.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export class VoxelModel {
  constructor(w, h, d) {
    this.w = w; this.h = h; this.d = d;
    this.data = new Array(w * h * d).fill(null);
    this.smoke = [];   // 굴뚝 연기 위치 (복셀 좌표)
  }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  get(x, y, z) { return this.inside(x, y, z) ? this.data[(y * this.d + z) * this.w + x] : null; }
  set(x, y, z, b) { if (this.inside(x, y, z)) this.data[(y * this.d + z) * this.w + x] = b; return this; }
  fill(x0, y0, z0, x1, y1, z1, b) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, b);
    return this;
  }
  // 바깥 둘레(모서리 제외)에만 창문 블록 배치
  windows(x0, y0, z0, x1, y1, z1, b, rowOk = () => true, corners = false) {
    for (let y = y0; y <= y1; y++) {
      if (!rowOk(y)) continue;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const ex = x === x0 || x === x1, ez = z === z0 || z === z1;
        if (!(ex || ez)) continue;
        if (ex && ez && !corners) continue;
        this.set(x, y, z, b);
      }
    }
    return this;
  }
}

export function meshVoxels(model, blocks, atlas, scale = VOXEL) {
  const gb = new GeoBuilder();
  const ox = -model.w / 2, oz = -model.d / 2;
  const solid = (x, y, z) => (model.get(x, y, z) ? 1 : 0);
  for (let y = 0; y < model.h; y++) for (let z = 0; z < model.d; z++) for (let x = 0; x < model.w; x++) {
    const b = model.get(x, y, z);
    if (!b) continue;
    const def = blocks[b];
    if (!def) throw new Error('unknown block ' + b);
    for (const f of FACES) {
      const px = x + f.n[0], py = y + f.n[1], pz = z + f.n[2];
      if (solid(px, py, pz)) continue;
      const tex = f.kind === 'top' ? def.top : f.kind === 'bottom' ? def.bottom : def.side;
      const r = atlas.uv(tex);
      const verts = [], shades = [], aos = [];
      for (const c of f.c) {
        const axes = [0, 1, 2].filter(a => f.n[a] === 0);
        const d1 = [0, 0, 0], d2 = [0, 0, 0];
        d1[axes[0]] = c[axes[0]] ? 1 : -1;
        d2[axes[1]] = c[axes[1]] ? 1 : -1;
        const s1 = solid(px + d1[0], py + d1[1], pz + d1[2]);
        const s2 = solid(px + d2[0], py + d2[1], pz + d2[2]);
        const cr = solid(px + d1[0] + d2[0], py + d1[1] + d2[1], pz + d1[2] + d2[2]);
        const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
        aos.push(ao);
        shades.push(f.shade * AO_CURVE[ao]);
        verts.push([(x + c[0] + ox) * scale, (y + c[1]) * scale, (z + c[2] + oz) * scale]);
      }
      gb.quad(verts, r, shades, aos[0] + aos[2] < aos[1] + aos[3]);
    }
  }
  return gb.build();
}
