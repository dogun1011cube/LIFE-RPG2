import { useEffect, useRef } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Panel } from '../common/Panel';
import { useGame } from '../../state/gameStore';
import { BUILD_ZONE, ENEMY_SPAWNS, ORE_VEINS, RESOURCE_NODES, SIGNS, WORLD_RADIUS, ZONES } from '../../data/world';
import { RESOURCES } from '../../data/resources';
import { NODE_INFO } from '../../game/resources/nodes';
import { terrainHeight } from '../../game/world/terrain';
import { runtime } from '../../game/runtime';
import { ENEMIES } from '../../data/enemies';

const SIZE = 560;
const EXTENT = WORLD_RADIUS + 8;
let terrainImage: ImageData | null = null;

function toPx(x: number, z: number) {
  return [((x + EXTENT) / (EXTENT * 2)) * SIZE, ((z + EXTENT) / (EXTENT * 2)) * SIZE];
}

function renderTerrain(ctx: CanvasRenderingContext2D) {
  if (terrainImage) {
    ctx.putImageData(terrainImage, 0, 0);
    return;
  }
  const img = ctx.createImageData(SIZE, SIZE);
  const corruption = ZONES.find((z) => z.id === 'corruption')!;
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x = (px / SIZE) * EXTENT * 2 - EXTENT;
      const z = (py / SIZE) * EXTENT * 2 - EXTENT;
      const h = terrainHeight(x, z);
      const i = (py * SIZE + px) * 4;
      const outside = Math.hypot(x, z) > WORLD_RADIUS;
      const shade = Math.max(0, Math.min(1, (h + 6) / 30));
      let r = 40 + shade * 60;
      let g = 70 + shade * 70;
      let b = 52 + shade * 40;
      if (Math.hypot(x - corruption.center[0], z - corruption.center[1]) < corruption.radius) {
        r = 70 + shade * 40;
        g = 40;
        b = 100 + shade * 40;
      }
      if (outside) {
        r *= 0.35;
        g *= 0.35;
        b *= 0.4;
      }
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  terrainImage = img;
  ctx.putImageData(img, 0, 0);
}

export function MapPanel() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useGame((s) => s.game);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      renderTerrain(ctx);
      // Build zone
      ctx.strokeStyle = 'rgba(79,233,255,0.8)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      const [cx, cz] = toPx(0, 0);
      ctx.arc(cx, cz, (BUILD_ZONE.radius / (EXTENT * 2)) * SIZE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Zones
      ctx.font = '600 12px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      for (const z of ZONES) {
        const [x, y] = toPx(z.center[0], z.center[1]);
        const known = game.discovered.includes(z.id);
        ctx.strokeStyle = z.danger >= 3 ? 'rgba(200,110,255,0.9)' : z.danger >= 2 ? 'rgba(126,200,255,0.7)' : 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, (z.radius / (EXTENT * 2)) * SIZE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = known ? '#e9f6ff' : 'rgba(233,246,255,0.5)';
        const rr = (z.radius / (EXTENT * 2)) * SIZE;
        const labelY = y - rr - 6 < 14 ? y + rr + 16 : y - rr - 6; // keep labels inside the canvas
        ctx.fillText(known ? z.name : `${z.name} (미탐사)`, x, labelY);
      }
      // Veins
      for (const v of ORE_VEINS) {
        const [x, y] = toPx(v.position[0], v.position[1]);
        ctx.fillStyle = RESOURCES[v.resource].color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Nodes
      for (const n of RESOURCE_NODES) {
        const [x, y] = toPx(n.position[0], n.position[1]);
        const depleted = (game.nodes[n.id]?.charges ?? 1) <= 0;
        ctx.fillStyle = depleted ? '#555' : NODE_INFO[n.kind].emissive;
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
      // Signs
      for (const s of SIGNS) {
        const [x, y] = toPx(s.position[0], s.position[1]);
        ctx.fillStyle = '#ffc65a';
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 4, y + 3);
        ctx.lineTo(x - 4, y + 3);
        ctx.fill();
      }
      // Buildings
      for (const b of game.buildings) {
        const [x, y] = toPx(b.position[0], b.position[2]);
        ctx.fillStyle = b.state === 'operational' ? '#4fe9ff' : b.state === 'disabled' ? '#666' : '#ff5a5a';
        ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.strokeStyle = '#0b0f14';
        ctx.strokeRect(x - 4, y - 4, 8, 8);
      }
      // HQ
      const [hx, hy] = toPx(0, -12);
      ctx.fillStyle = '#e9f6ff';
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      // Enemies (only visible ones known to the player = alive)
      for (const sp of ENEMY_SPAWNS) {
        const e = runtime.enemies.get(sp.id);
        if (!e) continue;
        const [x, y] = toPx(e.pos.x, e.pos.z);
        ctx.fillStyle = ENEMIES[sp.type].boss ? '#ff4fd1' : '#ff7070';
        ctx.beginPath();
        ctx.arc(x, y, ENEMIES[sp.type].boss ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Player arrow
      const p = runtime.player;
      const [px, py] = toPx(p.pos.x, p.pos.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-p.facing);
      ctx.fillStyle = '#ffc65a';
      ctx.strokeStyle = '#0b0f14';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <Panel title="월드 지도" subtitle="개척 구역 정찰 데이터" icon={<MapIcon size={18} />} hotkey="M">
      <div className="map-wrap">
        <canvas ref={canvas} width={SIZE} height={SIZE} className="map-canvas" />
        <ul className="map-legend">
          <li>
            <span className="lg lg-player" /> 플레이어
          </li>
          <li>
            <span className="lg lg-building" /> 건물 (빨강: 정지)
          </li>
          <li>
            <span className="lg lg-node" /> 자원 노드
          </li>
          <li>
            <span className="lg lg-sign" /> 안내판
          </li>
          <li>
            <span className="lg lg-enemy" /> 적
          </li>
          <li>
            <span className="lg lg-zone" /> 건설 구역
          </li>
        </ul>
      </div>
    </Panel>
  );
}
