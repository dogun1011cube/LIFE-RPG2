// 마우스/터치/키보드 입력
import { TOOLS } from './tools.js';

export class Input {
  constructor(game) {
    this.game = game;
    const cv = this.canvas = game.renderer.canvas;
    this.pointers = new Map();
    this.drag = null;
    this.click = null;
    this.keys = new Set();
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.cancel(); });
    cv.addEventListener('pointerleave', () => { if (!this.drag) { game.hover(null); } });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
  }

  cancel() {
    if (this.drag) { this.drag = null; this.game.endDrag(false); }
    this.click = null;
  }

  onDown(e) {
    this.pointers.set(e.pointerId, true);
    if (this.pointers.size > 1) { this.cancel(); return; }
    if (e.button !== 0) return;
    const tile = this.game.renderer.pick(e.clientX, e.clientY);
    if (this.game.tool === 'hand') {
      this.click = { x: e.clientX, y: e.clientY, tile };
      return;
    }
    if (!tile) return;
    this.drag = { start: tile, cur: tile };
    this.game.updateDrag(this.drag, e.clientX, e.clientY);
  }

  onMove(e) {
    const tile = this.game.renderer.pick(e.clientX, e.clientY);
    if (this.click && Math.hypot(e.clientX - this.click.x, e.clientY - this.click.y) > 6) this.click = null;
    if (this.drag) {
      if (tile && (tile[0] !== this.drag.cur[0] || tile[1] !== this.drag.cur[1])) this.drag.cur = tile;
      this.game.updateDrag(this.drag, e.clientX, e.clientY);
    } else if (e.pointerType !== 'touch') {
      this.game.hover(tile, e.clientX, e.clientY);
    }
  }

  onUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.drag) {
      this.drag = null;
      this.game.endDrag(true);
    } else if (this.click) {
      this.game.inspect(this.click.tile);
      this.click = null;
    }
  }

  onKey(e, down) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (down) {
      if (this.game.ui.modalOpen) return;
      const tool = TOOLS.find(t => t.key === e.key);
      if (tool) { this.game.setTool(tool.id); return; }
      if (k === ' ') { e.preventDefault(); this.game.togglePause(); return; }
      if (k === 'escape') { this.cancel(); this.game.setTool('hand'); return; }
      this.keys.add(k);
    } else {
      this.keys.delete(k);
    }
  }

  update(dt) {
    const r = this.game.renderer, K = this.keys;
    const f = (K.has('w') || K.has('arrowup') ? 1 : 0) - (K.has('s') || K.has('arrowdown') ? 1 : 0);
    const s = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0);
    if (f || s) r.panBy(f * dt * 40, s * dt * 40);
    if (K.has('q')) r.rotateBy(dt * 1.6);
    if (K.has('e')) r.rotateBy(-dt * 1.6);
    if (K.has('=') || K.has('+')) r.zoomBy(1 - dt * 1.5);
    if (K.has('-') || K.has('_')) r.zoomBy(1 + dt * 1.5);
  }
}
