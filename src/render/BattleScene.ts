import { getMonster } from '../data/monsters';
import type { BgId } from '../data/world';
import type { BattleEvent, MonsterInstance } from '../game/battle';
import { drawAmbient, getBackground, GROUND_Y, VH, VW } from './backgrounds';
import { makeCanvas, monsterCanvas, silhouette, spriteCanvas } from './draw';
import type { HeroSpriteId } from './sprites';

// ─────────────────────────────────────────────────────────────
// Canvas battle renderer (logical 320×180, scaled up pixelated).
// The battle engine produces BattleEvents; `play(ev)` animates each
// one and resolves when the animation is done.
// ─────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  t0: number;
  dur: number;
  color: string;
  size: number;
  label?: string;
}

interface Fx {
  kind: string;
  t0: number;
  dur: number;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  color?: string;
  crit?: boolean;
}

interface SceneMonster {
  inst: MonsterInstance;
  img: HTMLCanvasElement;
  scale: number;
  slime: boolean;
  float: boolean;
  crown: boolean;
  x: number;
  y: number;
  alpha: number;
  offX: number;
  offY: number;
  flashUntil: number;
  shakeUntil: number;
  cut: { t0: number; alive: boolean } | null;
  dying: { t0: number; kind: 'cut' | 'dissolve' } | null;
  enterT0: number;
  charging: boolean;
  gone: boolean;
}

