import type { GameEvent } from './types';

type Listener = (events: GameEvent[]) => void;
const listeners = new Set<Listener>();

/** Lightweight event bus: systems emit, UI/audio/feedback subscribe. */
export const gameEvents = {
  emit(events: GameEvent[]) {
    if (events.length === 0) return;
    for (const l of listeners) l(events);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
