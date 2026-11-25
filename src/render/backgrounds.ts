import type { BgId } from '../data/world';
import { seeded } from '../game/rng';
import { makeCanvas } from './draw';

export const VW = 320;
export const VH = 180;
export const GROUND_Y = 142;

const bgCache = new Map<BgId, HTMLCanvasElement>();

function bands(ctx: CanvasRenderingContext2D, colors: string[], y0: number, y1: number) {
  const h = (y1 - y0) / colors.length;
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, Math.floor(y0 + i * h), VW, Math.ceil(h) + 1);
  });
}

function stars(ctx: CanvasRenderingContext2D, rng: () => number, n: number, maxY: number, color = '#ffffff') {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    ctx.fillRect(Math.floor(rng() * VW), Math.floor(rng() * maxY), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff3bf') {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(x - w, y + dy, w * 2, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(x - 2, y - 3, 3, 2);
  ctx.fillRect(x + 3, y + 2, 2, 2);
}

function hills(ctx: CanvasRenderingContext2D, rng: () => number, base: number, amp: number, color: string, step = 4) {
  ctx.fillStyle = color;
  let h = rng() * amp;
  for (let x = 0; x < VW; x += step) {
    h += (rng() - 0.5) * amp * 0.5;
    h = Math.max(0, Math.min(amp, h));
    ctx.fillRect(x, Math.floor(base - h), step, Math.ceil(h) + VH);
  }
}

function pineTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < s; i++) {
    const w = Math.floor((i / s) * s * 0.7) + 1;
    ctx.fillRect(x - w, y - s + i, w * 2 + 1, 1);
  }
  ctx.fillRect(x, y, 1, 3);
}

function brickWall(ctx: CanvasRenderingContext2D, y0: number, y1: number, c1: string, c2: string, mortar: string, bw = 16, bh = 8) {
  ctx.fillStyle = mortar;
  ctx.fillRect(0, y0, VW, y1 - y0);
  const rng = seeded(99);
  for (let y = y0, row = 0; y < y1; y += bh, row++) {
    for (let x = row % 2 ? -bw / 2 : 0; x < VW; x += bw) {
      ctx.fillStyle = rng() < 0.5 ? c1 : c2;
      ctx.fillRect(x + 1, y + 1, bw - 1, bh - 1);
    }
  }
}

function floorTiles(ctx: CanvasRenderingContext2D, c1: string, c2: string, line: string) {
  for (let y = GROUND_Y; y < VH; y += 6) {
    const row = (y - GROUND_Y) / 6;
    ctx.fillStyle = row % 2 ? c1 : c2;
    ctx.fillRect(0, y, VW, 6);
  }
  ctx.fillStyle = line;
  ctx.fillRect(0, GROUND_Y, VW, 1);
}

function pillar(ctx: CanvasRenderingContext2D, x: number, w: number, top: number, c: string, hl: string, sh: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, top, w, GROUND_Y - top);
  ctx.fillStyle = hl;
  ctx.fillRect(x + 1, top, 2, GROUND_Y - top);
  ctx.fillStyle = sh;
  ctx.fillRect(x + w - 3, top, 3, GROUND_Y - top);
  ctx.fillStyle = hl;
  ctx.fillRect(x - 2, top, w + 4, 4);
  ctx.fillRect(x - 2, GROUND_Y - 4, w + 4, 4);
}

function archWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sky: string, frame: string) {
  ctx.fillStyle = frame;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y + w / 2, w, h - w / 2);
  const r = w / 2;
  for (let dy = 0; dy < r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - (r - dy) * (r - dy)));
    ctx.fillRect(x + r - half, y + dy, half * 2, 1);
  }
}