export const FX_COLOR: Record<string, string> = {
  orb: '#74c0fc', chain: '#69db7c', nova: '#ffe066', fire: '#ff922b', firepillar: '#ff922b', meteor: '#ff6b35',
  poison: '#94d82d', mist: '#82c91e', plague: '#b2f542', holy: '#ffe066', holypillar: '#fff3bf', judge: '#ffd43b',
};
export const MELEE_FX: string[] = ['slash', 'cleave', 'insight', 'gravity', 'melee'];

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export class BattleScene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  raf = 0;
  start0 = performance.now();
  bg: BgId = 'forest';
  heroImg: HTMLCanvasElement;
  heroAura: string | null = null;
  hero = { x: 72, y: GROUND_Y + 8, offX: 0, flashUntil: 0, flashColor: '#ff4d4d', guardUntil: 0, alpha: 1, down: false };
  monster: SceneMonster | null = null;
  particles: Particle[] = [];
  texts: FloatText[] = [];
  fx: Fx[] = [];
  shakeUntil = 0;
  shakeMag = 0;
  flash: { until: number; t0: number; color: string } | null = null;
  glitchUntil = 0;
  reduceMotion = false;
  speed = 1;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VW;
    canvas.height = VH;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.heroImg = spriteCanvas('hero');
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
  }

  get t() {
    return (performance.now() - this.start0) / 1000;
  }

  now() {
    return performance.now();
  }

  wait(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms / this.speed));
  }

  setBackground(bg: BgId) {
    this.bg = bg;
  }

  setHero(sprite: HeroSpriteId, palette: Record<string, string>, aura: string | null) {
    this.heroImg = spriteCanvas(sprite, palette);
    this.heroAura = aura;
  }

  setMonster(inst: MonsterInstance, entering = true) {
    const def = getMonster(inst.defId);
    const scale = Math.round(4 * (def.scale ?? 1) * 2) / 2;
    this.monster = {
      inst,
      img: monsterCanvas(inst.defId),
      scale,
      slime: def.family === 'slime' || def.sprite === 'slime',
      float: !!def.float,
      crown: !!def.crown,
      x: 228,
      y: GROUND_Y + 10,
      alpha: entering ? 0 : 1,
      offX: 0,
      offY: 0,
      flashUntil: 0,
      shakeUntil: 0,
      cut: null,
      dying: null,
      enterT0: entering ? this.now() : 0,
      charging: false,
      gone: false,
    };
  }

  monsterCenter() {
    const m = this.monster;
    if (!m) return { x: 228, y: 110, w: 40, h: 40 };
    const w = m.img.width * m.scale;
    const h = m.img.height * m.scale;
    return { x: m.x, y: m.y - h / 2 + (m.float ? -8 : 0), w, h };
  }

  heroCenter() {
    return { x: this.hero.x + this.hero.offX, y: this.hero.y - 26 };
  }

  // ── particles & texts ──
  burst(x: number, y: number, color: string | string[], n: number, speed = 60, grav = 80, size = 2, life = 0.7) {
    if (this.reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.3,
        life: life * (0.6 + Math.random() * 0.6),
        max: life,
        color: Array.isArray(color) ? color[i % color.length] : color,
        size,
        grav,
      });
    }
  }

  text(text: string, x: number, y: number, color: string, size = 12, label?: string, dur = 950) {
    this.texts.push({ text, x, y, t0: this.now(), dur, color, size, label });
  }

  shake(ms: number, mag: number) {
    if (this.reduceMotion) return;
    this.shakeUntil = this.now() + ms;
    this.shakeMag = mag;
  }

  screenFlash(color: string, ms: number) {
    this.flash = { until: this.now() + ms, t0: this.now(), color };
  }

  addFx(f: Omit<Fx, 't0'>) {
    this.fx.push({ ...f, t0: this.now() });
  }

  // ── tweens ──
  tween(ms: number, fn: (k: number) => void) {
    return new Promise<void>((resolve) => {
      const t0 = this.now();
      const dur = ms / this.speed;
      const step = () => {
        if (this.destroyed) return resolve();
        const k = Math.min(1, (this.now() - t0) / dur);
        fn(k);
        if (k >= 1) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async heroDash(out: number) {
    await this.tween(150, (k) => (this.hero.offX = ease(k) * out));
  }

  async heroBack() {
    const from = this.hero.offX;
    await this.tween(180, (k) => (this.hero.offX = from * (1 - easeInOut(k))));
  }

  async monsterLunge() {
    const m = this.monster;
    if (!m) return;
    await this.tween(130, (k) => (m.offX = -ease(k) * 34));
  }

  async monsterBack() {
    const m = this.monster;
    if (!m) return;
    const from = m.offX;
    await this.tween(170, (k) => (m.offX = from * (1 - easeInOut(k))));
  }

  monsterHit(crit: boolean, dies: boolean) {
    const m = this.monster;
    if (!m) return;
    const now = this.now();
    m.flashUntil = now + 120;
    m.shakeUntil = now + (crit ? 300 : 180);
    if (m.slime) m.cut = { t0: now, alive: !dies };
    const c = this.monsterCenter();
    this.burst(c.x, c.y, crit ? ['#ffe066', '#ffffff', '#ff922b'] : ['#ffffff', '#dee2e6'], crit ? 22 : 12, crit ? 110 : 70, 120);
    if (crit) {
      this.shake(260, 4);
      this.screenFlash('rgba(255,240,180,0.35)', 140);
    } else this.shake(120, 2);
  }

  // ── main entry ──
  async play(ev: BattleEvent): Promise<void> {
    const m = this.monster;
    switch (ev.k) {
      case 'pAttack': {
        const c = this.monsterCenter();
        const melee = MELEE_FX.includes(ev.fx);
        const dies = ev.mHp <= 0;
        const col = FX_COLOR[ev.fx] || '#74c0fc';
        if (melee) {
          if (ev.hitIndex === 0) await this.heroDash(48);
          if (ev.fx === 'insight') {
            this.addFx({ kind: 'reticle', dur: 260, x: c.x, y: c.y });
            await this.wait(220);
          }
          if (ev.fx === 'gravity') {
            this.addFx({ kind: 'gravity', dur: 520, x: c.x, y: c.y });
            await this.wait(260);
          }
          this.addFx({ kind: 'slash', dur: 240, x: c.x, y: c.y, crit: ev.crit, color: ev.fx === 'gravity' ? '#b197fc' : ev.fx === 'insight' ? '#ffe066' : ev.fx === 'cleave' ? '#ffa8a8' : '#ffffff' });
        } else if (ev.fx === 'firepillar' || ev.fx === 'holypillar') {
          this.addFx({ kind: 'pillar', dur: 520, x: c.x, y: c.y + c.h / 2, color: col });
          await this.wait(300);
          this.burst(c.x, c.y, [col, '#ffffff'], 18, 80, -30);
        } else if (ev.fx === 'nova' || ev.fx === 'meteor' || ev.fx === 'judge' || ev.fx === 'plague' || ev.fx === 'mist') {
          if (ev.fx === 'meteor') {
            this.addFx({ kind: 'pillar', dur: 450, x: c.x, y: c.y + c.h / 2, color: '#ff6b35' });
            await this.wait(240);
          }
          this.addFx({ kind: 'nova', dur: ev.fx === 'mist' ? 900 : 700, x: c.x, y: c.y, color: col });
          if (ev.fx !== 'mist') this.screenFlash(ev.fx === 'plague' ? 'rgba(160,230,60,0.35)' : ev.fx === 'meteor' ? 'rgba(255,140,60,0.5)' : 'rgba(255,250,220,0.6)', 260);
          await this.wait(300);
        } else {
          // projectile from the hero
          const h = this.heroCenter();
          this.addFx({ kind: 'orb', dur: 260, x: h.x + 10, y: h.y, x2: c.x, y2: c.y, color: col });
          await this.wait(250);
          this.burst(c.x, c.y, [col, '#ffffff'], 16, 90, 40);
        }
        if (ev.miss) {
          this.text('MISS', c.x, c.y - c.h / 2, '#adb5bd', 11);
          this.monsterDodge();
          await this.wait(220);
        } else {
          this.monsterHit(ev.crit, dies);
          const label = ev.crit ? 'CRITICAL!' : ev.aff === 'weak' ? 'WEAK!' : ev.aff === 'resist' ? 'RESIST' : ev.aff === 'immune' ? 'IMMUNE' : undefined;
          const color = ev.crit ? '#ffe066' : ev.aff === 'weak' ? '#ffa94d' : ev.aff === 'resist' || ev.aff === 'immune' ? '#adb5bd' : '#ffffff';
          this.text(String(ev.dmg), c.x + (ev.hitIndex - 1) * 10, c.y - c.h / 2 + 4, color, ev.crit ? 17 : 13, label);
          await this.wait(m?.slime ? 380 : 260);
        }
        if (melee && this.hero.offX !== 0) await this.heroBack();
        break;
      }
      case 'mDot': {
        const c = this.monsterCenter();
        const col = ev.kind === 'burn' ? ['#ff922b', '#ffe066', '#e03131'] : ['#94d82d', '#5c940d', '#b57bff'];
        if (this.monster) this.monster.flashUntil = this.now() + 90;
        this.burst(c.x, c.y + c.h / 4, col, 12, 40, ev.kind === 'burn' ? -50 : -20);
        this.text(String(ev.dmg), c.x, c.y - c.h / 2, ev.kind === 'burn' ? '#ffa94d' : '#b2f542', 12, ev.kind === 'burn' ? 'BURN' : 'POISON');
        await this.wait(420);
        break;
      }
      case 'pHeal': {
        const h = this.heroCenter();
        this.addFx({ kind: 'heal', dur: 700, x: h.x, y: h.y });
        if (ev.hp > 0) this.text('+' + ev.hp, h.x, h.y - 28, '#69db7c', 13);
        if (ev.mp > 0) this.text('+' + ev.mp + ' MP', h.x + 4, h.y - 16, '#74c0fc', 10);
        await this.wait(560);
        break;
      }
      case 'pBuff': {
        const h = this.heroCenter();
        this.addFx({ kind: 'buff', dur: 700, x: h.x, y: h.y + 20, color: '#ffd43b' });
        await this.wait(520);
        break;
      }
      case 'pDot': {
        const h = this.heroCenter();
        this.hero.flashUntil = this.now() + 140;
        this.hero.flashColor = '#9be15d';
        this.burst(h.x, h.y, ['#9be15d', '#5c940d', '#b57bff'], 10, 40, -20);
        this.text(String(ev.dmg), h.x, h.y - 30, '#b2f2bb', 12, 'POISON');
        await this.wait(420);
        break;
      }
      case 'pDefend': {
        this.hero.guardUntil = this.now() + 99999;
        const h = this.heroCenter();
        this.burst(h.x + 14, h.y, ['#74c0fc', '#d0ebff'], 10, 40, 0);
        await this.wait(300);
        break;
      }
      case 'mCharge': {
        if (m && ev.charge) m.charging = true;
        const c = this.monsterCenter();
        this.burst(c.x, c.y, ['#7048e8', '#212529', '#ff4d6d'], 18, 50, -30);
        this.text('!', c.x, c.y - c.h / 2 - 6, '#ff4d6d', 20, undefined, 800);
        await this.wait(650);
        break;
      }
      case 'mAttack': {
        if (!m) break;
        const h = this.heroCenter();
        const c = this.monsterCenter();
        if (m.charging) m.charging = false;
        if (ev.fx === 'magic' || ev.fx === 'death') {
          m.flashUntil = this.now() + 80;
          const col = ev.fx === 'death' ? '#9775fa' : '#ff6b6b';
          this.addFx({ kind: 'orb', dur: 280, x: c.x - 10, y: c.y, x2: h.x, y2: h.y, color: col });
          await this.wait(270);
        } else if (ev.fx === 'breath') {
          this.addFx({ kind: 'breath', dur: 600, x: c.x - 12, y: c.y, x2: h.x, y2: h.y });
          await this.wait(450);
        } else if (ev.fx === 'doom') {
          this.addFx({ kind: 'doom', dur: 900, x: VW / 2, y: VH / 2 - 10 });
          this.screenFlash('rgba(255,0,40,0.55)', 500);
          await this.wait(500);
        } else if (ev.fx === 'glitch') {
          this.glitchUntil = this.now() + 520;
          await this.wait(360);
        } else if (ev.fx === 'gold') {
          this.addFx({ kind: 'coins', dur: 600, x: h.x, y: 20 });
          await this.wait(380);
        } else {
          await this.monsterLunge();
        }
        const guarded = ev.guarded;
        if (ev.miss) {
          this.text('MISS', h.x, h.y - 30, '#adb5bd', 11);
          await this.tween(160, (k) => (this.hero.offX = -Math.sin(k * Math.PI) * 10));
        } else {
          this.hero.flashUntil = this.now() + 160;
          this.hero.flashColor = ev.fx === 'dark' || ev.fx === 'death' ? '#9775fa' : '#ff4d4d';
          this.burst(h.x, h.y, guarded ? ['#74c0fc', '#ffffff'] : ['#ff6b6b', '#ffffff'], 12, 70, 120);
          this.shake(ev.crit || ev.dmg > 0 ? 200 : 100, ev.fx === 'doom' || ev.fx === 'dark' ? 5 : 3);
          this.text(String(ev.dmg), h.x, h.y - 30, guarded ? '#a5d8ff' : '#ff8787', ev.crit ? 16 : 13, guarded ? 'GUARD' : ev.crit ? 'CRITICAL!' : undefined);
          if (ev.fx === 'dark') this.addFx({ kind: 'slash', dur: 240, x: h.x, y: h.y, color: '#9775fa' });
        }
        if (m.offX !== 0) await this.monsterBack();
        await this.wait(200);
        this.hero.guardUntil = 0;
        break;
      }
      case 'mHeal': {
        const c = this.monsterCenter();
        this.burst(c.x, c.y, ['#69db7c', '#d3f9d8'], 14, 40, -40);
        this.text('+' + ev.hp, c.x, c.y - c.h / 2, '#69db7c', 12);
        await this.wait(450);
        break;
      }
      case 'mBuff': {
        const c = this.monsterCenter();
        this.addFx({ kind: 'buff', dur: 600, x: c.x, y: c.y + c.h / 2, color: '#ff6b6b' });
        await this.wait(500);
        break;
      }
      case 'mRevive': {
        if (!m) break;
        m.cut = null;
        m.dying = null;
        m.gone = false;
        m.alpha = 0;
        await this.tween(500, (k) => {
          m.alpha = k;
          m.offX = Math.sin(k * 40) * (1 - k) * 4;
        });
        m.offX = 0;
        break;
      }
      case 'mDefeated': {
        if (!m) break;
        m.charging = false;
        if (m.slime) {
          m.dying = { t0: this.now(), kind: 'cut' };
          setTimeout(() => {
            const c = this.monsterCenter();
            const pal = getMonster(m.inst.defId).colors?.b || '#51cf66';
            this.burst(c.x, m.y - 6, [pal, '#ffffff'], 26, 80, 160, 2, 0.9);
          }, 260 / this.speed);
          await this.wait(900);
        } else {
          this.dissolve();
          await this.wait(800);
        }
        m.gone = true;
        break;
      }
      case 'wave': {
        this.setMonster(ev.monster, true);
        await this.wait(500);
        break;
      }
      case 'escape': {
        if (ev.ok) {
          await this.tween(380, (k) => {
            this.hero.offX = -k * 90;
            this.hero.alpha = 1 - k;
          });
        }
        break;
      }
      case 'defeat': {
        this.hero.down = true;
        this.screenFlash('rgba(120,0,0,0.5)', 600);
        await this.wait(700);
        break;
      }
      case 'victory':
        await this.wait(200);
        break;
      default:
        break;
    }
  }

  monsterDodge() {
    const m = this.monster;
    if (!m) return;
    void this.tween(220, (k) => (m.offX = Math.sin(k * Math.PI) * 14));
  }

  dissolve() {
    const m = this.monster;
    if (!m) return;
    const img = m.img;
    const data = img.getContext('2d')!.getImageData(0, 0, img.width, img.height).data;
    const w = img.width * m.scale;
    const h = img.height * m.scale;
    const x0 = m.x - w / 2;
    const y0 = m.y - h + (m.float ? -8 : 0);
    const step = this.reduceMotion ? 2 : 1;
    for (let y = 0; y < img.height; y += step) {
      for (let x = 0; x < img.width; x += step) {
        const i = (y * img.width + x) * 4;
        if (data[i + 3] < 10) continue;
        const color = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
        this.particles.push({
          x: x0 + x * m.scale + m.scale / 2,
          y: y0 + y * m.scale + m.scale / 2,
          vx: (Math.random() - 0.5) * 50,
          vy: -20 - Math.random() * 60,
          life: 0.5 + Math.random() * 0.7,
          max: 1.2,
          color,
          size: m.scale,
          grav: -10,
        });
      }
    }
    m.alpha = 0;
    this.screenFlash('rgba(255,255,255,0.35)', 120);
  }

  // ── rendering ──
  private loop() {
    if (this.destroyed) return;
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  private lastFrame = performance.now();

  render() {
    const ctx = this.ctx;
    const now = this.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const t = this.t;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (now < this.shakeUntil) {
      ctx.translate(Math.round((Math.random() - 0.5) * this.shakeMag * 2), Math.round((Math.random() - 0.5) * this.shakeMag * 2));
    }
    ctx.drawImage(getBackground(this.bg), 0, 0);
    drawAmbient(ctx, this.bg, t);

    // shadows
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ellipse(ctx, this.hero.x + this.hero.offX, this.hero.y - 2, 14, 3);
    if (this.monster && !this.monster.gone && this.monster.alpha > 0.05) {
      const mw = this.monster.img.width * this.monster.scale;
      this.ellipse(ctx, this.monster.x + this.monster.offX, this.monster.y - 2, mw * 0.38, 4);
    }

    this.drawMonster(ctx, now, t);
    this.drawHero(ctx, now, t);
    this.drawFx(ctx, now);

    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);

    // floating numbers
    for (const ft of this.texts) {
      const k = (now - ft.t0) / ft.dur;
      if (k >= 1) continue;
      const pop = k < 0.12 ? 1.5 - (k / 0.12) * 0.5 : 1;
      const y = ft.y - ease(k) * 16;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const size = Math.round(ft.size * pop);
      ctx.font = `bold ${size}px Galmuri11, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0b0b14';
      ctx.strokeText(ft.text, Math.round(ft.x), Math.round(y));
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(y));
      if (ft.label) {
        ctx.font = 'bold 8px Galmuri11, monospace';
        ctx.lineWidth = 2;
        ctx.strokeText(ft.label, Math.round(ft.x), Math.round(y - size));
        ctx.fillStyle = ft.label === 'GUARD' ? '#a5d8ff' : '#ff922b';
        ctx.fillText(ft.label, Math.round(ft.x), Math.round(y - size));
      }
    }
    ctx.globalAlpha = 1;
    this.texts = this.texts.filter((ft) => now - ft.t0 < ft.dur);

    if (this.flash && now < this.flash.until) {
      const k = (now - this.flash.t0) / (this.flash.until - this.flash.t0);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(-10, -10, VW + 20, VH + 20);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (now < this.glitchUntil) this.applyGlitch();
  }

  private ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
    }
  }

  private drawHero(ctx: CanvasRenderingContext2D, now: number, t: number) {
    const h = this.hero;
    const scale = 3;
    const img = this.heroImg;
    const w = img.width * scale;
    const hh = img.height * scale;
    const bob = Math.round(Math.sin(t * 3) * 1);
    const x = Math.round(h.x + h.offX - w / 2);
    const y = Math.round(h.y - hh + (h.down ? 0 : bob));
    ctx.globalAlpha = h.alpha;
    if (this.heroAura) this.drawAura(ctx, h.x + h.offX, h.y - hh / 2, t);
    if (h.down) {
      ctx.save();
      ctx.translate(x + w / 2, h.y - 6);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, -hh / 2, -w / 2, w, hh);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, hh);
      if (now < h.flashUntil) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(silhouette(img, h.flashColor), x, y, w, hh);
      }
    }
    ctx.globalAlpha = 1;
    if (now < h.guardUntil) {
      const pulse = 0.5 + 0.3 * Math.sin(t * 10);
      ctx.strokeStyle = `rgba(116,192,252,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2 + 6, y + hh / 2, 26, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
    }
  }

  private drawAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
    for (let i = 0; i < 10; i++) {
      const a = t * 1.6 + (i / 10) * Math.PI * 2;
      const r = 20 + Math.sin(t * 3 + i) * 3;
      const color = this.heroAura === 'rainbow' ? `hsl(${(t * 120 + i * 36) % 360} 90% 65%)` : this.heroAura!;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1.3), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawMonster(ctx: CanvasRenderingContext2D, now: number, t: number) {
    const m = this.monster;
    if (!m || m.gone) return;
    if (m.enterT0) {
      const k = (now - m.enterT0) / 450;
      if (k < 1) {
        m.alpha = ease(k);
        m.offX = (1 - ease(k)) * 40;
      } else {
        m.enterT0 = 0;
        m.alpha = 1;
        m.offX = 0;
      }
    }
    if (m.alpha <= 0.01 && !m.dying) return;
    const img = m.img;
    const sc = m.scale;
    let w = img.width * sc;
    let h = img.height * sc;
    let sx = 1;
    let sy = 1;
    if (m.slime && !m.dying) {
      const k = Math.sin(t * 4);
      sy = 1 + 0.06 * k;
      sx = 1 - 0.045 * k;
    }
    const offY = m.float ? Math.sin(t * 2.2) * 4 - 8 : m.slime ? 0 : Math.round(Math.sin(t * 2.5));
    let shakeX = 0;
    if (now < m.shakeUntil) shakeX = Math.round((Math.random() - 0.5) * 6);
    // squash after reforming
    if (m.cut) {
      const ct = now - m.cut.t0;
      if (m.cut.alive && ct > 420 && ct < 760) {
        const k = (ct - 420) / 340;
        sy *= 1 - 0.18 * Math.sin(k * Math.PI) * (1 - k);
        sx *= 1 + 0.16 * Math.sin(k * Math.PI) * (1 - k);
      }
      if (ct > 760) m.cut = null;
    }
    w *= sx;
    h *= sy;
    const x = m.x + m.offX + shakeX - w / 2;
    const y = m.y - h + offY;

    // charging aura
    if (m.charging) {
      // pulsing dark outline + rising embers
      const pulse = 0.45 + 0.35 * Math.sin(t * 12);
      const sil = silhouette(img, '#7048e8');
      ctx.globalAlpha = pulse;
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) ctx.drawImage(sil, Math.round(x + dx), Math.round(y + dy), Math.round(w), Math.round(h));
      ctx.globalAlpha = pulse * 0.6;
      ctx.drawImage(silhouette(img, '#ff4d6d'), Math.round(x - 1), Math.round(y - 1), Math.round(w + 2), Math.round(h + 2));
      ctx.globalAlpha = 1;
      if (Math.random() < 0.35) this.particles.push({ x: x + Math.random() * w, y: y + h, vx: 0, vy: -30 - Math.random() * 30, life: 0.7, max: 0.7, color: Math.random() < 0.5 ? '#7048e8' : '#ff4d6d', size: 2, grav: 0 });
    }

    ctx.globalAlpha = m.alpha;
    const cutState = this.cutState(m, now);
    if (cutState) {
      this.drawSplit(ctx, img, x, y, w, h, cutState.sep, cutState.fall, cutState.alpha, cutState.rot);
      if (cutState.puddle > 0) {
        const pal = getMonster(m.inst.defId).colors?.a || '#2b8a3e';
        ctx.globalAlpha = cutState.puddle * 0.9;
        ctx.fillStyle = pal;
        this.ellipse(ctx, m.x, m.y - 2, (w / 2) * (0.6 + 0.4 * cutState.puddle), 3);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      if (now < m.flashUntil) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(silhouette(img), Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      }
    }
    ctx.globalAlpha = m.alpha;
    if (m.crown && !(m.dying && now - m.dying.t0 > 200)) {
      const crown = spriteCanvas('crown');
      const cs = Math.max(2, Math.round(sc * 0.75));
      const cw = crown.width * cs;
      const chh = crown.height * cs;
      ctx.drawImage(crown, Math.round(m.x + m.offX + shakeX - cw / 2), Math.round(y - chh + sc * 2), cw, chh);
    }
    ctx.globalAlpha = 1;
  }

  private cutState(m: SceneMonster, now: number) {
    if (m.dying && m.dying.kind === 'cut') {
      const ct = now - m.dying.t0;
      const sep = ct < 90 ? 0 : ease((ct - 90) / 220) * 12;
      const fall = ct < 300 ? 0 : ease((ct - 300) / 500) * 14;
      const rot = ct < 300 ? 0 : ease((ct - 300) / 500) * 0.35;
      const alpha = ct < 450 ? 1 : Math.max(0, 1 - (ct - 450) / 400);
      const puddle = ct < 300 ? 0 : Math.max(0, 1 - (ct - 300) / 700);
      return { sep, fall, rot, alpha, puddle };
    }
    if (m.cut) {
      const ct = now - m.cut.t0;
      if (ct < 90) return { sep: 0, fall: 0, rot: 0, alpha: 1, puddle: 0 };
      if (ct < 240) return { sep: ease((ct - 90) / 150) * 7, fall: 0, rot: 0, alpha: 1, puddle: 0 };
      if (!m.cut.alive) return { sep: 7, fall: 0, rot: 0, alpha: 1, puddle: 0 };
      if (ct < 420) return { sep: 7 + Math.sin((ct - 240) / 30) * 0.8, fall: 0, rot: 0, alpha: 1, puddle: 0 };
      if (ct < 640) return { sep: 7 * (1 - easeInOut((ct - 420) / 220)), fall: 0, rot: 0, alpha: 1, puddle: 0 };
    }
    return null;
  }

  /** Draws the sprite split in two along a diagonal (sword cut). */
  private drawSplit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, w: number, h: number, sep: number, fall: number, alpha: number, rot: number) {
    const a = -0.6; // cut angle (rising to the right)
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const nx = -uy;
    const ny = ux;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const L = Math.max(w, h) * 2;
    ctx.globalAlpha = alpha;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(nx * sep * side, ny * sep * side + (side > 0 ? fall : fall * 0.6));
      ctx.translate(cx, cy);
      ctx.rotate(rot * side);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      ctx.moveTo(cx - ux * L, cy - uy * L);
      ctx.lineTo(cx + ux * L, cy + uy * L);
      ctx.lineTo(cx + ux * L + nx * L * side, cy + uy * L + ny * L * side);
      ctx.lineTo(cx - ux * L + nx * L * side, cy - uy * L + ny * L * side);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawFx(ctx: CanvasRenderingContext2D, now: number) {
    for (const f of this.fx) {
      const k = (now - f.t0) / f.dur;
      if (k < 0 || k >= 1) continue;
      switch (f.kind) {
        case 'slash': {
          const len = 34;
          const grow = Math.min(1, k * 3);
          const fade = 1 - k;
          const drawLine = (dir: number, col: string, width: number) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(f.x - len * dir, f.y + len * 0.65);
            ctx.lineTo(f.x - len * dir + 2 * len * dir * grow, f.y + len * 0.65 - 2 * len * 0.65 * grow);
            ctx.stroke();
          };
          ctx.globalAlpha = fade;
          drawLine(1, f.color === '#ffffff' ? 'rgba(165,216,255,0.7)' : f.color!, 5);
          drawLine(1, '#ffffff', 2);
          if (f.crit) {
            drawLine(-1, 'rgba(255,224,102,0.8)', 5);
            drawLine(-1, '#ffffff', 2);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'pillar': {
          const w = 18 * Math.sin(Math.min(1, k * 1.3) * Math.PI) + 2;
          ctx.globalAlpha = 0.85 * (1 - k * 0.6);
          ctx.fillStyle = f.color!;
          ctx.fillRect(Math.round(f.x - w / 2), 0, Math.round(w), Math.round(f.y));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(f.x - w / 5), 0, Math.max(1, Math.round(w / 2.5)), Math.round(f.y));
          ctx.globalAlpha = 1;
          if (Math.random() < 0.8) this.particles.push({ x: f.x + (Math.random() - 0.5) * w, y: f.y - Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? f.color! : '#ffffff', size: 2, grav: 0 });
          break;
        }
        case 'orb': {
          const p = ease(k);
          const x = f.x + (f.x2! - f.x) * p;
          const y = f.y + (f.y2! - f.y) * p - Math.sin(p * Math.PI) * 14;
          ctx.fillStyle = f.color!;
          ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 6, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2);
          if (Math.random() < 0.8) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.3, max: 0.3, color: f.color!, size: 2, grav: 0 });
          break;
        }
        case 'nova': {
          const r = ease(k) * 70;
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = f.color!;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, r * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'reticle': {
          const r = 30 * (1 - ease(k)) + 8;
          ctx.strokeStyle = '#ffe066';
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.round(f.x - r), Math.round(f.y - r), Math.round(r * 2), Math.round(r * 2));
          ctx.fillStyle = '#ffe066';
          ctx.fillRect(Math.round(f.x - 1), Math.round(f.y - r - 4), 2, 6);
          ctx.fillRect(Math.round(f.x - 1), Math.round(f.y + r - 2), 2, 6);
          break;
        }
        case 'gravity': {
          const r = 40 * (1 - ease(k));
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#3b1f75';
          ctx.beginPath();
          ctx.arc(f.x, f.y, r + 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#b197fc';
          for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(f.x - 30 + i * 8), Math.round(f.y - 40 + k * 50), 1, 8);
          break;
        }
        case 'heal': {
          if (Math.random() < 0.6) this.particles.push({ x: f.x + (Math.random() - 0.5) * 28, y: f.y + 20, vx: 0, vy: -40, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? '#69db7c' : '#d3f9d8', size: 2, grav: 0 });
          ctx.globalAlpha = (1 - k) * 0.25;
          ctx.fillStyle = '#69db7c';
          ctx.fillRect(Math.round(f.x - 16), Math.round(f.y - 24), 32, 50);
          ctx.globalAlpha = 1;
          break;
        }
        case 'buff': {
          const r = ease(k) * 28;
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = f.color!;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, r, r * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (Math.random() < 0.5) this.particles.push({ x: f.x + (Math.random() - 0.5) * 30, y: f.y, vx: 0, vy: -50, life: 0.5, max: 0.5, color: f.color!, size: 1, grav: 0 });
          break;
        }
        case 'breath': {
          for (let i = 0; i < 4; i++) {
            const p = Math.random();
            this.particles.push({
              x: f.x + (f.x2! - f.x) * p * 0.3,
              y: f.y + (Math.random() - 0.5) * 6,
              vx: (f.x2! - f.x) * 1.4,
              vy: (Math.random() - 0.5) * 40,
              life: 0.45,
              max: 0.45,
              color: ['#ff922b', '#ffe066', '#e03131'][i % 3],
              size: 3,
              grav: 0,
            });
          }
          break;
        }
        case 'doom': {
          const r = 22 + Math.sin(k * Math.PI) * 8;
          ctx.globalAlpha = Math.sin(k * Math.PI);
          ctx.strokeStyle = '#ff4d6d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x, f.y - r + 4);
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x + r * 0.6, f.y);
          ctx.stroke();
          ctx.font = 'bold 10px Galmuri11, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ff4d6d';
          ctx.fillText('XIII', f.x, f.y + r + 12);
          ctx.globalAlpha = 1;
          break;
        }
        case 'coins': {
          if (Math.random() < 0.9) this.particles.push({ x: f.x + (Math.random() - 0.5) * 40, y: f.y, vx: 0, vy: 80, life: 0.9, max: 0.9, color: Math.random() < 0.5 ? '#ffd43b' : '#fab005', size: 3, grav: 200 });
          break;
        }
      }
    }
    this.fx = this.fx.filter((f) => now - f.t0 < f.dur);
  }

  private glitchBuf: HTMLCanvasElement | null = null;
  private applyGlitch() {
    const ctx = this.ctx;
    if (!this.glitchBuf) this.glitchBuf = makeCanvas(VW, VH);
    const g = this.glitchBuf.getContext('2d')!;
    g.clearRect(0, 0, VW, VH);
    g.drawImage(this.canvas, 0, 0);
    for (let i = 0; i < 8; i++) {
      const y = Math.floor(Math.random() * VH);
      const hh = 2 + Math.floor(Math.random() * 10);
      const dx = Math.floor((Math.random() - 0.5) * 30);
      ctx.drawImage(this.glitchBuf, 0, y, VW, hh, dx, y, VW, hh);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = Math.random() < 0.5 ? '#ff0040' : '#00e5ff';
    ctx.fillRect(0, Math.floor(Math.random() * VH), VW, 3);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
