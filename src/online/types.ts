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
export const PASSWORD_MIN = 6;

/** English-only IDs (the original format). */
export const USERNAME_RE = /^[a-z0-9_]{4,16}$/;
/** IDs that contain Hangul: Hangul syllables, a-z, 0-9, _ — 2 to 10 characters. */
export const KOREAN_USERNAME_RE = /^[가-힣a-z0-9_]{2,10}$/;
const HAS_HANGUL = /[가-힣]/;
/** Prefix of encoded (Hangul) login IDs. '-' never appears in a plain ID, so the two can't collide. */
export const ENCODED_PREFIX = 'k-';

export function normalizeUsername(raw: string) {
  return raw.normalize('NFC').trim().toLowerCase();
}

/** Returns an error message, or null when the username is valid. */
export function usernameProblem(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (HAS_HANGUL.test(u)) {
    if (u.length < 2 || u.length > 10) return '한글이 들어간 아이디는 2~10자로 입력해 주세요.';
    if (!KOREAN_USERNAME_RE.test(u)) return '아이디는 한글, 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어요.';
    return null;
  }
  if (/[^a-z0-9_]/.test(u)) return '아이디는 한글, 영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어요.';
  if (u.length < 4 || u.length > 16) return '영문 아이디는 4~16자로 입력해 주세요. (한글이 들어가면 2자부터)';
  return null;
}

/**
 * The server-side login ID (local part of the internal email). English IDs are used as-is;
 * IDs with Hangul become "k-" + lowercase hex of their UTF-8 bytes (emails can't hold Hangul).
 */
export function loginIdOf(username: string): string {
  const u = normalizeUsername(username);
  if (!HAS_HANGUL.test(u)) return u;
  return ENCODED_PREFIX + Array.from(new TextEncoder().encode(u), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Turns a login ID back into the name the player typed. */
export function displayUsername(loginId: string): string {
  if (!loginId.startsWith(ENCODED_PREFIX)) return loginId;
  const hex = loginId.slice(ENCODED_PREFIX.length);
  if (!/^([0-9a-f]{2})+$/.test(hex)) return loginId;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16))));
  } catch {
    return loginId;
  }
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  if (pw.length > 64) return '비밀번호가 너무 길어요. (최대 64자)';
  return null;
}

export function formatUid(uid: number) {
  return `UID ${uid}`;
}
