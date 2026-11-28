import { beforeEach, describe, expect, it } from 'vitest';

// minimal localStorage for the node test environment (per-test reset below)
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
const g = globalThis as unknown as { localStorage: MemStorage };
g.localStorage = new MemStorage();

import { createNewGame } from '../game/state';
import { act, getState, hasState, saveNow, setState } from '../store/store';
import { getProfile, GUEST, readSaveOf, setProfile, getSyncMeta } from '../store/persistence';
import { decodeSave, encodeSave } from './codec';
import { MemoryBackend, MemoryServer } from './memoryBackend';
import { _resetOnlineForTests, getOnline, initOnline, logout, resolveConflict, signInAndEnter, signUpAndEnter, startAccountGame, syncNow } from './session';
import { reconcile } from './sync';
import { displayUsername, loginIdOf, UID_START, usernameProblem } from './types';

function freshDevice() {
  g.localStorage.clear();
  setProfile(GUEST);
  setState(null, false);
  _resetOnlineForTests();
}

beforeEach(() => freshDevice());

describe('online: reconcile rules', () => {
  const s = createNewGame('t');
  const cloud = (rev: number) => ({ rev, savedAt: 1, state: s });
  it('decides between local, cloud and conflict', () => {
    expect(reconcile(null, null, null).kind).toBe('empty');
    expect(reconcile(s, null, null)).toEqual({ kind: 'useLocal', push: true });
    expect(reconcile(null, null, cloud(3)).kind).toBe('useCloud');
    expect(reconcile(s, { baseRev: 3, dirty: false, lastSyncAt: 0 }, cloud(3))).toEqual({ kind: 'useLocal', push: false });
    expect(reconcile(s, { baseRev: 3, dirty: true, lastSyncAt: 0 }, cloud(3))).toEqual({ kind: 'useLocal', push: true });
    expect(reconcile(s, { baseRev: 2, dirty: false, lastSyncAt: 0 }, cloud(3)).kind).toBe('useCloud');
    expect(reconcile(s, { baseRev: 2, dirty: true, lastSyncAt: 0 }, cloud(3)).kind).toBe('conflict');
  });

  it('validates usernames and round-trips saves through the codec', () => {
    expect(usernameProblem('ab')).toBeTruthy();
    expect(usernameProblem('Hero_01')).toBeNull(); // normalized to lowercase
    // Hangul IDs: 2~10 characters
    expect(usernameProblem('용사')).toBeNull();
    expect(usernameProblem('공부왕_123')).toBeNull();
    expect(usernameProblem('용')).toBeTruthy();
    expect(usernameProblem('가나다라마바사아자차카')).toBeTruthy(); // 11 chars
    expect(usernameProblem('용사!')).toBeTruthy();
    expect(usernameProblem('ㄱㄴㄷ')).toBeTruthy(); // jamo only, not syllables
    expect(usernameProblem('abc')).toBeTruthy(); // English-only still 4+
    const st = createNewGame('코덱');
    st.study.push({ id: 'r', subject: '화학2', seconds: 3600, day: 1, at: 0, exp: 60, gold: 30, stamina: 6, bonusPct: 0 });
    const back = decodeSave(encodeSave(st));
    expect(back.player.name).toBe('코덱');
    expect(back.study[0].seconds).toBe(3600);
  });
});

describe('online: Hangul usernames', () => {
  it('encodes Hangul IDs into an email-safe login id and back', () => {
    expect(loginIdOf('Hero_01')).toBe('hero_01'); // English IDs unchanged (existing accounts keep working)
    const id = loginIdOf('공부왕');
    expect(id).toMatch(/^k-[0-9a-f]+$/);
    expect(displayUsername(id)).toBe('공부왕');
    expect(loginIdOf('공부왕')).toBe(loginIdOf(' 공부왕 ')); // trimmed
    expect(loginIdOf('공부왕'.normalize('NFD'))).toBe(id); // macOS-style decomposed input
    expect(loginIdOf('가나다라마바사아자차')).toHaveLength(2 + 60); // 10 Hangul fit the 64-char email limit
    expect(displayUsername('hero_01')).toBe('hero_01');
  });

  it('signs up and in with a Hangul ID', async () => {
    const server = new MemoryServer();
    await initOnline({ backend: new MemoryBackend(server) });
    await signUpAndEnter('공부왕', 'secret1');
    expect(getOnline().account?.username).toBe('공부왕');
    await logout();
    await expect(signUpAndEnter('공부왕', 'other12')).rejects.toThrow('이미 사용 중인 아이디');
    await signInAndEnter('공부왕', 'secret1');
    expect(getOnline().account?.uid).toBe(UID_START);
  });
});

