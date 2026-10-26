// three.js 렌더링: 지형 청크, 물, 인스턴스 건물/나무, 미리보기, 구름, 연기
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAtlas, createWaterTexture } from './textures.js';
import { buildModelGeometries, TREE_VARIANTS, ROCK_VARIANTS, variantCount } from './models.js';
import { GeoBuilder, FACES } from './voxel.js';
import { CHUNK, TERRAIN, FEATURE, ZONE_KEYS } from './config.js';
import { DIRS } from './world.js';
import { hash2 } from './noise.js';

const SKY = 0xa8d8ff;
const WATER_Y = -0.12;
const FLOOR_Y = -0.5;
const SIDE_FACE = [5, 0, 4, 1];                 // 북 동 남 서 → FACES 인덱스
const ROT_ANGLE = [Math.PI, Math.PI / 2, 0, -Math.PI / 2]; // 정면(+z)을 북/동/남/서로

class InstPool {
  constructor(scene, geometry, material, opts = {}) {
    this.scene = scene;
    this.geometry = geometry;
    this.material = material;
    this.opts = opts;
    this.capacity = 0;
    this.mesh = null;
  }
  ensure(n) {
    if (n <= this.capacity && this.mesh) return;
    const cap = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(1, n))));
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose(); }
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, cap);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.opts.color) this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    if (this.opts.renderOrder) this.mesh.renderOrder = this.opts.renderOrder;
    this.capacity = cap;
    this.scene.add(this.mesh);
  }
  commit(n) {
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

function softShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 8, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Renderer {
  constructor(container, world) {
    this.world = world;
    this.container = container;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(SKY);
    container.appendChild(r.domElement);
    this.canvas = r.domElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 90, 220);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 500);
    const c = this.controls = new OrbitControls(this.camera, this.canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.screenSpacePanning = false;
    c.minDistance = 5;
    c.maxDistance = 120;
    c.minPolarAngle = 0.15;
    c.maxPolarAngle = 1.32;
    c.zoomToCursor = true;
    c.rotateSpeed = 0.6;
    this.setHandMode(false);
    this.resetCamera();

    this.atlas = createAtlas(r.capabilities.getMaxAnisotropy());
    this.material = new THREE.MeshBasicMaterial({ map: this.atlas.texture, vertexColors: true });
    this.models = buildModelGeometries(this.atlas);

    // 지형 청크
    this.cw = Math.ceil(world.w / CHUNK);
    this.ch = Math.ceil(world.h / CHUNK);
    this.chunks = new Array(this.cw * this.ch).fill(null);
    this.dirtyChunks = new Set();
    for (let k = 0; k < this.chunks.length; k++) this.dirtyChunks.add(k);

    // 물
    this.waterTex = createWaterTexture();
    this.waterMat = new THREE.MeshBasicMaterial({ map: this.waterTex, transparent: true, opacity: 0.8, vertexColors: true, depthWrite: false });
    this.waterMesh = null;
    this.waterDirty = true;

    // 인스턴스 풀
    this.pools = new Map();
    for (const [key, m] of this.models) this.pools.set(key, new InstPool(this.scene, m.geometry, this.material));
    this.shadowPool = new InstPool(this.scene, new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: softShadowTexture(), color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.objectsDirty = true;
    this.born = new Float32Array(world.n).fill(-10);
    this.emitters = [];

    this.initPreview();
    this.initClouds();
    this.initParticles();

    this.now = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._yAxis = new THREE.Vector3(0, 1, 0);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    world.onChange((i, kind) => this.onTileChange(i, kind));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------------- 카메라 ----------------
  resetCamera() {
    const cx = this.world.w / 2, cz = this.world.h / 2;
    this.controls.target.set(cx, 0, cz);
    this.camera.position.set(cx - 26, 30, cz + 26);
    this.controls.update();
  }

  setHandMode(on) {
    const c = this.controls;
    c.mouseButtons = { LEFT: on ? THREE.MOUSE.PAN : null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    c.touches = { ONE: on ? THREE.TOUCH.PAN : null, TWO: THREE.TOUCH.DOLLY_PAN };
  }

  panBy(fx, rx) {
    const cam = this.camera, t = this.controls.target;
    const fwd = this._v.subVectors(t, cam.position).setY(0);
    if (fwd.lengthSq() < 1e-6) return;
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const scale = cam.position.distanceTo(t) * 0.02;
    const d = fwd.multiplyScalar(fx * scale).add(right.multiplyScalar(rx * scale));
    t.add(d);
    cam.position.add(d);
  }

  rotateBy(a) {
    const t = this.controls.target;
    const off = this.camera.position.clone().sub(t).applyAxisAngle(this._yAxis, a);
    this.camera.position.copy(t).add(off);
  }

  zoomBy(f) {
    const t = this.controls.target;
    const off = this.camera.position.clone().sub(t);
    const len = THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(t).add(off.setLength(len));
  }

  clampTarget() {
    const t = this.controls.target;
    const cx = THREE.MathUtils.clamp(t.x, 0, this.world.w), cz = THREE.MathUtils.clamp(t.z, 0, this.world.h);
    const dx = cx - t.x, dz = cz - t.z;
    if (dx || dz || t.y !== 0) {
      const dy = -t.y;
      t.set(cx, 0, cz);
      this.camera.position.x += dx;
      this.camera.position.z += dz;
      this.camera.position.y += dy;
    }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const p = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());
    if (!p) return null;
    const x = Math.floor(p.x), z = Math.floor(p.z);
    return this.world.inBounds(x, z) ? [x, z] : null;
  }

  // ---------------- 변경 감지 ----------------
  onTileChange(i, kind) {
    if (i < 0) {
      for (let k = 0; k < this.chunks.length; k++) this.dirtyChunks.add(k);
      this.waterDirty = true;
      this.objectsDirty = true;
      this.born.fill(-10);
      return;
    }
    const [x, z] = this.world.xz(i);
    this.markChunk(x, z);
    if (kind === 'road') for (const [dx, dz] of DIRS) this.markChunk(x + dx, z + dz);
    if (kind === 'grow') {
      this.born[i] = this.now;
      this.spawnDust(x + 0.5, z + 0.5);
    }
    if (kind === 'bulldoze' || kind === 'road') this.spawnDust(x + 0.5, z + 0.5, 4);
    this.objectsDirty = true;
  }

  markChunk(x, z) {
    if (!this.world.inBounds(x, z)) return;
    this.dirtyChunks.add(Math.floor(z / CHUNK) * this.cw + Math.floor(x / CHUNK));
  }

  // ---------------- 지형 ----------------
  topTexture(i, x, z) {
    const w = this.world;
    if (w.road[i]) return 'road' + w.roadMask(x, z);
    const zk = ZONE_KEYS[w.zone[i]];
    if (zk) return (w.level[i] > 0 ? 'lot_' : 'zone_') + zk;
    if (w.terrain[i] === TERRAIN.SAND) return 'sand' + (hash2(x, z, 3) < 0.5 ? 0 : 1);
    return 'grass' + w.grassVariant(i);
  }

  addTop(gb, x, y, z, rect) {
    const f = FACES[2];
    gb.quad(f.c.map(c => [x + c[0], y, z + c[2]]), rect, f.shade);
  }

  addSide(gb, x, z, k, yTop, yBot, rect) {
    const f = FACES[SIDE_FACE[k]];
    gb.quad(f.c.map(c => [x + c[0], c[1] ? yTop : yBot, z + c[2]]), rect, f.shade);
  }

  buildChunk(k) {
    const w = this.world, A = this.atlas, gb = new GeoBuilder();
    const cx = k % this.cw, cz = Math.floor(k / this.cw);
    const dirtFull = A.uv('dirtside'), dirtTop = A.uv('dirtside', { x0: 0, y0: 0, x1: 1, y1: 0.5 });
    const dirtLow = A.uv('dirtside', { x0: 0, y0: 0.5, x1: 1, y1: 1 }), stone = A.uv('stoneside');
    for (let z = cz * CHUNK; z < Math.min(w.h, (cz + 1) * CHUNK); z++) {
      for (let x = cx * CHUNK; x < Math.min(w.w, (cx + 1) * CHUNK); x++) {
        const i = w.idx(x, z);
        if (w.terrain[i] === TERRAIN.WATER) {
          this.addTop(gb, x, FLOOR_Y, z, A.uv('sand1'));
          DIRS.forEach(([dx, dz], d) => {
            if (w.inBounds(x + dx, z + dz)) return;
            this.addSide(gb, x, z, d, FLOOR_Y, -1, dirtLow);
            this.addSide(gb, x, z, d, -1, -2, stone);
          });
        } else {
          this.addTop(gb, x, 0, z, A.uv(this.topTexture(i, x, z)));
          DIRS.forEach(([dx, dz], d) => {
            const nx = x + dx, nz = z + dz;
            if (!w.inBounds(nx, nz)) {
              this.addSide(gb, x, z, d, 0, -1, dirtFull);
              this.addSide(gb, x, z, d, -1, -2, stone);
            } else if (w.terrain[w.idx(nx, nz)] === TERRAIN.WATER) {
              this.addSide(gb, x, z, d, 0, FLOOR_Y, dirtTop);
            }
          });
        }
      }
    }
    const old = this.chunks[k];
    if (old) { this.scene.remove(old); old.geometry.dispose(); }
    const mesh = new THREE.Mesh(gb.build(), this.material);
    this.chunks[k] = mesh;
    this.scene.add(mesh);
  }

  buildWater() {
    const w = this.world, gb = new GeoBuilder();
    for (let z = 0; z < w.h; z++) for (let x = 0; x < w.w; x++) {
      if (w.terrain[w.idx(x, z)] !== TERRAIN.WATER) continue;
      this.addTop(gb, x, WATER_Y, z, { u0: x, u1: x + 1, vt: -z, vb: -z - 1 });
      DIRS.forEach(([dx, dz], d) => {
        if (!w.inBounds(x + dx, z + dz)) this.addSide(gb, x, z, d, WATER_Y, FLOOR_Y, { u0: 0, u1: 1, vt: 0.38, vb: 0 });
      });
    }
    if (this.waterMesh) { this.scene.remove(this.waterMesh); this.waterMesh.geometry.dispose(); }
    this.waterMesh = new THREE.Mesh(gb.build(), this.waterMat);
    this.waterMesh.renderOrder = 1;
    this.scene.add(this.waterMesh);
  }

  // ---------------- 건물/나무 인스턴스 ----------------
  rebuildObjects() {
    const w = this.world;
    const buckets = new Map();
    const shadows = [];
    this.emitters.length = 0;
    let animating = false;
    const m = this._m, q = this._q, p = this._v, s = this._s;
    const put = (key, x, z, angle, sy, ox = 0, oz = 0) => {
      let arr = buckets.get(key);
      if (!arr) buckets.set(key, (arr = []));
      arr.push(x + 0.5 + ox, z + 0.5 + oz, angle, sy);
    };
    for (let i = 0; i < w.n; i++) {
      const x = i % w.w, z = (i - x) / w.w;
      if (w.zone[i] && w.level[i] > 0) {
        const zone = w.zone[i], L = w.level[i];
        const key = `b${zone}${L}${w.variant[i] % variantCount(zone, L)}`;
        const model = this.models.get(key);
        const t = (this.now - this.born[i]) / 0.7;
        let sy = 1;
        if (t < 1) {
          animating = true;
          const k = Math.max(0, t);
          sy = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // easeOutBack
          sy = Math.max(0.02, sy);
        }
        const angle = ROT_ANGLE[w.rot[i] & 3];
        put(key, x, z, angle, sy);
        const big = Math.min(1.6, 1.05 + model.height * 0.08);
        shadows.push(x + 0.5 + 0.08 * big, z + 0.5 + 0.08 * big, big);
        if (model.smoke.length && t >= 1) {
          const cs = Math.cos(angle), sn = Math.sin(angle);
          for (const [ox, oy, oz] of model.smoke) {
            this.emitters.push(x + 0.5 + ox * cs + oz * sn, oy, z + 0.5 - ox * sn + oz * cs);
          }
        }
      } else if (w.feature[i] === FEATURE.TREE) {
        const v = w.featVar[i];
        const ox = ((v >> 3) % 3 - 1) * 0.2, oz = ((v >> 5) % 3 - 1) * 0.2;
        put('tree' + (v % TREE_VARIANTS), x, z, ROT_ANGLE[w.rot[i] & 3], 1, ox, oz);
        shadows.push(x + 0.55 + ox, z + 0.55 + oz, 0.95);
      } else if (w.feature[i] === FEATURE.ROCK) {
        put('rock' + (w.featVar[i] % ROCK_VARIANTS), x, z, ROT_ANGLE[w.rot[i] & 3], 1);
      }
    }
    for (const [key, pool] of this.pools) {
      const arr = buckets.get(key) || [];
      const n = arr.length / 4;
      if (n === 0 && !pool.mesh) continue;
      pool.ensure(n);
      for (let k = 0; k < n; k++) {
        p.set(arr[k * 4], 0, arr[k * 4 + 1]);
        q.setFromAxisAngle(this._yAxis, arr[k * 4 + 2]);
        s.set(1, arr[k * 4 + 3], 1);
        m.compose(p, q, s);
        pool.mesh.setMatrixAt(k, m);
      }
      pool.commit(n);
    }
    const sn = shadows.length / 3;
    this.shadowPool.ensure(sn);
    q.identity();
    for (let k = 0; k < sn; k++) {
      p.set(shadows[k * 3], 0.012, shadows[k * 3 + 1]);
      s.set(shadows[k * 3 + 2], 1, shadows[k * 3 + 2]);
      m.compose(p, q, s);
      this.shadowPool.mesh.setMatrixAt(k, m);
    }
    this.shadowPool.commit(sn);
    this.objectsDirty = animating;
  }

  // ---------------- 미리보기/커서 ----------------
  initPreview() {
    const geo = new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    this.previewPool = new InstPool(this.scene, geo, mat, { color: true, renderOrder: 3 });
    this.previewPool.ensure(256);
    this.previewPool.commit(0);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    this.cursor = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    this.cursor.visible = false;
    this.cursor.renderOrder = 4;
    this.scene.add(this.cursor);
  }

  setPreview(items, color) {
    const pool = this.previewPool;
    pool.ensure(items.length);
    const col = new THREE.Color();
    const bad = new THREE.Color(0xff3030);
    const m = this._m;
    items.forEach((it, k) => {
      const x = it.i % this.world.w, z = Math.floor(it.i / this.world.w);
      m.makeTranslation(x + 0.5, 0.05, z + 0.5);
      pool.mesh.setMatrixAt(k, m);
      pool.mesh.setColorAt(k, it.ok ? col.setHex(color) : bad);
    });
    pool.commit(items.length);
  }

  clearPreview() { this.previewPool.commit(0); }

  setCursor(tile, color = 0xffffff) {
    if (!tile) { this.cursor.visible = false; return; }
    const w = this.world, i = w.idx(tile[0], tile[1]);
    let h = 0.08;
    if (w.zone[i] && w.level[i] > 0) {
      const key = `b${w.zone[i]}${w.level[i]}${w.variant[i] % variantCount(w.zone[i], w.level[i])}`;
      h = this.models.get(key).height;
    }
    this.cursor.visible = true;
    this.cursor.material.color.setHex(color);
    this.cursor.scale.set(1.02, h, 1.02);
    this.cursor.position.set(tile[0] + 0.5, h / 2, tile[1] + 0.5);
  }

  // ---------------- 구름 ----------------
  initClouds() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, depthWrite: false });
    this.clouds = [];
    const rng = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    for (let k = 0; k < 14; k++) {
      const cx = rng() * (this.world.w + 60) - 30, cz = rng() * (this.world.h + 40) - 20, y = 16 + rng() * 4;
      const parts = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < parts; j++) {
        this.clouds.push({
          x: cx + (rng() - 0.5) * 5, y: y + (j % 2) * 0.4, z: cz + (rng() - 0.5) * 4,
          sx: 3 + rng() * 5, sz: 2 + rng() * 4,
        });
      }
    }
    this.cloudMesh = new THREE.InstancedMesh(geo, mat, this.clouds.length);
    this.cloudMesh.renderOrder = 5;
    this.cloudMesh.frustumCulled = false;
    this.scene.add(this.cloudMesh);
  }

  updateClouds(dt) {
    const m = this._m, span = this.world.w + 80;
    this.clouds.forEach((c, k) => {
      c.x += dt * 0.6;
      if (c.x > this.world.w + 40) c.x -= span;
      m.makeScale(c.sx, 0.7, c.sz).setPosition(c.x, c.y, c.z);
      this.cloudMesh.setMatrixAt(k, m);
    });
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------- 연기/먼지 입자 ----------------
  initParticles() {
    this.maxParticles = 600;
    this.particles = [];
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
    this.particleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, this.maxParticles);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.renderOrder = 2;
    this.particleMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.particleMesh.count = 0;
    this.scene.add(this.particleMesh);
    this.smokeAcc = 0;
  }

  spawn(p) { if (this.particles.length < this.maxParticles) this.particles.push(p); }

  spawnDust(x, z, n = 8) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn({
        x: x + Math.cos(a) * 0.3, y: 0.1, z: z + Math.sin(a) * 0.3,
        vx: Math.cos(a) * 0.6, vy: 0.5 + Math.random() * 0.5, vz: Math.sin(a) * 0.6,
        life: 0, max: 0.5 + Math.random() * 0.3, size: 0.12, grow: 0.1, color: 0xd8c8a8,
      });
    }
  }

  updateParticles(dt) {
    this.smokeAcc += dt;
    if (this.smokeAcc > 0.12) {
      this.smokeAcc = 0;
      const e = this.emitters;
      for (let k = 0; k < e.length; k += 3) {
        if (Math.random() < 0.3) {
          this.spawn({
            x: e[k] + (Math.random() - 0.5) * 0.08, y: e[k + 1], z: e[k + 2] + (Math.random() - 0.5) * 0.08,
            vx: 0.12 + Math.random() * 0.08, vy: 0.45 + Math.random() * 0.2, vz: 0.05 * (Math.random() - 0.5),
            life: 0, max: 2.2 + Math.random(), size: 0.08, grow: 0.08, color: Math.random() < 0.5 ? 0xbfbfbf : 0xd9d9d9,
          });
        }
      }
    }
    const m = this._m, col = new THREE.Color();
    let n = 0;
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.life += dt;
      if (p.life >= p.max) { this.particles[k] = this.particles[this.particles.length - 1]; this.particles.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vx *= 0.99; p.vz *= 0.99;
    }
    for (const p of this.particles) {
      const t = p.life / p.max;
      const sz = (p.size + p.grow * p.life) * (t > 0.7 ? (1 - t) / 0.3 : 1);
      m.makeScale(sz, sz, sz).setPosition(p.x, p.y, p.z);
      this.particleMesh.setMatrixAt(n, m);
      this.particleMesh.setColorAt(n, col.setHex(p.color));
      n++;
    }
    this.particleMesh.count = n;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  // ---------------- 프레임 ----------------
  update(dt) {
    this.now += dt;
    let budget = 6;
    for (const k of this.dirtyChunks) {
      this.buildChunk(k);
      this.dirtyChunks.delete(k);
      if (--budget <= 0) break;
    }
    if (this.waterDirty) { this.buildWater(); this.waterDirty = false; }
    if (this.objectsDirty) this.rebuildObjects();
    this.waterTex.offset.x = (this.waterTex.offset.x + dt * 0.03) % 1;
    this.waterTex.offset.y = Math.sin(this.now * 0.4) * 0.05;
    this.updateClouds(dt);
    this.updateParticles(dt);
    this.controls.update();
    this.clampTarget();
    this.renderer.render(this.scene, this.camera);
  }

  // 아이콘: 아틀라스의 한 칸을 캔버스로 복사
  iconCanvas(name, size = 40) {
    const r = this.atlas.rects[name];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(this.atlas.canvas, r.x, r.y, r.w, r.h, 0, 0, size, size);
    return c;
  }
}
