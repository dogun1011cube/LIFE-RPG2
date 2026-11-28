import { useSyncExternalStore } from 'react';
import type { GameState } from '../game/types';
import { addSnapshot, getProfile, getSyncMeta, GUEST, readSaveOf, setProfile, setSyncMeta } from '../store/persistence';
import type { SyncMeta } from '../store/persistence';
import { emitEvents, getState, hasState, onSaved, saveNow, setState } from '../store/store';
import { onlineConfigured } from './config';
import { reconcile } from './sync';
import type { Account, CloudSave, OnlineBackend } from './types';
import { OnlineError, passwordProblem, usernameProblem } from './types';

// ─────────────────────────────────────────────────────────────
// Online session: login state + cloud save sync.
//   • The local save (per-account slot) stays the primary copy, so the game
//     keeps working offline; the cloud copy is synced in the background.
//   • Optimistic locking (cloud revision) — a save from another device is
//     never overwritten silently; the player picks which one to keep, and the
//     other one is kept as a local snapshot.
// ─────────────────────────────────────────────────────────────

export type SyncStatus = 'off' | 'guest' | 'connecting' | 'synced' | 'pending' | 'syncing' | 'error' | 'conflict' | 'relogin';

export interface OnlineState {
  configured: boolean;
  ready: boolean;
  account: Account | null;
  status: SyncStatus;
  lastSyncAt: number;
  message?: string;
  conflict: { cloud: CloudSave; local: GameState } | null;
}

export type EnterResult = { kind: 'loaded'; from: 'local' | 'cloud' } | { kind: 'conflict' } | { kind: 'empty'; guest: GameState | null };

/** Delay before unsynced changes are uploaded. */
export const PUSH_DELAY = 30_000;
export const RETRY_DELAY = 60_000;

let session: OnlineState = { configured: onlineConfigured(), ready: false, account: null, status: onlineConfigured() ? 'connecting' : 'off', lastSyncAt: 0, conflict: null };
const listeners = new Set<() => void>();
let backend: OnlineBackend | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing: Promise<boolean> | null = null;
let changeCounter = 0;
let suppressDirty = 0;
let wired = false;

function set(patch: Partial<OnlineState>) {
  session = { ...session, ...patch };
  listeners.forEach((l) => l());
}

export function getOnline() {
  return session;
}

export function subscribeOnline(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useOnline(): OnlineState {
  return useSyncExternalStore(subscribeOnline, getOnline, getOnline);
}

function toast(kind: 'save' | 'warn' | 'info', title: string, text?: string) {
  emitEvents([{ type: 'toast', kind, title, text }]);
}

function activeAccount(): Account | null {
  const a = session.account;
  return a && getProfile().id === a.authId ? a : null;
}

function metaOf(id: string): SyncMeta {
  return getSyncMeta(id) ?? { baseRev: 0, dirty: true, lastSyncAt: 0 };
}

/** Writes a state into the active slot without marking it as an unsynced change. */
function loadQuietly(state: GameState) {
  suppressDirty++;
  try {
    setState(state);
  } finally {
    suppressDirty--;
  }
}

function schedulePush(delay = PUSH_DELAY) {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, delay);
}

function clearPushTimer() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}

function wire() {
  if (wired) return;
  wired = true;
  onSaved(() => {
    // any save into an account slot counts as an unsynced change — even while offline or
    // before the session is (re)established, so the cloud copy can never silently replace it
    if (suppressDirty) return;
    const id = getProfile().id;
    if (id === 'guest') return;
    changeCounter++;
    const meta = metaOf(id);
    if (!meta.dirty) setSyncMeta(id, { ...meta, dirty: true });
    if (!activeAccount()) return;
    if (session.status === 'synced') set({ status: 'pending' });
    if (session.status !== 'conflict') schedulePush();
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && activeAccount() && metaOf(activeAccount()!.authId).dirty) void syncNow();
    });
  }
}

