import { BUILDINGS } from '../../data/buildings';
import { TECHNOLOGIES } from '../../data/technologies';
import { RECIPES } from '../../data/recipes';
import { QUESTS } from '../../data/quests';
import { ENEMY_SPAWNS, RESOURCE_NODES } from '../../data/world';
import { isKnownStack } from '../resources/inventory';
import { createInitialState } from '../initialState';
import type { BuildingInstance, EquipSlot, GameState, QuestProgress, Vec3 } from '../types';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'project-genesis.save';

export interface SaveData {
  version: number;
  savedAt: string;
  game: GameState;
}

/**
 * Migrations upgrade older save formats step by step:
 * MIGRATIONS[n] converts a version-n payload into version n+1.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (d) => ({ ...d, version: 2, game: { ...d.game, newField: default } }),
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const vec3 = (v: unknown, fallback: Vec3): Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? [v[0], v[1], v[2]] : fallback;

/** Validates an untrusted payload, keeping valid parts and falling back to defaults elsewhere. */
export function sanitizeGameState(raw: unknown): GameState {
  const def = createInitialState();
  if (!isObj(raw)) return def;

  // Player
  const p = isObj(raw.player) ? raw.player : {};
  const equipment: Partial<Record<EquipSlot, string>> = {};
  if (isObj(p.equipment)) {
    for (const slot of ['weapon', 'armor', 'tool', 'module'] as EquipSlot[]) {
      const id = p.equipment[slot];
      if (typeof id === 'string' && isKnownStack(id)) equipment[slot] = id;
    }
  }
  const training = isObj(p.training) ? p.training : {};
  const player = {
    level: Math.floor(num(p.level, 1, 1, 30)),
    xp: num(p.xp, 0, 0),
    hp: num(p.hp, def.player.hp, 1),
    position: vec3(p.position, def.player.position),
    yaw: num(p.yaw, 0),
    equipment: Object.keys(equipment).length ? equipment : def.player.equipment,
    training: { vitality: Math.floor(num(training.vitality, 0, 0, 5)), strength: Math.floor(num(training.strength, 0, 0, 5)) },
    deaths: Math.floor(num(p.deaths, 0, 0)),
  };

  // Inventory
  const inventory: Record<string, number> = { ...def.inventory };
  if (isObj(raw.inventory)) {
    for (const [k, v] of Object.entries(raw.inventory)) if (isKnownStack(k)) inventory[k] = num(v, 0, 0);
  }

  // Buildings
  const buildings: BuildingInstance[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw.buildings)) {
    for (const b of raw.buildings) {
      if (!isObj(b) || typeof b.id !== 'string' || typeof b.type !== 'string' || !BUILDINGS[b.type] || seen.has(b.id)) continue;
      seen.add(b.id);
      buildings.push({
        id: b.id,
        type: b.type,
        ownerId: typeof b.ownerId === 'string' ? b.ownerId : 'local-player',
        position: vec3(b.position, [0, 0, 0]),
        rotation: num(b.rotation, 0),
        enabled: b.enabled !== false,
        state: 'unpowered',
        progress: num(b.progress, 0, 0),
        produced: num(b.produced, 0, 0),
        veinResource: typeof b.veinResource === 'string' && isKnownStack(b.veinResource) ? (b.veinResource as BuildingInstance['veinResource']) : undefined,
        builtAt: num(b.builtAt, 0),
        prebuilt: b.prebuilt === true,
      });
    }
  }
  if (!buildings.some((b) => b.prebuilt)) buildings.unshift(...def.buildings);

  // Research
  const r = isObj(raw.research) ? raw.research : {};
  const completed = Array.isArray(r.completed) ? r.completed.filter((t): t is string => typeof t === 'string' && !!TECHNOLOGIES[t]) : [];
  let active: GameState['research']['active'] = null;
  if (isObj(r.active) && typeof r.active.techId === 'string' && TECHNOLOGIES[r.active.techId] && !completed.includes(r.active.techId)) {
    active = { techId: r.active.techId, progress: num(r.active.progress, 0, 0) };
  }

  // Craft queue
  const craftQueue = Array.isArray(raw.craftQueue)
    ? raw.craftQueue
        .filter((j): j is Record<string, unknown> => isObj(j) && typeof j.recipeId === 'string' && !!RECIPES[j.recipeId])
        .slice(0, 5)
        .map((j) => ({ recipeId: j.recipeId as string, progress: num(j.progress, 0, 0) }))
    : [];

  // Quests
  const quests: Record<string, QuestProgress> = { ...def.quests };
  if (isObj(raw.quests)) {
    for (const q of QUESTS) {
      const qp = raw.quests[q.id];
      if (!isObj(qp)) continue;
      const status = qp.status === 'active' || qp.status === 'completed' || qp.status === 'locked' ? qp.status : 'locked';
      quests[q.id] = {
        status,
        counters: q.objectives.map((_, i) => (Array.isArray(qp.counters) ? num(qp.counters[i], 0, 0) : 0)),
        done: q.objectives.map((_, i) => (Array.isArray(qp.done) ? qp.done[i] === true : false)),
      };
    }
    // Exactly zero or one active quest; if none active and some not completed, activate the first incomplete
    const active = QUESTS.filter((q) => quests[q.id].status === 'active');
    active.slice(1).forEach((q) => (quests[q.id] = { ...quests[q.id], status: 'locked' }));
    if (active.length === 0) {
      const firstOpen = QUESTS.find((q) => quests[q.id].status !== 'completed');
      if (firstOpen) quests[firstOpen.id] = { ...quests[firstOpen.id], status: 'active' };
    }
  }

  // World state
  const nodes = { ...def.nodes };
  if (isObj(raw.nodes)) {
    for (const n of RESOURCE_NODES) {
      const v = raw.nodes[n.id];
      if (isObj(v)) nodes[n.id] = { charges: Math.floor(num(v.charges, n.charges, 0, n.charges)), regenIn: num(v.regenIn, 0, 0) };
    }
  }
  const enemies = { ...def.enemies };
  if (isObj(raw.enemies)) {
    for (const e of ENEMY_SPAWNS) {
      const v = raw.enemies[e.id];
      if (isObj(v)) enemies[e.id] = { alive: v.alive !== false, respawnIn: num(v.respawnIn, 0, 0), defeats: Math.floor(num(v.defeats, 0, 0)) };
    }
  }

  const civ = isObj(raw.civ) ? { generatorBoost: Math.floor(num(raw.civ.generatorBoost, 0, 0, 3)) } : def.civ;
  const discovered = Array.isArray(raw.discovered) ? raw.discovered.filter((d): d is string => typeof d === 'string') : [];
  const st = isObj(raw.stats) ? raw.stats : {};
  const numRecord = (v: unknown) =>
    isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]))) : {};
  const stats = {
    kills: numRecord(st.kills),
    collected: numRecord(st.collected),
    buildingsPlaced: Math.floor(num(st.buildingsPlaced, 0, 0)),
    playTime: num(st.playTime, 0, 0),
  };
  const maxId = buildings.reduce((m, b) => Math.max(m, Number(b.id.replace(/\D/g, '')) || 0), 0);

  return {
    player,
    inventory,
    buildings,
    research: { completed, active },
    craftQueue,
    quests,
    nodes,
    enemies,
    civ,
    discovered,
    stats,
    time: num(raw.time, 0, 0),
    nextId: Math.max(Math.floor(num(raw.nextId, 1, 1)), maxId + 1),
  };
}

