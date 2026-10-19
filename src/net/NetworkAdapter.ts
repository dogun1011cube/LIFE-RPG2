import type { Command } from '../game/commands';
import type { GameEvent, GameState, SystemResult } from '../game/types';
import { executeCommand } from '../game/commands';

/**
 * Transport-agnostic boundary between the client and the authority that owns the
 * simulation. Single-player uses LocalAdapter (the browser is the authority).
 *
 * A future multiplayer implementation (see docs/MULTIPLAYER.md) would provide a
 * RemoteAdapter that sends commands over WebSocket to an authoritative server and
 * applies the server's state deltas. No such adapter exists yet — multiplayer is
 * NOT implemented in this build.
 */
export interface NetworkAdapter {
  readonly mode: 'local' | 'remote';
  submit(state: GameState, cmd: Command): SystemResult;
  /** Remote adapters would push authoritative updates through this callback. */
  onRemoteUpdate?(cb: (state: GameState, events: GameEvent[]) => void): () => void;
}

export class LocalAdapter implements NetworkAdapter {
  readonly mode = 'local' as const;
  submit(state: GameState, cmd: Command): SystemResult {
    return executeCommand(state, cmd);
  }
}