/** Starts the online layer (call once at app start). A custom backend is used by tests. */
export async function initOnline(opts: { backend?: OnlineBackend; create?: () => Promise<OnlineBackend> } = {}) {
  wire();
  if (!opts.backend && !opts.create && !onlineConfigured()) {
    set({ configured: false, ready: true, status: 'off' });
    return;
  }
  const p = getProfile();
  set({ configured: true, status: p.id === 'guest' ? 'guest' : 'connecting' });
  try {
    backend = opts.backend ?? (opts.create ? await opts.create() : await (await import('./firebaseBackend')).createFirebaseBackend());
  } catch {
    set({ ready: true, status: p.id === 'guest' ? 'guest' : 'error', message: '온라인 기능을 불러오지 못했습니다. 이 기기의 진행 상황으로 계속할 수 있어요.' });
    return;
  }
  let account: Account | null = null;
  try {
    account = await backend.init();
  } catch (e) {
    set({ ready: true, status: p.id === 'guest' ? 'guest' : 'error', message: (e as Error).message });
    return;
  }
  if (p.id !== 'guest') {
    if (account && account.authId === p.id) {
      set({ account, ready: true });
      await reconcileActive();
    } else {
      set({ account, ready: true, status: 'relogin', message: '로그인이 만료되었어요. 다시 로그인하면 클라우드와 동기화됩니다. (이 기기의 진행 상황으로 계속 플레이할 수 있어요)' });
    }
  } else {
    // a server session without an account slot (e.g. interrupted login) — keep things simple: sign out
    if (account) await backend.signOut().catch(() => undefined);
    set({ account: null, ready: true, status: 'guest' });
  }
}

/** Compares the active account's local copy with the cloud and applies the result. */
async function reconcileActive(): Promise<EnterResult> {
  const a = activeAccount();
  if (!a || !backend) return { kind: 'loaded', from: 'local' };
  set({ status: 'syncing', message: undefined });
  let cloud: CloudSave | null;
  try {
    cloud = await withTimeout(backend.pull(), 10_000);
  } catch (e) {
    set({ status: 'error', message: (e as Error).message });
    schedulePush(RETRY_DELAY);
    return { kind: 'loaded', from: 'local' };
  }
  const local = hasState() ? getState() : readSaveOf(a.authId);
  const meta = getSyncMeta(a.authId);
  const r = reconcile(local, meta, cloud);
  switch (r.kind) {
    case 'useLocal':
      if (local && !hasState()) setState(local, false);
      if (r.push) {
        set({ status: 'pending' });
        await syncNow();
      } else {
        setSyncMeta(a.authId, { baseRev: cloud?.rev ?? 0, dirty: false, lastSyncAt: Date.now() });
        set({ status: 'synced', lastSyncAt: Date.now() });
      }
      return { kind: 'loaded', from: 'local' };
    case 'useCloud':
      loadQuietly(cloud!.state);
      setSyncMeta(a.authId, { baseRev: cloud!.rev, dirty: false, lastSyncAt: Date.now() });
      set({ status: 'synced', lastSyncAt: Date.now() });
      if (local) toast('save', '클라우드 동기화', '다른 기기에서 저장한 최신 진행 상황을 불러왔어요.');
      return { kind: 'loaded', from: 'cloud' };
    case 'conflict':
      if (local && !hasState()) setState(local, false);
      set({ status: 'conflict', conflict: { cloud: cloud!, local: local! } });
      return { kind: 'conflict' };
    case 'empty':
      set({ status: 'synced' });
      return { kind: 'empty', guest: readSaveOf('guest') };
  }
}

