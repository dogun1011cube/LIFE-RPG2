import { create } from 'zustand';
import { createInitialState } from '../game/initialState';
import { EMPTY_REPORT, simulate, type SimContext } from '../game/simulation/civilization';
import { processQuests } from '../game/quests/questSystem';
import { gameEvents } from '../game/events';
import type { Command } from '../game/commands';
import { LocalAdapter, type NetworkAdapter } from '../net/NetworkAdapter';
import { deleteSave, readSave, writeSave } from '../game/save/saveSystem';
import { damagePlayer, healPlayer, respawnPlayer } from '../game/combat/combatSystem';
import type { CivilizationReport, GameEvent, GameState, Vec3 } from '../game/types';

export interface GameStore {
  game: GameState;
  report: CivilizationReport;
  /** Increments whenever the world is replaced (new game / load) so runtime state resets */
  session: number;
  adapter: NetworkAdapter;

  dispatch: (cmd: Command) => { ok: boolean; reason?: string };
  tick: (dt: number, ctx: SimContext) => void;
  hurtPlayer: (raw: number, ignoreDefense?: boolean) => { died: boolean; dealt: number };
  heal: (amount: number) => void;
  respawn: () => { goldLost: number };
  syncPlayerTransform: (position: Vec3, yaw: number) => void;

  newGame: () => void;
  loadGame: () => { ok: boolean; reason?: string };
  saveGame: () => boolean;
  resetSave: () => void;
}

function commit(set: (p: Partial<GameStore>) => void, state: GameState, events: GameEvent[], extra: Partial<GameStore> = {}) {
  const q = processQuests(state, events);
  set({ game: q.state, ...extra });
  gameEvents.emit([...events, ...q.events]);
}

export const useGame = create<GameStore>((set, get) => ({
  game: createInitialState(),
  report: EMPTY_REPORT,
  session: 0,
  adapter: new LocalAdapter(),

  dispatch: (cmd) => {
    const result = get().adapter.submit(get().game, cmd);
    if (!result.ok) return { ok: false, reason: result.reason };
    commit(set, result.state, result.events);
    return { ok: true };
  },

  tick: (dt, ctx) => {
    const r = simulate(get().game, dt, { ...ctx, prev: get().report });
    commit(set, r.state, r.events, { report: r.report });
  },

  hurtPlayer: (raw, ignoreDefense) => {
    const r = damagePlayer(get().game, raw, ignoreDefense);
    set({ game: r.state });
    return { died: r.died, dealt: r.dealt };
  },

  heal: (amount) => {
    const next = healPlayer(get().game, amount);
    if (next !== get().game) set({ game: next });
  },

  respawn: () => {
    const r = respawnPlayer(get().game);
    set({ game: r.state });
    return { goldLost: r.goldLost };
  },

  syncPlayerTransform: (position, yaw) => {
    const g = get().game;
    set({ game: { ...g, player: { ...g.player, position, yaw } } });
  },

  newGame: () => {
    set({ game: createInitialState(), report: EMPTY_REPORT, session: get().session + 1 });
  },

  loadGame: () => {
    const r = readSave();
    if (!r.ok) return { ok: false, reason: r.reason };
    set({ game: r.game, report: EMPTY_REPORT, session: get().session + 1 });
    return { ok: true };
  },

  saveGame: () => writeSave(get().game),

  resetSave: () => {
    deleteSave();
  },
}));
