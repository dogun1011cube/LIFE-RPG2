import type { GameState } from '../game/types';
import { decodeSave, encodeSave } from './codec';
import type { Account, CloudSave, OnlineBackend, PushResult } from './types';
import { normalizeUsername, OnlineError, UID_START } from './types';

/** Shared fake "server" — several MemoryBackend instances behave like several devices. */
export class MemoryServer {
  next = UID_START;
  users = new Map<string, { password: string; account: Account }>();
  saves = new Map<string, { rev: number; savedAt: number; data: string }>();
  online = true;
}

/** In-memory backend used by unit tests (same contract as the Firebase backend). */
export class MemoryBackend implements OnlineBackend {
  kind = 'memory' as const;
  private current: Account | null = null;
  constructor(public server: MemoryServer) {}

  private net() {
    if (!this.server.online) throw new OnlineError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.');
  }
  private need() {
    if (!this.current) throw new OnlineError('로그인이 필요합니다.');
    return this.current;
  }
  async init() {
    return this.current;
  }
  async signUp(username: string, password: string) {
    this.net();
    const u = normalizeUsername(username);
    if (this.server.users.has(u)) throw new OnlineError('이미 사용 중인 아이디입니다.');
    const account: Account = { authId: 'auth_' + u, uid: this.server.next++, username: u, createdAt: Date.now() };
    this.server.users.set(u, { password, account });
    this.current = account;
    return account;
  }
  async signIn(username: string, password: string) {
    this.net();
    const rec = this.server.users.get(normalizeUsername(username));
    if (!rec || rec.password !== password) throw new OnlineError('아이디 또는 비밀번호가 올바르지 않습니다.');
    this.current = rec.account;
    return rec.account;
  }
  async signOut() {
    this.current = null;
  }
  async changePassword(current: string, next: string) {
    this.net();
    const a = this.need();
    const rec = this.server.users.get(a.username)!;
    if (rec.password !== current) throw new OnlineError('아이디 또는 비밀번호가 올바르지 않습니다.');
    rec.password = next;
  }
  async pull(): Promise<CloudSave | null> {
    this.net();
    const d = this.server.saves.get(this.need().authId);
    return d ? { rev: d.rev, savedAt: d.savedAt, state: decodeSave(d.data) } : null;
  }
  async push(state: GameState, baseRev: number): Promise<PushResult> {
    this.net();
    const id = this.need().authId;
    const d = this.server.saves.get(id);
    const cur = d?.rev ?? 0;
    if (cur !== baseRev) return { ok: false, conflict: d ? { rev: d.rev, savedAt: d.savedAt, state: decodeSave(d.data) } : null };
    this.server.saves.set(id, { rev: cur + 1, savedAt: Date.now(), data: encodeSave(state) });
    return { ok: true, rev: cur + 1 };
  }
}
