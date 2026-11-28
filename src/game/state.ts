import { STARTER_CHARACTER } from '../data/characters';
import { DEFAULT_SUBJECTS } from '../data/subjects';
import type { GameState, LifetimeStats, Settings } from './types';
import { unlockStage } from './progression';

export const SAVE_VERSION = 3;

export function defaultStats(): LifetimeStats {
  return {
    goldEarned: 0,
    goldSpent: 0,
    expFromStudy: 0,
    expFromBattle: 0,
    expFromQuests: 0,
    expFromOther: 0,
    monstersDefeated: 0,
    battlesWon: 0,
    battlesLost: 0,
    escapes: 0,
    bossesDefeated: [],
    criticalHits: 0,
    highestDamage: 0,
    chestsOpened: 0,
    itemsBought: 0,
    itemsUsed: 0,
    upgradesSucceeded: 0,
    daysCompleted: 0,
    synthesized: 0,
    autoGachaRuns: 0,
    petMerges: 0,
  };
}

export function defaultSettings(): Settings {
  return {
    sound: true,
    volume: 0.6,
    music: false,
    dailyGoalMinutes: 60,
    scanlines: true,
    reduceMotion: false,
    introSeen: false,
  };
}

export function createNewGame(name: string, now = Date.now()): GameState {
  const starter = [
    { uid: 'start_w', itemId: 'w_wood', qty: 1, plus: 0, obtainedAt: now },
    { uid: 'start_a', itemId: 'a_tunic', qty: 1, plus: 0, obtainedAt: now },
    { uid: 'start_p', itemId: 'p_small', qty: 3, plus: 0, obtainedAt: now },
  ];
  return {
    version: SAVE_VERSION,
    createdAt: now,
    savedAt: now,
    player: {
      name: name.trim() || '모험가',
      createdAt: now,
      totalExp: 0,
      hp: 133,
      mp: 34,
      gold: 100,
      stamina: 6,
      equipment: { weapon: 'start_w', helmet: null, armor: 'start_a', gloves: null, boots: null, acc1: null, acc2: null },
      cosmetics: { title: null, cape: null, aura: null },
      activeCharacter: STARTER_CHARACTER,
      activePet: null,
      studyBuff: { expPct: 0, goldPct: 0 },
    },
    inventory: starter,
    ownedCosmetics: [],
    ownedCharacters: [STARTER_CHARACTER],
    subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
    study: [],
    day: {
      number: 1,
      status: 'active',
      startedAt: now,
      sleptAt: null,
      expEarned: 0,
      goldEarned: 0,
      goldSpent: 0,
      monstersDefeated: 0,
      floorsCleared: 0,
      battlesWon: 0,
      gachaPulls: 0,
    },
    dayHistory: [],
    streak: { current: 0, longest: 0 },
    tower: { highestCleared: 0, currentFloor: 1, flags: {}, runs: 0 },
    quests: { dailyClaimed: [], achievementsClaimed: [], notified: [] },
    monsters: {},
    gacha: { pulls: 0, pity: 0, charPity: 0, charPulls: 0, petPulls: 0, petPity: 0, history: [] },
    pets: [],
    stats: defaultStats(),
    discovered: starter.map((e) => e.itemId),
    rankSeen: 'F',
    stageSeen: 'F',
    timer: null,
    realReward: null,
    settings: defaultSettings(),
    legacy: null,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Deep-fill missing fields of a loaded save with defaults so that adding
 * new features in future updates never breaks (or wipes) an existing save.
 */
export function fillDefaults<T>(loaded: unknown, defaults: T): T {
  if (!isObj(loaded) || !isObj(defaults)) return (loaded === undefined ? defaults : (loaded as T));
  const out: Record<string, unknown> = { ...loaded };
  for (const [k, dv] of Object.entries(defaults as Record<string, unknown>)) {
    const lv = (loaded as Record<string, unknown>)[k];
    if (lv === undefined || lv === null) {
      out[k] = dv; // nullable fields have null defaults, so explicit nulls survive
    } else if (isObj(dv) && isObj(lv)) {
      out[k] = fillDefaults(lv, dv);
    }
  }
  return out as T;
}

/** Repairs a loaded state (missing fields, invalid numbers). Never deletes records. */
export function normalizeState(raw: unknown): GameState {
  const base = createNewGame(isObj(raw) && isObj(raw.player) ? String(raw.player.name ?? '모험가') : '모험가');
  const s = fillDefaults(raw, base);
  // saves made before unlock stages existed: don't re-announce stages already reached
  if (isObj(raw) && raw.stageSeen === undefined) s.stageSeen = unlockStage(s);
  // characters: the starter is always owned; the active one must be owned
  if (!Array.isArray(s.ownedCharacters)) s.ownedCharacters = [STARTER_CHARACTER];
  if (!s.ownedCharacters.includes(STARTER_CHARACTER)) s.ownedCharacters.unshift(STARTER_CHARACTER);
  if (!s.ownedCharacters.includes(s.player.activeCharacter)) s.player.activeCharacter = STARTER_CHARACTER;
  // pets: the active pet must exist
  if (!Array.isArray(s.pets)) s.pets = [];
  if (s.player.activePet && !s.pets.some((p) => p.uid === s.player.activePet)) s.player.activePet = null;
  // codex: saves made before it existed start with everything they currently hold / have pulled
  if (!isObj(raw) || !Array.isArray(raw.discovered)) {
    const ids = [...s.inventory.map((e) => e.itemId), ...(s.ownedCosmetics || []), ...((s.gacha?.history || []).map((h) => h.itemId))];
    s.discovered = Array.from(new Set(ids.filter((x) => typeof x === 'string')));
  }
  // Equipment slots are nullable; if the slot object came from defaults for an old save,
  // don't auto-equip starter items that the inventory doesn't contain.
  for (const pos of Object.keys(s.player.equipment) as (keyof typeof s.player.equipment)[]) {
    const uid = s.player.equipment[pos];
    if (uid && !s.inventory.some((e) => e.uid === uid)) s.player.equipment[pos] = null;
  }
  const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  s.player.totalExp = Math.max(0, num(s.player.totalExp));
  s.player.gold = Math.max(0, Math.floor(num(s.player.gold)));
  s.player.stamina = Math.max(0, Math.floor(num(s.player.stamina)));
  s.player.hp = num(s.player.hp, 100);
  s.player.mp = num(s.player.mp, 30);
  if (!Array.isArray(s.study)) s.study = [];
  if (!Array.isArray(s.inventory)) s.inventory = [];
  if (!Array.isArray(s.dayHistory)) s.dayHistory = [];
  if (!Array.isArray(s.subjects)) s.subjects = DEFAULT_SUBJECTS.map((x) => ({ ...x }));
  // NOTE: default subjects are only used for brand-new games. An existing save keeps its own
  // subject list (the player may have deleted defaults on purpose).
  // any subject referenced in records but missing from the list → add as custom
  for (const r of s.study) {
    if (!s.subjects.some((x) => x.name === r.subject)) {
      s.subjects.push({ name: r.subject, en: r.subject, stat: 'int', color: '#91a7ff', custom: true });
    }
  }
  s.version = SAVE_VERSION;
  return s;
}
