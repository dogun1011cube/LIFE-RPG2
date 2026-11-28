import type { GameState } from '../game/types';
import type { SyncMeta } from '../store/persistence';
import type { CloudSave } from './types';

/**
 * What to do when an account's local copy meets its cloud save.
 *   useLocal  — the local copy is the newest (push it if it has unsynced changes)
 *   useCloud  — another device saved something newer and this device has no unsynced changes
 *   conflict  — both sides changed since they last agreed → the player chooses
 *   empty     — brand-new account: no cloud save and no local copy
 */
export type Reconcile = { kind: 'useLocal'; push: boolean } | { kind: 'useCloud' } | { kind: 'conflict' } | { kind: 'empty' };

export function reconcile(local: GameState | null, meta: SyncMeta | null, cloud: CloudSave | null): Reconcile {
  if (!cloud && !local) return { kind: 'empty' };
  if (!cloud) return { kind: 'useLocal', push: true };
  if (!local) return { kind: 'useCloud' };
  const baseRev = meta?.baseRev ?? 0;
  const dirty = meta ? meta.dirty : true;
  if (cloud.rev === baseRev) return { kind: 'useLocal', push: dirty };
  if (cloud.rev > baseRev) return dirty ? { kind: 'conflict' } : { kind: 'useCloud' };
  return { kind: 'conflict' }; // cloud went backwards (restored server) → let the player decide
}

/** One-line description of a save for choice dialogs. */
export function describeSave(s: GameState) {
  const studyMin = Math.floor(s.study.reduce((a, r) => a + (r.seconds || 0), 0) / 60);
  return { name: s.player.name, day: s.day.number, exp: s.player.totalExp, study: `${Math.floor(studyMin / 60)}시간 ${studyMin % 60}분`, savedAt: s.savedAt };
}
