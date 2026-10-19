import { RESOURCES, isResourceId } from '../../data/resources';
import { ITEMS } from '../../data/items';
import type { Cost, StackId } from '../types';

// Resource transactions. Every change to the inventory goes through these helpers so
// balances can never become negative or exceed storage limits.

export type Inventory = Record<StackId, number>;
export type Capacities = Partial<Record<StackId, number>>;

export function count(inv: Inventory, id: StackId) {
  return inv[id] ?? 0;
}

export function costEntries(cost: Cost): [StackId, number][] {
  return Object.entries(cost).filter((e): e is [StackId, number] => typeof e[1] === 'number' && e[1] > 0);
}

export function canAfford(inv: Inventory, cost: Cost) {
  return costEntries(cost).every(([id, n]) => count(inv, id) >= n);
}

export function missing(inv: Inventory, cost: Cost): { id: StackId; need: number; have: number }[] {
  return costEntries(cost)
    .filter(([id, n]) => count(inv, id) < n)
    .map(([id, n]) => ({ id, need: n, have: count(inv, id) }));
}

/** Returns a new inventory with the cost removed, or null if unaffordable. */
export function spend(inv: Inventory, cost: Cost): Inventory | null {
  if (!canAfford(inv, cost)) return null;
  const next = { ...inv };
  for (const [id, n] of costEntries(cost)) next[id] = Math.max(0, count(next, id) - n);
  return next;
}

/** Adds stacks respecting capacities. Returns the new inventory and the amounts actually added. */
export function add(inv: Inventory, stacks: Cost, caps: Capacities): { inv: Inventory; added: Cost } {
  const next = { ...inv };
  const added: Cost = {};
  for (const [id, n] of costEntries(stacks)) {
    if (!isKnownStack(id)) continue;
    const cap = caps[id];
    const current = count(next, id);
    const target = cap === undefined ? current + n : Math.min(cap, current + n);
    const delta = Math.max(0, target - current);
    if (delta > 0) {
      next[id] = Math.round((current + delta) * 1000) / 1000;
      added[id] = delta;
    } else if (next[id] === undefined) {
      next[id] = current;
    }
  }
  return { inv: next, added };
}

export function isKnownStack(id: StackId) {
  return isResourceId(id) || id in ITEMS;
}

export function stackName(id: StackId) {
  if (isResourceId(id)) return RESOURCES[id].name;
  return ITEMS[id]?.name ?? id;
}

export function stackColor(id: StackId) {
  if (isResourceId(id)) return RESOURCES[id].color;
  return ITEMS[id]?.color ?? '#ffffff';
}

export function formatCost(cost: Cost) {
  return costEntries(cost)
    .map(([id, n]) => `${stackName(id)} ${n}`)
    .join(', ');
}

export function scaleCost(cost: Cost, factor: number): Cost {
  const out: Cost = {};
  for (const [id, n] of costEntries(cost)) {
    const v = Math.floor(n * factor);
    if (v > 0) out[id] = v;
  }
  return out;
}