function render(id: BgId): HTMLCanvasElement {
  const c = makeCanvas(VW, VH);
  const ctx = c.getContext('2d')!;
  const rng = seeded(id.length * 977 + id.charCodeAt(0));
  // opaque base so animated layers never leave trails on uncovered pixels
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, VW, VH);
  switch (id) {
    case 'forest': {
      bands(ctx, ['#0b1026', '#101a3a', '#16284a', '#1d3654', '#24455b'], 0, 110);
      stars(ctx, rng, 70, 80);
      moon(ctx, 262, 30, 10);
      hills(ctx, rng, 100, 26, '#1a3346');
      for (let i = 0; i < 26; i++) pineTree(ctx, Math.floor(rng() * VW), 108 + Math.floor(rng() * 8), 18 + Math.floor(rng() * 10), '#13283a');
      hills(ctx, rng, 124, 14, '#123024');
      for (let i = 0; i < 18; i++) pineTree(ctx, Math.floor(rng() * VW), 130 + Math.floor(rng() * 6), 24 + Math.floor(rng() * 12), '#0d2219');
      ctx.fillStyle = '#1f4a2c';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      ctx.fillStyle = '#2b6a3c';
      ctx.fillRect(0, GROUND_Y, VW, 2);
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = rng() < 0.5 ? '#2f7a43' : '#173d24';
        ctx.fillRect(Math.floor(rng() * VW), GROUND_Y + 2 + Math.floor(rng() * 36), 1 + Math.floor(rng() * 2), 1);
      }
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = ['#ff8787', '#ffd43b', '#74c0fc', '#e599f7'][i % 4];
        ctx.fillRect(Math.floor(rng() * VW), GROUND_Y + 4 + Math.floor(rng() * 30), 1, 1);
      }
      break;
    }
    case 'training': {
      bands(ctx, ['#2a1b3d', '#44264f', '#6b3a5a', '#a1525e', '#d9775f', '#f2a65a'], 0, 120);
      ctx.fillStyle = '#ffd8a8';
      moon(ctx, 70, 92, 14, '#ffe8a3');
      hills(ctx, rng, 120, 18, '#5b3a4f');
      hills(ctx, rng, 132, 10, '#3d2a3a');
      ctx.fillStyle = '#6b4f2a';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      ctx.fillStyle = '#8d6e3f';
      ctx.fillRect(0, GROUND_Y, VW, 2);
      // fence
      for (let x = 4; x < VW; x += 22) {
        ctx.fillStyle = '#4a3420';
        ctx.fillRect(x, 118, 4, 24);
        ctx.fillStyle = '#7a5a36';
        ctx.fillRect(x + 1, 118, 2, 24);
      }
      ctx.fillStyle = '#5c4128';
      ctx.fillRect(0, 124, VW, 3);
      ctx.fillRect(0, 133, VW, 3);
      break;
    }
    case 'town': {
      bands(ctx, ['#0a0f24', '#111a38', '#1a2650', '#243466'], 0, GROUND_Y);
      stars(ctx, rng, 80, 90);
      moon(ctx, 168, 30, 9);
      for (let i = 0; i < 9; i++) {
        const x = i * 38 - 6 + Math.floor(rng() * 8);
        const w = 26 + Math.floor(rng() * 10);
        const h = 26 + Math.floor(rng() * 22);
        const y = GROUND_Y - h;
        ctx.fillStyle = '#1b2240';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#2a1f3d';
        for (let r = 0; r < 10; r++) ctx.fillRect(x - 3 + r, y - r, w + 6 - r * 2, 1);
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = rng() < 0.7 ? '#ffd43b' : '#2b3150';
          ctx.fillRect(x + 4 + k * 7, y + 8, 4, 5);
        }
      }
      ctx.fillStyle = '#2b2f45';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      for (let x = 0; x < VW; x += 10) {
        ctx.fillStyle = (x / 10) % 2 ? '#343a55' : '#292e45';
        ctx.fillRect(x, GROUND_Y + 2, 9, 5);
        ctx.fillRect(x + 5, GROUND_Y + 9, 9, 5);
      }
      break;
    }
    case 'dungeon': {
      brickWall(ctx, 0, GROUND_Y, '#2a2438', '#241f31', '#15121f');
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, 0, VW, 30);
      archWindow(ctx, 140, 50, 40, 60, '#0c0a14', '#3a3350');
      ctx.fillStyle = '#4a3f66';
      ctx.fillRect(136, 106, 48, 4);
      floorTiles(ctx, '#1d1928', '#221d30', '#3a3350');
      // chains & bones
      ctx.fillStyle = '#5c5470';
      for (let y = 0; y < 40; y += 3) {
        ctx.fillRect(60, y, 2, 2);
        ctx.fillRect(254, y, 2, 2);
      }
      ctx.fillStyle = '#d0cbbf';
      ctx.fillRect(30, 150, 8, 2);
      ctx.fillRect(290, 160, 6, 2);
      break;
    }
    case 'arena': {
      bands(ctx, ['#2d1630', '#4a1f3a', '#7a2c3e', '#b4433f'], 0, 70);
      // colosseum wall
      ctx.fillStyle = '#6b4a3a';
      ctx.fillRect(0, 60, VW, 70);
      for (let x = 0; x < VW; x += 26) {
        ctx.fillStyle = '#3d2a22';
        ctx.fillRect(x + 6, 72, 14, 24);
        ctx.fillRect(x + 6, 102, 14, 20);
        ctx.fillStyle = '#8b6a52';
        ctx.fillRect(x, 66, 26, 3);
        ctx.fillRect(x, 98, 26, 2);
      }
      // crowd dots
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = ['#ffd8a8', '#e8590c', '#4dabf7', '#f8f9fa', '#ffd43b'][Math.floor(rng() * 5)];
        ctx.fillRect(Math.floor(rng() * VW), 76 + Math.floor(rng() * 44), 1, 1);
      }
      ctx.fillStyle = '#4a3326';
      ctx.fillRect(0, 128, VW, 14);
      ctx.fillStyle = '#c9a26b';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      for (let i = 0; i < 150; i++) {
        ctx.fillStyle = rng() < 0.5 ? '#b48a55' : '#dcb57e';
        ctx.fillRect(Math.floor(rng() * VW), GROUND_Y + Math.floor(rng() * 38), 2, 1);
      }
      // banners
      for (const x of [40, 160, 280]) {
        ctx.fillStyle = '#c92a2a';
        ctx.fillRect(x - 6, 20, 12, 30);
        ctx.fillStyle = '#ffd43b';
        ctx.fillRect(x - 2, 28, 4, 4);
        ctx.fillStyle = '#5c3d2e';
        ctx.fillRect(x - 8, 18, 16, 2);
      }
      break;
    }
    case 'tower':
    case 'summit': {
      if (id === 'summit') {
        bands(ctx, ['#05040f', '#0b0a24', '#161445', '#241f63', '#3a2d7a'], 0, VH);
        stars(ctx, rng, 160, 140);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(105, 219, 124, ${0.05 + i * 0.02})`;
          ctx.fillRect(0, 20 + i * 6, VW, 3);
        }
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = 'rgba(230,230,255,.15)';
          const x = Math.floor(rng() * VW);
          ctx.fillRect(x, 120 + Math.floor(rng() * 20), 40 + Math.floor(rng() * 40), 6);
        }
        floorTiles(ctx, '#3b3366', '#463d78', '#ffd43b');
        break;
      }
      bands(ctx, ['#130f26', '#18132f', '#1d1738'], 0, GROUND_Y);
      archWindow(ctx, 70, 30, 30, 70, '#0d1a3a', '#2e2650');
      archWindow(ctx, 220, 30, 30, 70, '#0d1a3a', '#2e2650');
      stars(ctx, rng, 16, 90);
      pillar(ctx, 18, 18, 0, '#2c2547', '#433a69', '#1c1733');
      pillar(ctx, 140, 18, 0, '#2c2547', '#433a69', '#1c1733');
      pillar(ctx, 284, 18, 0, '#2c2547', '#433a69', '#1c1733');
      floorTiles(ctx, '#211b3a', '#2a2347', '#5f3dc4');
      ctx.fillStyle = '#3b2d6b';
      ctx.fillRect(110, GROUND_Y + 1, 100, VH - GROUND_Y);
      ctx.fillStyle = '#5f3dc4';
      ctx.fillRect(110, GROUND_Y + 1, 2, VH - GROUND_Y);
      ctx.fillRect(208, GROUND_Y + 1, 2, VH - GROUND_Y);
      break;
    }
    case 'f4': {
      bands(ctx, ['#0b0d12', '#12161f', '#1a1f2b', '#232a38'], 0, GROUND_Y);
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(rng() * VW);
        const h = 10 + Math.floor(rng() * 10);
        ctx.fillStyle = '#3a4152';
        ctx.fillRect(x, GROUND_Y - h, 9, h);
        ctx.fillRect(x + 1, GROUND_Y - h - 2, 7, 2);
        ctx.fillStyle = '#262c3a';
        ctx.fillRect(x + 3, GROUND_Y - h + 3, 3, 1);
        ctx.fillRect(x + 4, GROUND_Y - h + 2, 1, 4);
      }
      ctx.fillStyle = '#1b1f29';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      ctx.fillStyle = '#e9ecef';
      ctx.font = '28px serif';
      ctx.globalAlpha = 0.08;
      ctx.fillText('死', 146, 70);
      ctx.globalAlpha = 1;
      break;
    }
    case 'f7': {
      bands(ctx, ['#2b1a05', '#3d2608', '#56350b', '#6e450f'], 0, GROUND_Y);
      for (let x = 10; x < VW; x += 50) pillar(ctx, x, 14, 0, '#b08020', '#ffd43b', '#7a5a10');
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = rng() < 0.5 ? '#ffd43b' : '#fab005';
        const x = Math.floor(rng() * VW);
        ctx.fillRect(x, GROUND_Y - 2 - Math.floor(rng() * 6), 3, 2);
      }
      ctx.fillStyle = '#7a1414';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      ctx.fillStyle = '#a51111';
      ctx.fillRect(110, GROUND_Y, 100, VH - GROUND_Y);
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(110, GROUND_Y, 2, VH - GROUND_Y);
      ctx.fillRect(208, GROUND_Y, 2, VH - GROUND_Y);
      ctx.font = 'bold 40px serif';
      ctx.globalAlpha = 0.12;
      ctx.fillText('7', 150, 80);
      ctx.globalAlpha = 1;
      break;
    }
    case 'f13': {
      bands(ctx, ['#0a0204', '#1a0508', '#2a070c', '#3a0a10'], 0, GROUND_Y);
      // giant clock
      const cx = 160;
      const cy = 64;
      const r = 46;
      for (let dy = -r; dy <= r; dy++) {
        const w = Math.floor(Math.sqrt(r * r - dy * dy));
        ctx.fillStyle = Math.abs(dy) > r - 3 ? '#6b0f1a' : '#1f0509';
        ctx.fillRect(cx - w, cy + dy, w * 2, 1);
      }
      ctx.fillStyle = '#8b1e2a';
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2 - Math.PI / 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * (r - 7)) - 1, Math.round(cy + Math.sin(a) * (r - 7)) - 1, 3, 3);
      }
      // cracks
      ctx.fillStyle = '#ff4d6d';
      let x = 40;
      let y = 0;
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(x, y, 1, 3);
        x += Math.floor(rng() * 3) - 1;
        y += 3;
      }
      ctx.fillStyle = '#12030a';
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = '#3a0a10';
        ctx.fillRect(i * 26, GROUND_Y + 4, 20, 2);
      }
      break;
    }
  }
  // vignette
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VW * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  return c;
}

export function getBackground(id: BgId): HTMLCanvasElement {
  let c = bgCache.get(id);
  if (!c) {
    c = render(id);
    bgCache.set(id, c);
  }
  return c;
}

/** Animated ambience on top of the static background. */
export function drawAmbient(ctx: CanvasRenderingContext2D, id: BgId, t: number) {
  if (id === 'dungeon' || id === 'tower' || id === 'f4') {
    const torches = id === 'tower' ? [52, 268] : id === 'f4' ? [100, 220] : [100, 220];
    for (const x of torches) {
      const flick = Math.sin(t * 13 + x) * 1.2 + Math.sin(t * 7.3 + x * 2) * 0.8;
      const col = id === 'f4' ? ['#3bc9db', '#99e9f2'] : ['#ff922b', '#ffe066'];
      ctx.fillStyle = '#3a3350';
      ctx.fillRect(x - 2, 72, 4, 10);
      const glow = ctx.createRadialGradient(x, 64, 1, x, 64, 34);
      glow.addColorStop(0, id === 'f4' ? 'rgba(59,201,219,.25)' : 'rgba(255,146,43,.25)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 34, 30, 68, 68);
      ctx.fillStyle = col[0];
      ctx.fillRect(x - 2, Math.round(64 - flick), 4, Math.round(8 + flick));
      ctx.fillStyle = col[1];
      ctx.fillRect(x - 1, Math.round(67 - flick * 0.5), 2, 4);
    }
  }
  if (id === 'forest' || id === 'town' || id === 'summit') {
    // fireflies / twinkles
    for (let i = 0; i < 12; i++) {
      const x = (i * 53 + Math.sin(t * 0.7 + i) * 18 + 400) % VW;
      const y = (id === 'summit' ? 40 : 110) + Math.sin(t * 1.3 + i * 2) * 14 + (i % 3) * 8;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = id === 'forest' ? '#d8f5a2' : '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  if (id === 'f4') {
    ctx.fillStyle = 'rgba(200,210,230,0.06)';
    for (let i = 0; i < 5; i++) {
      const x = ((t * 8 + i * 80) % (VW + 80)) - 80;
      ctx.fillRect(Math.round(x), 120 + i * 4, 80, 6);
    }
  }
  if (id === 'f13') {
    // clock hand rotates
    const cx = 160;
    const cy = 64;
    const a = t * 0.8;
    ctx.fillStyle = '#ff4d6d';
    for (let i = 0; i < 34; i++) ctx.fillRect(Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i), 2, 2);
    for (let i = 0; i < 24; i++) ctx.fillRect(Math.round(cx + Math.cos(a / 13) * i), Math.round(cy + Math.sin(a / 13) * i), 2, 2);
    if (Math.sin(t * 3.1) > 0.97) {
      ctx.fillStyle = 'rgba(255,0,60,.12)';
      ctx.fillRect(0, 0, VW, VH);
    }
  }
  if (id === 'f7') {
    for (let i = 0; i < 10; i++) {
      const x = (i * 37) % VW;
      const y = (t * 30 + i * 41) % 150;
      ctx.fillStyle = '#ffe066';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, Math.round(y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}