describe('online: accounts, UID and cloud saves', () => {
  it('hands out sequential UIDs and rejects duplicate usernames', async () => {
    const server = new MemoryServer();
    await initOnline({ backend: new MemoryBackend(server) });
    const r1 = await signUpAndEnter('alice', 'secret1');
    expect(r1.kind).toBe('empty');
    expect(getOnline().account?.uid).toBe(UID_START);
    await logout();
    await expect(signUpAndEnter('alice', 'secret9')).rejects.toThrow('이미 사용 중인 아이디');
    await signUpAndEnter('bob_2', 'secret2');
    expect(getOnline().account?.uid).toBe(UID_START + 1);
    await expect(signUpAndEnter('x', 'secret2')).rejects.toThrow();
  });

  it('sign-up can bring the guest progress along — and the guest save is kept', async () => {
    const server = new MemoryServer();
    await initOnline({ backend: new MemoryBackend(server) });
    setState(createNewGame('게스트'));
    act((d) => void (d.player.gold = 777));
    saveNow();
    const r = await signUpAndEnter('carol', 'secret1');
    expect(r.kind).toBe('empty');
    if (r.kind !== 'empty') return;
    expect(r.guest?.player.gold).toBe(777);
    await startAccountGame(r.guest!);
    expect(getProfile().id).not.toBe('guest');
    expect(server.saves.size).toBe(1);
    expect(getOnline().status).toBe('synced');
    // the guest slot still has its own save
    expect(readSaveOf('guest')?.player.gold).toBe(777);
  });

  it('logging in on another device loads the cloud save', async () => {
    const server = new MemoryServer();
    await initOnline({ backend: new MemoryBackend(server) });
    await signUpAndEnter('dave', 'secret1');
    await startAccountGame(createNewGame('데이브'));
    act((d) => void (d.player.gold = 4242));
    saveNow();
    expect(await syncNow()).toBe(true);

    freshDevice(); // ── device B
    await initOnline({ backend: new MemoryBackend(server) });
    const r = await signInAndEnter('dave', 'secret1');
    expect(r).toEqual({ kind: 'loaded', from: 'cloud' });
    expect(getState().player.name).toBe('데이브');
    expect(getState().player.gold).toBe(4242);
    await expect(signInAndEnter('dave', 'wrongpw')).rejects.toThrow('올바르지 않습니다');
  });

  it('detects conflicts instead of overwriting, and keeps the other copy', async () => {
    const server = new MemoryServer();
    // device A
    await initOnline({ backend: new MemoryBackend(server) });
    await signUpAndEnter('erin', 'secret1');
    await startAccountGame(createNewGame('에린'));
    const authId = getProfile().id;
    const devA = new Map(g.localStorage.m);

    // device B plays and syncs
    freshDevice();
    await initOnline({ backend: new MemoryBackend(server) });
    await signInAndEnter('erin', 'secret1');
    act((d) => void (d.player.gold = 1000));
    saveNow();
    expect(await syncNow()).toBe(true);
    expect(server.saves.get(authId)!.rev).toBe(2);

    // back on device A (still at rev 1) with its own offline progress
    freshDevice();
    g.localStorage.m = new Map(devA);
    setProfile(JSON.parse(devA.get('lifeRPG3.profile')!));
    const backendA = new MemoryBackend(server);
    await backendA.signIn('erin', 'secret1');
    setState(readSaveOf(authId), false);
    act((d) => void (d.player.gold = 5));
    saveNow();
    await initOnline({ backend: backendA });
    expect(getOnline().status).toBe('conflict');
    expect(getOnline().conflict?.cloud.state.player.gold).toBe(1000);
    expect(server.saves.get(authId)!.rev).toBe(2); // nothing overwritten

    await resolveConflict('cloud');
    expect(getState().player.gold).toBe(1000);
    expect(getOnline().status).toBe('synced');
    expect(getSyncMeta(authId)?.baseRev).toBe(2);
  });

  it('offline: changes stay local and are uploaded once the server is back', async () => {
    const server = new MemoryServer();
    await initOnline({ backend: new MemoryBackend(server) });
    await signUpAndEnter('frank', 'secret1');
    await startAccountGame(createNewGame('프랭크'));
    server.online = false;
    act((d) => void (d.player.gold = 31337));
    saveNow();
    expect(await syncNow()).toBe(false);
    expect(getOnline().status).toBe('error');
    expect(hasState() && getState().player.gold).toBe(31337); // game keeps working
    server.online = true;
    expect(await syncNow()).toBe(true);
    const saved = server.saves.get(getProfile().id)!;
    expect(decodeSave(saved.data).player.gold).toBe(31337);
  });

  it('logout returns to the untouched guest slot', async () => {
    const server = new MemoryServer();
    setState(createNewGame('손님'));
    await initOnline({ backend: new MemoryBackend(server) });
    await signUpAndEnter('gina', 'secret1');
    await startAccountGame(createNewGame('지나'));
    await logout();
    expect(getProfile().id).toBe('guest');
    expect(readSaveOf('guest')?.player.name).toBe('손님');
  });
});
