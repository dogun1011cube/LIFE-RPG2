import { RESOURCE_NODES } from '../../data/world';
import { grantStacks, grantXp } from '../progression/rewards';
import { getPlayerStats } from '../progression/progression';
import type { Cost, GameState, ResourceNodeDef, SystemResult } from '../types';

export const NODE_INFO: Record<ResourceNodeDef['kind'], { name: string; yield: Cost; primary: string; color: string; emissive: string }> = {
  iron: { name: '철광석 광상', yield: { iron: 3 }, primary: 'iron', color: '#7d8794', emissive: '#c8d6e8' },
  copper: { name: '구리 광상', yield: { copper: 3 }, primary: 'copper', color: '#b0643a', emissive: '#ffae6b' },
  silicon: { name: '실리콘 결정', yield: { silicon: 2 }, primary: 'silicon', color: '#5aa7d6', emissive: '#bfeaff' },
  wreck: { name: '기술 잔해', yield: { research: 3, alloy: 1, gold: 3 }, primary: 'research', color: '#3a4250', emissive: '#5ef2ff' },
};

export const COLLECT_XP = 2;
export const INTERACT_RANGE = 3.2;

export function nodeDef(id: string) {
  return RESOURCE_NODES.find((n) => n.id === id);
}

export function collectNode(state: GameState, nodeId: string): SystemResult & { added?: Cost } {
  const def = nodeDef(nodeId);
  if (!def) return { ok: false, reason: '알 수 없는 자원 노드입니다.' };
  const node = state.nodes[nodeId] ?? { charges: def.charges, regenIn: 0 };
  if (node.charges <= 0) return { ok: false, reason: '고갈된 자원입니다. 잠시 후 재생됩니다.' };
  const info = NODE_INFO[def.kind];
  const bonus = getPlayerStats(state).miningYield;
  const amounts: Cost = { ...info.yield };
  amounts[info.primary] = (amounts[info.primary] ?? 0) + (def.kind === 'wreck' ? Math.floor(bonus / 2) : bonus);
  const g = grantStacks(state, amounts, 'collect');
  if (Object.keys(g.added).length === 0) return { ok: false, reason: '저장 공간이 가득 찼습니다. 물류 저장고를 건설하세요.' };
  const charges = node.charges - 1;
  let s: GameState = {
    ...g.state,
    nodes: { ...g.state.nodes, [nodeId]: { charges, regenIn: charges <= 0 ? def.regenTime : 0 } },
  };
  const x = grantXp(s, COLLECT_XP);
  s = x.state;
  return { ok: true, state: s, events: [...g.events, ...x.events], added: g.added };
}
