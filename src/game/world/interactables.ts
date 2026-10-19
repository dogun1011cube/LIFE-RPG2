import { BUILDINGS } from '../../data/buildings';
import { NPC_POS, RESOURCE_NODES, SIGNS, TERMINAL_POS } from '../../data/world';
import { INTERACT_RANGE, NODE_INFO } from '../resources/nodes';
import type { GameState } from '../types';

export interface Interactable {
  id: string;
  kind: 'node' | 'sign' | 'terminal' | 'npc' | 'building';
  x: number;
  z: number;
  range: number;
  label: string;
  action: string;
  disabled?: boolean;
}

/** Finds the closest interactable within range of (px, pz). */
export function findInteractable(state: GameState, px: number, pz: number): Interactable | null {
  let best: Interactable | null = null;
  let bestD = Infinity;
  const consider = (it: Interactable) => {
    const d = Math.hypot(px - it.x, pz - it.z);
    if (d <= it.range && d < bestD) {
      best = it;
      bestD = d;
    }
  };
  for (const n of RESOURCE_NODES) {
    const dx = px - n.position[0];
    const dz = pz - n.position[1];
    if (dx * dx + dz * dz > 25) continue;
    const st = state.nodes[n.id];
    const info = NODE_INFO[n.kind];
    const depleted = (st?.charges ?? n.charges) <= 0;
    consider({
      id: n.id,
      kind: 'node',
      x: n.position[0],
      z: n.position[1],
      range: INTERACT_RANGE,
      label: depleted ? `${info.name} — 고갈됨 (재생까지 ${Math.ceil(st?.regenIn ?? 0)}초)` : `${info.name} (${st?.charges ?? n.charges}/${n.charges})`,
      action: n.kind === 'wreck' ? '회수' : '채집',
      disabled: depleted,
    });
  }
  for (const s of SIGNS) consider({ id: s.id, kind: 'sign', x: s.position[0], z: s.position[1], range: 3, label: s.title, action: '읽기' });
  consider({ id: 'terminal', kind: 'terminal', x: TERMINAL_POS[0], z: TERMINAL_POS[1], range: 2.8, label: '기지 관제 단말기', action: '문명 현황' });
  consider({ id: 'npc', kind: 'npc', x: NPC_POS[0], z: NPC_POS[1], range: 3, label: '한서연 박사 (홀로그램)', action: '대화' });
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def) continue;
    consider({ id: b.id, kind: 'building', x: b.position[0], z: b.position[2], range: def.radius + 2, label: def.name, action: '관리' });
  }
  return best;
}
