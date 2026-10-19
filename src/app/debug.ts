import { useGame } from '../state/gameStore';
import { useUi } from '../state/uiStore';
import { runtime } from '../game/runtime';
import * as actions from '../game/actions';
import { perf } from '../game/GameLoop';

/**
 * Exposes read access and actions on window.__genesis for automated browser tests
 * and debugging from the devtools console. It calls the same actions the UI uses.
 */
export function installDebugHooks() {
  const w = window as unknown as Record<string, unknown>;
  w.__genesis = { game: useGame, ui: useUi, runtime, actions, perf };
  return () => {
    delete w.__genesis;
  };
}
