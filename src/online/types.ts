import type { GameState } from '../game/types';

/** A signed-in player. `uid` is the public, unique player number (UID 10000001…). */
export interface Account {
  authId: string;
  uid: number;
  username: string;
  createdAt: number;
}

export interface CloudSave {
  rev: number;
  savedAt: number;
  state: GameState;
}

export type PushResult = { ok: true; rev: number } | { ok: false; conflict: CloudSave | null };

/** Server abstraction: Firebase in production, an in-memory fake in unit tests. */
export interface OnlineBackend {
  kind: 'firebase' | 'memory';
  /** Restores a previous login (if any). */
  init(): Promise<Account | null>;
  signUp(username: string, password: string): Promise<Account>;
  signIn(username: string, password: string): Promise<Account>;
  signOut(): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  /** Reads the cloud save of the signed-in account. */
  pull(): Promise<CloudSave | null>;
  /** Writes the cloud save if the cloud is still at `baseRev` (optimistic locking). */
  push(state: GameState, baseRev: number): Promise<PushResult>;
}

export class OnlineError extends Error {}

export const UID_START = 10000001;
export const USERNAME_RE = /^[a-z0-9_]{4,16}$/;
export const PASSWORD_MIN = 6;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null when the username is valid. */
export function usernameProblem(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 4 || u.length > 16) return '아이디는 4~16자로 입력해 주세요.';
  if (!USERNAME_RE.test(u)) return '아이디는 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어요.';
  return null;
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  if (pw.length > 64) return '비밀번호가 너무 길어요. (최대 64자)';
  return null;
}

export function formatUid(uid: number) {
  return `UID ${uid}`;
}
