import { floorType, sealRankFor } from '../game/tower';
import { seeded } from '../game/rng';
import { makeCanvas } from './draw';

export const TOWER_W = 180;
export const FLOOR_H = 26;
export const TOP_H = 90;
export const BASE_H = 46;

export function towerHeight(floors: number) {
  return TOP_H + floors * FLOOR_H + BASE_H;
}

/** y (logical px, top of the floor segment) for floor f (1-based). */
export function floorY(f: number, floors: number) {
  return TOP_H + (floors - f) * FLOOR_H;
}

/**
 * Renders the whole tower (night sky, layered stone body, lit windows for
 * cleared floors, banners for special floors, seals on rank-gated floors).
 */
export function renderTower(floors: number, highestCleared: number): HTMLCanvasElement {
  const H = towerHeight(floors);
  const c = makeCanvas(TOWER_W, H);
  const ctx = c.getContext('2d')!;
  const rng = seeded(1234);

  // sky gradient (darker toward the top)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04030c');
  g.addColorStop(0.5, '#0b0b24');
  g.addColorStop(1, '#16163d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TOWER_W, H);
  for (let i = 0; i < H / 6; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.75;
    ctx.fillStyle = rng() < 0.15 ? '#ffe066' : '#ffffff';
    ctx.fillRect(Math.floor(rng() * TOWER_W), Math.floor(rng() * H), 1, 1);
  }
  ctx.globalAlpha = 1;

  // distant layered towers (parallax silhouettes)
  ctx.fillStyle = '#121236';
  ctx.fillRect(8, TOP_H + 120, 22, H);
  ctx.fillRect(150, TOP_H + 60, 20, H);
  ctx.fillStyle = '#18184a';
  ctx.fillRect(14, TOP_H + 100, 10, 20);
  ctx.fillRect(155, TOP_H + 40, 10, 20);

  const bodyX = 44;
  const bodyW = 92;

  // top: spire disappearing into clouds
  ctx.fillStyle = '#231d45';
  for (let i = 0; i < TOP_H; i++) {
    const w = Math.max(4, Math.floor((i / TOP_H) * bodyW));
    ctx.fillRect(TOWER_W / 2 - w / 2, i, w, 1);
  }
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(TOWER_W / 2 - 1, 2, 2, 6);
  // clouds hiding the summit
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(${200 + rng() * 40},${200 + rng() * 40},255,${0.08 + rng() * 0.14})`;
    const cw = 30 + rng() * 60;
    ctx.fillRect(Math.floor(rng() * (TOWER_W + 40)) - 20, Math.floor(10 + rng() * (TOP_H + 20)), Math.floor(cw), 5 + Math.floor(rng() * 6));
  }

  for (let f = 1; f <= floors; f++) {
    const y = floorY(f, floors);
    const type = floorType(f);
    const cleared = f <= highestCleared;
    const next = f === highestCleared + 1;
    const seal = sealRankFor(f) && f % 20 === 1;

    // stone body
    ctx.fillStyle = '#2b2550';
    ctx.fillRect(bodyX, y, bodyW, FLOOR_H);
    // bricks
    for (let by = 0; by < FLOOR_H; by += 6) {
      for (let bx = (by / 6) % 2 ? -6 : 0; bx < bodyW; bx += 12) {
        ctx.fillStyle = rng() < 0.5 ? '#332c5e' : '#2f2857';
        ctx.fillRect(bodyX + Math.max(0, bx) + 1, y + by + 1, Math.min(11, bodyW - Math.max(0, bx) - 1), 5);
      }
    }
    // edge shading
    ctx.fillStyle = '#433a7a';
    ctx.fillRect(bodyX, y, 3, FLOOR_H);
    ctx.fillStyle = '#1a1535';
    ctx.fillRect(bodyX + bodyW - 4, y, 4, FLOOR_H);
    // ledge
    ctx.fillStyle = '#4c4288';
    ctx.fillRect(bodyX - 3, y + FLOOR_H - 3, bodyW + 6, 3);

    // window
    const wx = TOWER_W / 2 - 7;
    const wy = y + 6;
    let win = '#0c0a1c';
    if (cleared) win = '#ffd43b';
    if (next) win = '#b197fc';
    ctx.fillStyle = '#1a1535';
    ctx.fillRect(wx - 1, wy - 1, 16, 15);
    ctx.fillStyle = win;
    ctx.fillRect(wx, wy + 3, 14, 11);
    ctx.fillRect(wx + 2, wy + 1, 10, 2);
    ctx.fillRect(wx + 4, wy, 6, 1);
    if (cleared) {
      ctx.fillStyle = '#fff3bf';
      ctx.fillRect(wx + 2, wy + 5, 3, 3);
      ctx.fillStyle = 'rgba(255,212,59,0.12)';
      ctx.fillRect(wx - 8, wy - 4, 30, 22);
    }
    ctx.fillStyle = '#1a1535';
    ctx.fillRect(wx + 6, wy + 2, 2, 12);

    // decorations by type
    const flag = (color: string, side: number) => {
      const fx = side < 0 ? bodyX + 6 : bodyX + bodyW - 14;
      ctx.fillStyle = '#5c3d2e';
      ctx.fillRect(fx + 3, y + 3, 2, 2);
      ctx.fillStyle = color;
      ctx.fillRect(fx, y + 5, 8, 12);
      ctx.fillRect(fx + 2, y + 17, 4, 2);
    };
    if (type === 'boss') {
      ctx.fillStyle = '#5f3dc4';
      ctx.fillRect(bodyX - 8, y + FLOOR_H - 5, bodyW + 16, 5);
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(bodyX + 10, y + 8, 6, 5);
      ctx.fillRect(bodyX + bodyW - 16, y + 8, 6, 5);
      ctx.fillStyle = '#1a1535';
      ctx.fillRect(bodyX + 11, y + 9, 1, 2);
      ctx.fillRect(bodyX + 14, y + 9, 1, 2);
      ctx.fillRect(bodyX + bodyW - 15, y + 9, 1, 2);
      ctx.fillRect(bodyX + bodyW - 12, y + 9, 1, 2);
    } else if (type === 'special') {
      const col = f === 4 ? '#748ffc' : f === 7 ? '#ffd43b' : '#e03131';
      flag(col, -1);
      flag(col, 1);
    } else if (type === 'elite') {
      flag('#ff922b', -1);
    } else if (type === 'treasure') {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(bodyX + 8, y + 14, 8, 6);
      ctx.fillStyle = '#7a5a10';
      ctx.fillRect(bodyX + 8, y + 16, 8, 1);
    } else if (type === 'merchant') {
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(bodyX + bodyW - 18, y + 12, 12, 3);
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(bodyX + bodyW - 16, y + 12, 2, 3);
      ctx.fillRect(bodyX + bodyW - 12, y + 12, 2, 3);
    } else if (type === 'event') {
      ctx.fillStyle = '#3bc9db';
      ctx.fillRect(bodyX + 10, y + 10, 3, 3);
      ctx.fillRect(bodyX + 11, y + 9, 1, 5);
    }
    if (seal) {
      ctx.fillStyle = 'rgba(255,77,109,0.75)';
      ctx.fillRect(bodyX - 6, y + FLOOR_H - 1, bodyW + 12, 2);
      for (let i = 0; i < bodyW + 12; i += 6) ctx.fillRect(bodyX - 6 + i, y + FLOOR_H - 3, 3, 2);
    }
  }

  // base / entrance
  const baseY = TOP_H + floors * FLOOR_H;
  ctx.fillStyle = '#3a3270';
  ctx.fillRect(bodyX - 10, baseY, bodyW + 20, BASE_H);
  ctx.fillStyle = '#4c4288';
  ctx.fillRect(bodyX - 12, baseY, bodyW + 24, 4);
  ctx.fillStyle = '#0c0a1c';
  ctx.fillRect(TOWER_W / 2 - 10, baseY + 14, 20, 32);
  ctx.fillRect(TOWER_W / 2 - 8, baseY + 12, 16, 2);
  ctx.fillStyle = '#b197fc';
  ctx.fillRect(TOWER_W / 2 - 1, baseY + 8, 2, 3);
  // ground
  ctx.fillStyle = '#152a1f';
  ctx.fillRect(0, baseY + BASE_H - 6, TOWER_W, 6);
  ctx.fillStyle = '#1f4a2c';
  ctx.fillRect(0, baseY + BASE_H - 6, TOWER_W, 1);
  return c;
}
