import { collectNode } from './resources/nodes';
import { demolishBuilding, placeBuilding, toggleBuilding } from './building/placement';
import { cancelResearch, startResearch } from './research/researchSystem';
import { cancelCraft, equipItem, queueCraft, trainStat, unequipSlot, useConsumable } from './crafting/craftingSystem';
import { defeatEnemy } from './combat/combatSystem';
import type { EquipSlot, GameState, SystemResult } from './types';

/**
 * Every player-initiated state change is expressed as a serialisable command.
 * In single-player, commands are executed locally (LocalAdapter). A future
 * multiplayer server can receive the same commands, validate them authoritatively
 * with these exact functions, and broadcast the resulting state/events.
 */
export type Command =
  | { type: 'collectNode'; nodeId: string }
  | { type: 'placeBuilding'; building: string; x: number; z: number; rotation: number; playerX?: number; playerZ?: number }
  | { type: 'demolishBuilding'; id: string }
  | { type: 'toggleBuilding'; id: string }
  | { type: 'startResearch'; tech: string }
  | { type: 'cancelResearch' }
  | { type: 'queueCraft'; recipe: string }
  | { type: 'cancelCraft'; index: number }
  | { type: 'equip'; item: string }
  | { type: 'unequip'; slot: EquipSlot }
  | { type: 'useItem'; item: string }
  | { type: 'train'; stat: 'vitality' | 'strength' }
  | { type: 'defeatEnemy'; spawnId: string; seed: number }
  | { type: 'discoverZone'; zone: string };

function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function executeCommand(state: GameState, cmd: Command): SystemResult {
  switch (cmd.type) {
    case 'collectNode':
      return collectNode(state, cmd.nodeId);
    case 'placeBuilding':
      return placeBuilding(
        state,
        cmd.building,
        cmd.x,
        cmd.z,
        cmd.rotation,
        cmd.playerX !== undefined && cmd.playerZ !== undefined ? { x: cmd.playerX, z: cmd.playerZ } : undefined,
      );
    case 'demolishBuilding':
      return demolishBuilding(state, cmd.id);
    case 'toggleBuilding':
      return toggleBuilding(state, cmd.id);
    case 'startResearch':
      return startResearch(state, cmd.tech);
    case 'cancelResearch':
      return cancelResearch(state);
    case 'queueCraft':
      return queueCraft(state, cmd.recipe);
    case 'cancelCraft':
      return cancelCraft(state, cmd.index);
    case 'equip':
      return equipItem(state, cmd.item);
    case 'unequip':
      return unequipSlot(state, cmd.slot);
    case 'useItem':
      return useConsumable(state, cmd.item);
    case 'train':
      return trainStat(state, cmd.stat);
    case 'defeatEnemy':
      return defeatEnemy(state, cmd.spawnId, seededRng(cmd.seed));
    case 'discoverZone':
      if (state.discovered.includes(cmd.zone)) return { ok: false, reason: 'already discovered' };
      return { ok: true, state: { ...state, discovered: [...state.discovered, cmd.zone] }, events: [{ type: 'entered', zone: cmd.zone }] };
  }
}
