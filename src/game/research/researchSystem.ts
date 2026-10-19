import { TECHNOLOGIES } from '../../data/technologies';
import { add, canAfford, missing, spend, stackName } from '../resources/inventory';
import { getCapacities } from './modifiers';
import type { GameState, SystemResult, TechStatus } from '../types';

export function getTechStatus(state: GameState, techId: string): TechStatus {
  const { completed, active } = state.research;
  if (completed.includes(techId)) return 'completed';
  if (active?.techId === techId) return 'researching';
  const tech = TECHNOLOGIES[techId];
  if (!tech) return 'locked';
  return tech.prerequisites.every((p) => completed.includes(p)) ? 'available' : 'locked';
}

export function hasLaboratory(state: GameState) {
  return state.buildings.some((b) => b.type === 'research_lab');
}

/** Why a technology can't be started right now (null = can start). */
export function researchBlocker(state: GameState, techId: string): string | null {
  const tech = TECHNOLOGIES[techId];
  if (!tech) return '알 수 없는 기술입니다.';
  const status = getTechStatus(state, techId);
  if (status === 'completed') return '이미 완료된 기술입니다.';
  if (status === 'researching') return '연구 진행 중입니다.';
  if (status === 'locked') {
    const need = tech.prerequisites.filter((p) => !state.research.completed.includes(p)).map((p) => TECHNOLOGIES[p]?.name ?? p);
    return `선행 기술 필요: ${need.join(', ')}`;
  }
  if (state.research.active) return '다른 연구가 진행 중입니다.';
  if (!hasLaboratory(state)) return '연구소가 필요합니다.';
  if (!canAfford(state.inventory, tech.cost)) {
    const m = missing(state.inventory, tech.cost)[0];
    return `자원 부족: ${stackName(m.id)} ${Math.floor(m.have)}/${m.need}`;
  }
  return null;
}

export function startResearch(state: GameState, techId: string): SystemResult {
  const blocker = researchBlocker(state, techId);
  if (blocker) return { ok: false, reason: blocker };
  const tech = TECHNOLOGIES[techId];
  const inv = spend(state.inventory, tech.cost);
  if (!inv) return { ok: false, reason: '자원이 부족합니다.' };
  return {
    ok: true,
    state: { ...state, inventory: inv, research: { ...state.research, active: { techId, progress: 0 } } },
    events: [{ type: 'researchStarted', tech: techId }],
  };
}

/** Cancelling refunds the full cost (limited by storage). */
export function cancelResearch(state: GameState): SystemResult {
  const active = state.research.active;
  if (!active) return { ok: false, reason: '진행 중인 연구가 없습니다.' };
  const tech = TECHNOLOGIES[active.techId];
  const { inv } = add(state.inventory, tech?.cost ?? {}, getCapacities(state));
  return { ok: true, state: { ...state, inventory: inv, research: { ...state.research, active: null } }, events: [] };
}
