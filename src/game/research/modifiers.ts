import { TECHNOLOGIES } from '../../data/technologies';
import { BUILDINGS } from '../../data/buildings';
import { RECIPES } from '../../data/recipes';
import { RESOURCES } from '../../data/resources';
import type { Capacities } from '../resources/inventory';
import type { GameState, ModifierKey } from '../types';

export function getModifier(completed: string[], key: ModifierKey): number {
  let sum = 0;
  for (const id of completed) {
    const tech = TECHNOLOGIES[id];
    if (!tech) continue;
    for (const e of tech.effects) if (e.type === 'modifier' && e.key === key) sum += e.value;
  }
  return sum;
}

export function isTechCompleted(state: GameState, techId: string) {
  return state.research.completed.includes(techId);
}

export function isBuildingUnlocked(state: GameState, buildingId: string) {
  const def = BUILDINGS[buildingId];
  if (!def) return false;
  return !def.requiredTech || isTechCompleted(state, def.requiredTech);
}

export function isRecipeUnlocked(state: GameState, recipeId: string) {
  const r = RECIPES[recipeId];
  if (!r) return false;
  return !r.requiredTech || isTechCompleted(state, r.requiredTech);
}

export const BASE_STORAGE = 150;
export const BASE_ENERGY_STORAGE = 100;

export function getStorageCapacity(state: GameState) {
  let bonus = 0;
  for (const b of state.buildings) bonus += BUILDINGS[b.type]?.storageBonus ?? 0;
  return Math.floor((BASE_STORAGE + bonus) * (1 + getModifier(state.research.completed, 'storageCapacity')));
}

export function getEnergyCapacity(state: GameState) {
  let bonus = 0;
  for (const b of state.buildings) bonus += BUILDINGS[b.type]?.energyStorageBonus ?? 0;
  return BASE_ENERGY_STORAGE + bonus;
}

/** Capacity per stack id. Uncapped stacks (gold, items) are absent. */
export function getCapacities(state: GameState): Capacities {
  const storage = getStorageCapacity(state);
  const caps: Capacities = {};
  for (const r of Object.values(RESOURCES)) {
    if (!r.capped) continue;
    caps[r.id] = r.id === 'energy' ? getEnergyCapacity(state) : storage;
  }
  return caps;
}
