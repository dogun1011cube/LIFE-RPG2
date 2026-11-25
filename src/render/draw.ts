import { getMonster } from '../data/monsters';
import type { SpriteId } from '../data/monsters';
import { ICON_ALIAS, ICONS, SPRITES } from './sprites';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** amount > 0 → lighter, < 0 → darker. */
export function shade(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  if (amount >= 0) return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  return rgbToHex(r * (1 + amount), g * (1 + amount), b * (1 + amount));
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Renders a pixel grid to a 1:1 canvas (cached). Rows are padded to equal width. */
export function gridCanvas(rows: string[], palette: Record<string, string>, key: string): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

export function spriteCanvas(id: SpriteId | 'hero' | 'crown', overrides: Record<string, string> = {}): HTMLCanvasElement {
  const def = SPRITES[id];
  const pal = { ...def.palette, ...overrides };
  const key = 'spr:' + id + ':' + JSON.stringify(overrides);
  return gridCanvas(def.rows, pal, key);
}

export function monsterCanvas(defId: string) {
  const m = getMonster(defId);
  return spriteCanvas(m.sprite, m.colors || {});
}

/** White (or colored) silhouette used for hit flashes. */
export function silhouette(src: HTMLCanvasElement, color = '#ffffff'): HTMLCanvasElement {
  const tagged = src as HTMLCanvasElement & { __sil?: Record<string, HTMLCanvasElement> };
  tagged.__sil ||= {};
  if (tagged.__sil[color]) return tagged.__sil[color];
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  tagged.__sil[color] = c;
  return c;
}

export function iconPalette(tint: string): Record<string, string> {
  return {
    m: tint,
    l: shade(tint, 0.45),
    d: shade(tint, -0.4),
    k: '#0b0b14',
    g: '#ffd43b',
    w: '#ffffff',
    s: '#ffd8a8',
  };
}

export function iconCanvas(icon: string, tint: string): HTMLCanvasElement {
  const name = ICONS[icon] ? icon : ICON_ALIAS[icon] || 'gem';
  return gridCanvas(ICONS[name], iconPalette(tint), 'ico:' + name + ':' + tint);
}

/** Draws a canvas scaled with nearest-neighbour. */
export function blit(ctx: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, scale: number, w?: number, h?: number) {
  ctx.imageSmoothingEnabled = false;
  const sw = w ?? (src as HTMLCanvasElement).width;
  const sh = h ?? (src as HTMLCanvasElement).height;
  ctx.drawImage(src, Math.round(x), Math.round(y), sw * scale, sh * scale);
}

export function toDataURL(c: HTMLCanvasElement, scale: number): string {
  const key = 'url:' + scale;
  const tagged = c as HTMLCanvasElement & { __urls?: Record<string, string> };
  tagged.__urls ||= {};
  if (tagged.__urls[key]) return tagged.__urls[key];
  const out = makeCanvas(c.width * scale, c.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  tagged.__urls[key] = url;
  return url;
}
