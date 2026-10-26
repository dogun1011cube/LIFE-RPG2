// 픽셀시티: 마인크래프트 느낌의 3D 도시 건설 게임
import { World } from './world.js';
import { Sim } from './sim.js';
import { Renderer } from './scene.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { dragTiles, evaluate, applyTool, TOOL_COLORS } from './tools.js';
import { SAVE_KEY } from './config.js';

class Game {
  constructor() {
    this.world = new World();
    this.sim = new Sim(this.world);
    this.renderer = new Renderer(document.getElementById('view'), this.world);
    this.tool = 'hand';
    this.lastSpeed = 1;
    this.pending = null;
    this.inspected = null;
    this.ui = new UI(this);
    this.input = new Input(this);
    this.uiTimer = 0;
    this.infoTimer = 0;
  }

  start() {
    const saved = this.readSave();
    if (saved) {
      this.world.generate(saved.world.seed);
      this.ui.modal([['새 도시', () => this.newGame()], ['이어하기', () => this.load(saved)]], undefined, false);
    } else {
      this.world.generate();
      this.ui.modal([['시작하기', null]], undefined, false);
    }
    this.setTool('hand');
    this.ui.update(this.sim);
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.getElementById('loading').classList.add('hidden');
    window.__pixelcityStarted = true;
  }

  frame(dt) {
    this.input.update(dt);
    if (!this.ui.modalOpen) this.sim.update(dt);
    for (const ev of this.sim.events.splice(0)) {
      if (ev.type === 'toast') this.ui.toast(ev.text, ev.kind);
      if (ev.type === 'month') this.save(false);
    }
    this.renderer.update(dt);
    this.uiTimer += dt;
    if (this.uiTimer > 0.2) { this.uiTimer = 0; this.ui.update(this.sim); }
    if (this.inspected != null) {
      this.infoTimer += dt;
      if (this.infoTimer > 1) { this.infoTimer = 0; this.ui.showInfo(this.world, this.inspected); }
    }
  }

  // ---- 도구 ----
  setTool(id) {
    this.input.cancel();
    this.tool = id;
    this.renderer.setHandMode(id === 'hand');
    this.renderer.clearPreview();
    this.ui.setTool(id);
    this.ui.tooltip(0, 0, null);
  }

  hover(tile) {
    this.renderer.setCursor(tile, TOOL_COLORS[this.tool]);
  }

  updateDrag(drag, cx, cy) {
    const tiles = dragTiles(this.world, this.tool, drag.start, drag.cur);
    const ev = this.pending = evaluate(this.world, this.tool, tiles);
    this.renderer.setPreview(ev.items, TOOL_COLORS[this.tool]);
    this.renderer.setCursor(drag.cur, TOOL_COLORS[this.tool]);
    const over = ev.total > this.sim.money;
    this.ui.tooltip(cx, cy, `${ev.valid}칸 · <span class="${over ? 'bad' : 'good'}">$${ev.total.toLocaleString()}</span>`);
  }

  endDrag(commit) {
    const ev = this.pending;
    this.pending = null;
    this.renderer.clearPreview();
    this.ui.tooltip(0, 0, null);
    if (!commit || !ev) return;
    if (ev.valid === 0) {
      if (ev.items.length) this.ui.toast('여기에는 할 수 없어요', 'warn', 1600);
      return;
    }
    const r = applyTool(this.world, this.tool, ev, this.sim.money);
    this.sim.money -= r.spent;
    this.sim.recount();
    if (r.skipped) this.ui.toast(`자금이 부족해서 ${r.skipped}칸은 못 했어요`, 'warn');
    this.ui.update(this.sim);
    if (this.inspected != null) this.ui.showInfo(this.world, this.inspected);
  }

  inspect(tile) {
    this.inspected = tile ? this.world.idx(tile[0], tile[1]) : null;
    this.ui.showInfo(this.world, this.inspected);
    this.renderer.setCursor(tile, 0xffffff);
  }

  // ---- 시간/예산 ----
  setSpeed(s) {
    if (s > 0) this.lastSpeed = s;
    this.sim.speed = s;
    this.ui.update(this.sim);
  }
  togglePause() { this.setSpeed(this.sim.speed ? 0 : this.lastSpeed); }
  changeTax(d) {
    this.sim.tax = Math.max(0, Math.min(20, this.sim.tax + d));
    this.ui.update(this.sim);
  }

  // ---- 저장 ----
  readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  save(manual) {
    const cam = this.renderer.camera.position, t = this.renderer.controls.target;
    const data = {
      v: 1, world: this.world.serialize(), sim: this.sim.serialize(),
      cam: [cam.x, cam.y, cam.z, t.x, t.y, t.z],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      if (manual) this.ui.toast('저장했어요', 'good', 1500);
    } catch {
      if (manual) this.ui.toast('저장하지 못했어요 (브라우저 저장소 사용 불가)', 'warn');
    }
  }

  load(data) {
    try {
      this.world.load(data.world);
      this.sim.reset();
      this.sim.load(data.sim);
      if (data.cam) {
        this.renderer.camera.position.set(data.cam[0], data.cam[1], data.cam[2]);
        this.renderer.controls.target.set(data.cam[3], data.cam[4], data.cam[5]);
      }
      this.ui.toast('도시를 불러왔어요', 'good', 1500);
    } catch (err) {
      console.error(err);
      this.ui.toast('저장 파일을 읽지 못해 새 도시로 시작해요', 'warn');
      this.newGame();
    }
    this.ui.update(this.sim);
  }

  newGame() {
    this.world.generate();
    this.sim.reset();
    this.renderer.resetCamera();
    this.inspect(null);
    this.setTool('hand');
    this.ui.update(this.sim);
    this.ui.toast('새 땅이 준비됐어요! 2번 도로부터 깔아 보세요', 'good');
  }
}

const game = new Game();
window.game = game;
game.start();