async function enter(account: Account): Promise<EnterResult> {
  clearPushTimer();
  const keepCurrentAsGuest = getProfile().id === 'guest' && hasState() ? getState() : null;
  setProfile({ id: account.authId, uid: account.uid, username: account.username });
  set({ account, conflict: null });
  // switch the in-memory game to this account's local copy (the guest slot stays as it was)
  const local = readSaveOf(account.authId);
  if (local) setState(local, false);
  else setState(null, false);
  const r = await reconcileActive();
  if (r.kind === 'empty') return { kind: 'empty', guest: keepCurrentAsGuest ?? r.guest };
  return r;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new OnlineError('서버 응답이 없습니다. 인터넷 연결을 확인해 주세요.')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function requireBackend() {
  if (!backend) throw new OnlineError('온라인 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  return backend;
}

export async function signUpAndEnter(username: string, password: string): Promise<EnterResult> {
  const bad = usernameProblem(username) ?? passwordProblem(password);
  if (bad) throw new OnlineError(bad);
  const account = await requireBackend().signUp(username, password);
  return enter(account);
}

export async function signInAndEnter(username: string, password: string): Promise<EnterResult> {
  if (!username.trim() || !password) throw new OnlineError('아이디와 비밀번호를 입력해 주세요.');
  const account = await requireBackend().signIn(username, password);
  return enter(account);
}

/** For a brand-new account: start it from the given state (guest progress or a new game). */
export async function startAccountGame(state: GameState) {
  const a = activeAccount();
  if (!a) throw new OnlineError('로그인이 필요합니다.');
  setState(state); // writes the account slot
  setSyncMeta(a.authId, { baseRev: getSyncMeta(a.authId)?.baseRev ?? 0, dirty: true, lastSyncAt: 0 });
  await syncNow();
}

/** Uploads the current game now. Returns true when the cloud is up to date. */
export function syncNow(force = false): Promise<boolean> {
  if (pushing) return pushing;
  pushing = doPush(force).finally(() => {
    pushing = null;
  });
  return pushing;
}

async function doPush(force: boolean): Promise<boolean> {
  clearPushTimer();
  const a = activeAccount();
  if (!a || !backend || !hasState()) return false;
  if (session.status === 'conflict' && !force) return false;
  saveNow(); // flush a pending local save first so it is part of this upload
  const meta = metaOf(a.authId);
  const started = changeCounter;
  set({ status: 'syncing' });
  try {
    let r = await backend.push(getState(), meta.baseRev);
    if (!r.ok && !r.conflict) {
      // the cloud save disappeared (deleted on the server) — start a fresh revision chain
      r = await backend.push(getState(), 0);
    }
    if (r.ok) {
      const dirty = changeCounter !== started;
      const now = Date.now();
      setSyncMeta(a.authId, { baseRev: r.rev, dirty, lastSyncAt: now });
      set({ status: dirty ? 'pending' : 'synced', lastSyncAt: now, message: undefined, conflict: null });
      if (dirty) schedulePush();
      return !dirty;
    }
    set({ status: 'conflict', conflict: { cloud: r.conflict!, local: getState() } });
    return false;
  } catch (e) {
    set({ status: 'error', message: (e as Error).message });
    schedulePush(RETRY_DELAY);
    return false;
  }
}

/** Resolves a save conflict. The version that is not kept is stored as a local snapshot. */
export async function resolveConflict(keep: 'cloud' | 'local') {
  const a = activeAccount();
  const c = session.conflict;
  if (!a || !c) return;
  if (keep === 'cloud') {
    addSnapshot(c.local, '충돌 해결 전 · 이 기기의 진행 상황');
    loadQuietly(c.cloud.state);
    setSyncMeta(a.authId, { baseRev: c.cloud.rev, dirty: false, lastSyncAt: Date.now() });
    set({ status: 'synced', conflict: null, lastSyncAt: Date.now() });
    toast('save', '클라우드 진행 상황을 불러왔어요', '이 기기의 진행 상황은 설정 → 자동 백업에 보관했습니다.');
  } else {
    addSnapshot(c.cloud.state, '충돌 해결 전 · 클라우드의 진행 상황');
    setSyncMeta(a.authId, { baseRev: c.cloud.rev, dirty: true, lastSyncAt: Date.now() });
    set({ conflict: null, status: 'pending' });
    const ok = await syncNow(true);
    if (ok) toast('save', '이 기기의 진행 상황을 클라우드에 저장했어요', '이전 클라우드 진행 상황은 설정 → 자동 백업에 보관했습니다.');
  }
}

/** Uploads pending changes (best effort), signs out and switches back to the guest slot. */
export async function logout() {
  clearPushTimer();
  const a = activeAccount();
  if (a && backend && hasState() && metaOf(a.authId).dirty && session.status !== 'conflict') {
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 5000))]);
  }
  await backend?.signOut().catch(() => undefined);
  setProfile(GUEST);
  set({ account: null, status: session.configured ? 'guest' : 'off', conflict: null, message: undefined });
}

export async function changePassword(current: string, next: string) {
  const bad = passwordProblem(next);
  if (bad) throw new OnlineError(bad);
  await requireBackend().changePassword(current, next);
}

// start tracking local saves right away (before the server is reached)
wire();

/** Test helper: resets module state. */
export function _resetOnlineForTests() {
  clearPushTimer();
  backend = null;
  pushing = null;
  changeCounter = 0;
  session = { configured: false, ready: false, account: null, status: 'off', lastSyncAt: 0, conflict: null };
}
