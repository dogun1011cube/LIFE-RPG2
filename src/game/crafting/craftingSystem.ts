import { RECIPES } from '../../data/recipes';
import { ITEMS } from '../../data/items';
import { add, canAfford, count, missing, spend, stackName } from '../resources/inventory';
import { getCapacities, isRecipeUnlocked } from '../research/modifiers';
import { PROGRESSION, getPlayerStats, trainingCost } from '../progression/progression';
import type { EquipSlot, GameEvent, GameState, SystemResult } from '../types';

export const MAX_CRAFT_QUEUE = 5;

export function hasWorkshop(state: GameState) {
  return state.buildings.some((b) => b.type === 'workshop');
}

function queuedUpgrades(state: GameState) {
  return state.craftQueue.filter((j) => {
    const r = RECIPES[j.recipeId];
    return r && 'upgrade' in r.output;
  }).length;
}

export function craftBlocker(state: GameState, recipeId: string): string | null {
  const recipe = RECIPES[recipeId];
  if (!recipe) return '알 수 없는 제작법입니다.';
  if (!isRecipeUnlocked(state, recipeId)) return '필요 기술이 연구되지 않았습니다.';
  if (!hasWorkshop(state)) return '작업장을 먼저 건설하세요.';
  if (state.craftQueue.length >= MAX_CRAFT_QUEUE) return '제작 대기열이 가득 찼습니다.';
  if ('upgrade' in recipe.output && state.civ.generatorBoost + queuedUpgrades(state) >= recipe.output.max) {
    return '이미 최대 단계까지 강화했습니다.';
  }
  if (!canAfford(state.inventory, recipe.cost)) {
    const m = missing(state.inventory, recipe.cost)[0];
    return `자원 부족: ${stackName(m.id)} ${Math.floor(m.have)}/${m.need}`;
  }
  return null;
}

export function queueCraft(state: GameState, recipeId: string): SystemResult {
  const blocker = craftBlocker(state, recipeId);
  if (blocker) return { ok: false, reason: blocker };
  const inv = spend(state.inventory, RECIPES[recipeId].cost);
  if (!inv) return { ok: false, reason: '자원이 부족합니다.' };
  return { ok: true, state: { ...state, inventory: inv, craftQueue: [...state.craftQueue, { recipeId, progress: 0 }] }, events: [] };
}

export function cancelCraft(state: GameState, index: number): SystemResult {
  const job = state.craftQueue[index];
  if (!job) return { ok: false, reason: '제작 작업이 없습니다.' };
  const { inv } = add(state.inventory, RECIPES[job.recipeId]?.cost ?? {}, getCapacities(state));
  return { ok: true, state: { ...state, inventory: inv, craftQueue: state.craftQueue.filter((_, i) => i !== index) }, events: [] };
}

/** Applies a finished craft job (called by the simulation). */
export function completeCraft(state: GameState, recipeId: string): { state: GameState; events: GameEvent[] } {
  const recipe = RECIPES[recipeId];
  if (!recipe) return { state, events: [] };
  let next = state;
  if ('item' in recipe.output) {
    const { inv } = add(state.inventory, { [recipe.output.item]: recipe.output.amount }, getCapacities(state));
    next = { ...state, inventory: inv };
  } else {
    next = { ...state, civ: { ...state.civ, generatorBoost: Math.min(recipe.output.max, state.civ.generatorBoost + 1) } };
  }
  return { state: next, events: [{ type: 'crafted', recipe: recipeId }] };
}

// ---------------- Equipment ----------------

export function equipItem(state: GameState, itemId: string): SystemResult {
  const item = ITEMS[itemId];
  if (!item || item.category !== 'equipment' || !item.slot) return { ok: false, reason: '장착할 수 없는 아이템입니다.' };
  if (count(state.inventory, itemId) < 1) return { ok: false, reason: '아이템을 보유하고 있지 않습니다.' };
  const slot: EquipSlot = item.slot;
  const inventory = { ...state.inventory, [itemId]: count(state.inventory, itemId) - 1 };
  const prev = state.player.equipment[slot];
  if (prev) inventory[prev] = count(inventory, prev) + 1;
  let next: GameState = { ...state, inventory, player: { ...state.player, equipment: { ...state.player.equipment, [slot]: itemId } } };
  next = clampHp(next);
  return { ok: true, state: next, events: [] };
}

export function unequipSlot(state: GameState, slot: EquipSlot): SystemResult {
  const itemId = state.player.equipment[slot];
  if (!itemId) return { ok: false, reason: '장착된 아이템이 없습니다.' };
  const equipment = { ...state.player.equipment };
  delete equipment[slot];
  const inventory = { ...state.inventory, [itemId]: count(state.inventory, itemId) + 1 };
  return { ok: true, state: clampHp({ ...state, inventory, player: { ...state.player, equipment } }), events: [] };
}

export function useConsumable(state: GameState, itemId: string): SystemResult {
  const item = ITEMS[itemId];
  if (!item || item.category !== 'consumable') return { ok: false, reason: '사용할 수 없는 아이템입니다.' };
  if (count(state.inventory, itemId) < 1) return { ok: false, reason: `${item.name}이(가) 없습니다.` };
  const maxHp = getPlayerStats(state).maxHp;
  if (state.player.hp >= maxHp) return { ok: false, reason: '체력이 이미 가득 찼습니다.' };
  const hp = Math.min(maxHp, state.player.hp + (item.heal ?? 0));
  return {
    ok: true,
    state: { ...state, inventory: { ...state.inventory, [itemId]: count(state.inventory, itemId) - 1 }, player: { ...state.player, hp } },
    events: [],
  };
}

export function clampHp(state: GameState): GameState {
  const maxHp = getPlayerStats(state).maxHp;
  return state.player.hp > maxHp ? { ...state, player: { ...state.player, hp: maxHp } } : state;
}

// ---------------- Training (gold sink) ----------------

export function trainStat(state: GameState, stat: 'vitality' | 'strength'): SystemResult {
  const rank = state.player.training[stat];
  if (rank >= PROGRESSION.trainingMax) return { ok: false, reason: '최대 훈련 단계입니다.' };
  const cost = trainingCost(rank);
  const inv = spend(state.inventory, { gold: cost });
  if (!inv) return { ok: false, reason: `골드가 부족합니다. (${cost}G 필요)` };
  let next: GameState = {
    ...state,
    inventory: inv,
    player: { ...state.player, training: { ...state.player.training, [stat]: rank + 1 } },
  };
  if (stat === 'vitality') next = { ...next, player: { ...next.player, hp: next.player.hp + PROGRESSION.vitalityHp } };
  return { ok: true, state: next, events: [] };
}
