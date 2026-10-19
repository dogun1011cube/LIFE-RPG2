import { ENEMY_SPAWNS, PLAYER_START, PREBUILT_LAB_POS, RESOURCE_NODES } from '../data/world';
import { initialQuestState } from './quests/questSystem';
import { LOCAL_PLAYER_ID } from './building/placement';
import { terrainHeight } from './world/terrain';
import type { GameState } from './types';

export function createInitialState(): GameState {
  const [px, pz] = PLAYER_START;
  const [lx, lz] = PREBUILT_LAB_POS;
  return {
    player: {
      level: 1,
      xp: 0,
      hp: 100,
      position: [px, terrainHeight(px, pz), pz],
      yaw: 0,
      equipment: { weapon: 'rusty_blade' },
      training: { vitality: 0, strength: 0 },
      deaths: 0,
    },
    inventory: { gold: 20, iron: 0, copper: 0, silicon: 0, energy: 0, research: 0, alloy: 0, med_pack: 2 },
    buildings: [
      {
        id: 'b_outpost_lab',
        type: 'research_lab',
        ownerId: LOCAL_PLAYER_ID,
        position: [lx, terrainHeight(lx, lz), lz],
        rotation: Math.PI / 2,
        enabled: true,
        state: 'unpowered',
        progress: 0,
        produced: 0,
        builtAt: 0,
        prebuilt: true,
      },
    ],
    research: { completed: [], active: null },
    craftQueue: [],
    quests: initialQuestState(),
    nodes: Object.fromEntries(RESOURCE_NODES.map((n) => [n.id, { charges: n.charges, regenIn: 0 }])),
    enemies: Object.fromEntries(ENEMY_SPAWNS.map((e) => [e.id, { alive: true, respawnIn: 0, defeats: 0 }])),
    civ: { generatorBoost: 0 },
    discovered: [],
    stats: { kills: {}, collected: {}, buildingsPlaced: 0, playTime: 0 },
    time: 0,
    nextId: 1,
  };
}
