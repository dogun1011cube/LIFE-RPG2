// 건설 도구: 드래그 범위 계산, 비용 평가, 적용
import { COST, ZONE, FEATURE } from './config.js';

export const TOOLS = [
  { id: 'hand', name: '살펴보기', key: '1', icon: 'lens', hint: '타일을 눌러 정보 보기 · 드래그로 화면 이동' },
  { id: 'road', name: '도로', key: '2', icon: 'road5', hint: `드래그해서 도로 깔기 ($${COST.road}/칸)` },
  { id: 'r', name: '주거', key: '3', icon: 'zone_r', zone: ZONE.R, hint: `주거 구역 지정 ($${COST.zone}/칸)` },
  { id: 'c', name: '상업', key: '4', icon: 'zone_c', zone: ZONE.C, hint: `상업 구역 지정 ($${COST.zone}/칸)` },
  { id: 'i', name: '공업', key: '5', icon: 'zone_i', zone: ZONE.I, hint: `공업 구역 지정 ($${COST.zone}/칸)` },
  { id: 'bulldoze', name: '철거', key: '6', icon: 'tnt', hint: `드래그한 영역 철거 ($${COST.bulldoze}/칸)` },
];
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export const TOOL_COLORS = {
  road: 0xdddddd, r: 0x66ff66, c: 0x66aaff, i: 0xffdd55, bulldoze: 0xff5544, hand: 0xffffff,
};

// 드래그 시작/끝 타일로 대상 타일 목록 만들기
export function dragTiles(world, toolId, a, b) {
  const out = [];
  const push = (x, z) => { if (world.inBounds(x, z)) out.push(world.idx(x, z)); };
  if (toolId === 'road') {
    // L자 경로: 많이 움직인 축 먼저
    const [x0, z0] = a, [x1, z1] = b;
    const sx = Math.sign(x1 - x0), sz = Math.sign(z1 - z0);
    const line = (xa, za, xb, zb) => {
      const dx = Math.sign(xb - xa), dz = Math.sign(zb - za);
      for (let x = xa, z = za; ; x += dx, z += dz) {
        push(x, z);
        if (x === xb && z === zb) break;
      }
    };
    if (Math.abs(x1 - x0) >= Math.abs(z1 - z0)) {
      line(x0, z0, x1, z0);
      if (z1 !== z0) line(x1, z0 + sz, x1, z1);
    } else {
      line(x0, z0, x0, z1);
      if (x1 !== x0) line(x0 + sx, z1, x1, z1);
    }
    return out;
  }
  if (toolId === 'hand') { push(b[0], b[1]); return out; }
  const [xa, xb] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [za, zb] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) push(x, z);
  return out;
}

// 각 타일의 가능 여부와 비용
export function evaluate(world, toolId, tiles) {
  const tool = TOOL_BY_ID[toolId];
  const items = [];
  let total = 0, valid = 0;
  for (const i of tiles) {
    let ok = false, cost = 0;
    const feat = world.feature[i] !== FEATURE.NONE ? COST.clearFeature : 0;
    if (toolId === 'road') {
      ok = world.isLand(i) && !world.road[i] && !world.hasBuilding(i);
      cost = COST.road + feat;
    } else if (tool && tool.zone) {
      ok = world.isLand(i) && !world.road[i] && world.zone[i] !== tool.zone && !world.hasBuilding(i);
      cost = COST.zone + feat;
    } else if (toolId === 'bulldoze') {
      ok = !!(world.road[i] || world.zone[i] || world.feature[i]);
      cost = world.hasBuilding(i) ? COST.bulldoze * (1 + world.level[i]) : (world.road[i] || world.zone[i]) ? COST.bulldoze : COST.clearFeature;
    }
    if (ok) { total += cost; valid++; }
    items.push({ i, ok, cost: ok ? cost : 0 });
  }
  return { items, total, valid };
}

// 돈이 허락하는 만큼 적용. { spent, applied, skipped } 반환
export function applyTool(world, toolId, evalResult, money) {
  const tool = TOOL_BY_ID[toolId];
  let spent = 0, applied = 0, skipped = 0;
  for (const it of evalResult.items) {
    if (!it.ok) continue;
    if (spent + it.cost > money) { skipped++; continue; }
    if (toolId === 'road') world.placeRoad(it.i);
    else if (tool.zone) world.placeZone(it.i, tool.zone);
    else if (toolId === 'bulldoze') world.bulldoze(it.i);
    spent += it.cost;
    applied++;
  }
  return { spent, applied, skipped };
}