export function serialize(game: GameState): string {
  const data: SaveData = { version: SAVE_VERSION, savedAt: new Date().toISOString(), game };
  return JSON.stringify(data);
}

export type LoadResult = { ok: true; game: GameState; savedAt: string } | { ok: false; reason: string };

export function deserialize(text: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: '저장 데이터가 손상되었습니다.' };
  }
  if (!isObj(parsed) || typeof parsed.version !== 'number') return { ok: false, reason: '알 수 없는 저장 형식입니다.' };
  let data: Record<string, unknown> = parsed;
  if ((data.version as number) > SAVE_VERSION) return { ok: false, reason: '더 최신 버전의 저장 파일입니다.' };
  while ((data.version as number) < SAVE_VERSION) {
    const migrate = MIGRATIONS[data.version as number];
    if (!migrate) return { ok: false, reason: `버전 ${data.version} 저장 파일을 변환할 수 없습니다.` };
    data = migrate(data);
  }
  return { ok: true, game: sanitizeGameState(data.game), savedAt: typeof data.savedAt === 'string' ? data.savedAt : '' };
}

// ---- Storage backend (localStorage). Wrapped so it never throws.

export function writeSave(game: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(game));
    return true;
  } catch {
    return false;
  }
}

export function readSave(): LoadResult {
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY);
  } catch {
    return { ok: false, reason: '저장소에 접근할 수 없습니다.' };
  }
  if (!text) return { ok: false, reason: '저장된 게임이 없습니다.' };
  return deserialize(text);
}

export function saveInfo(): { savedAt: string; level: number } | null {
  const r = readSave();
  return r.ok ? { savedAt: r.savedAt, level: r.game.player.level } : null;
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
