import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore/lite';
import { SAVE_VERSION } from '../game/state';
import type { GameState } from '../game/types';
import { decodeSave, encodeSave, saveSummary } from './codec';
import { EMULATOR_HOST, FIREBASE_CONFIG } from './config';
import type { Account, CloudSave, OnlineBackend, PushResult } from './types';
import { displayUsername, loginIdOf, OnlineError, UID_START } from './types';

// ─────────────────────────────────────────────────────────────
// Firebase backend
//   Auth      : email/password, where the email is "<login id>@player.liferpg.app"
//               (players only ever see / type their username; Hangul IDs are
//               hex-encoded into the login id — see loginIdOf / displayUsername).
//   Firestore : meta/counter (next UID), users/{authId} (profile), saves/{authId}.
// The SDK is loaded lazily so the offline game never downloads it.
// ─────────────────────────────────────────────────────────────

export const USER_EMAIL_DOMAIN = 'player.liferpg.app';
export const emailOf = (username: string) => `${loginIdOf(username)}@${USER_EMAIL_DOMAIN}`;

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': '이미 사용 중인 아이디입니다.',
  'auth/invalid-credential': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'auth/invalid-login-credentials': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'auth/wrong-password': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '아이디 또는 비밀번호가 올바르지 않습니다.',
  'auth/invalid-email': '사용할 수 없는 아이디입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'auth/network-request-failed': '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
  'auth/user-disabled': '사용이 중지된 계정입니다.',
  'auth/operation-not-allowed': '서버에서 아이디/비밀번호 로그인이 꺼져 있습니다. (Firebase 콘솔 → Authentication → 이메일/비밀번호 사용 설정)',
  'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 시도해 주세요.',
  'permission-denied': '서버가 요청을 거부했습니다. (보안 규칙 확인 필요)',
  unavailable: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
};

function toOnlineError(e: unknown): OnlineError {
  if (e instanceof OnlineError) return e;
  const code = (e as { code?: string })?.code || '';
  const msg = AUTH_ERRORS[code] || AUTH_ERRORS[code.replace(/^firestore\//, '')];
  if (msg) return new OnlineError(msg);
  return new OnlineError(`서버 오류가 발생했습니다. (${code || (e as Error)?.message || 'unknown'})`);
}

export async function createFirebaseBackend(): Promise<OnlineBackend> {
  const [{ initializeApp, getApps }, authMod, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
  const app: FirebaseApp = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  const auth: Auth = authMod.getAuth(app);
  const db: Firestore = fs.getFirestore(app);
  if (EMULATOR_HOST) {
    const host = EMULATOR_HOST.split(':')[0];
    try {
      authMod.connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      fs.connectFirestoreEmulator(db, host, 8080);
    } catch {
      /* already connected (hot reload) */
    }
  }

  const counterRef = fs.doc(db, 'meta', 'counter');
  const userRef = (id: string) => fs.doc(db, 'users', id);
  const saveRef = (id: string) => fs.doc(db, 'saves', id);

  function need(): User {
    const u = auth.currentUser;
    if (!u) throw new OnlineError('로그인이 필요합니다.');
    return u;
  }

  /** Reads the profile, or hands out the next UID if this account has none yet. */
  async function profileOf(user: User): Promise<Account> {
    const username = (user.email || '').split('@')[0];
    const snap = await fs.getDoc(userRef(user.uid));
    if (snap.exists()) {
      const d = snap.data() as { uid: number; username: string; createdAt: number };
      return { authId: user.uid, uid: d.uid, username: displayUsername(d.username), createdAt: d.createdAt };
    }
    const createdAt = Date.now();
    const uid = await fs.runTransaction(db, async (tx) => {
      const mine = await tx.get(userRef(user.uid));
      if (mine.exists()) return (mine.data() as { uid: number }).uid;
      const c = await tx.get(counterRef);
      const next = c.exists() ? Number((c.data() as { next: number }).next) : UID_START;
      tx.set(counterRef, { next: next + 1 });
      tx.set(userRef(user.uid), { uid: next, username, createdAt });
      return next;
    });
    return { authId: user.uid, uid, username: displayUsername(username), createdAt };
  }

  return {
    kind: 'firebase',
    async init() {
      await auth.authStateReady();
      const u = auth.currentUser;
      if (!u) return null;
      try {
        return await profileOf(u);
      } catch (e) {
        throw toOnlineError(e);
      }
    },
    async signUp(username, password) {
      try {
        const cred = await authMod.createUserWithEmailAndPassword(auth, emailOf(username), password);
        return await profileOf(cred.user);
      } catch (e) {
        throw toOnlineError(e);
      }
    },
    async signIn(username, password) {
      try {
        const cred = await authMod.signInWithEmailAndPassword(auth, emailOf(username), password);
        return await profileOf(cred.user);
      } catch (e) {
        throw toOnlineError(e);
      }
    },
    async signOut() {
      await authMod.signOut(auth);
    },
    async changePassword(current, next) {
      const u = need();
      try {
        await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email || '', current));
        await authMod.updatePassword(u, next);
      } catch (e) {
        throw toOnlineError(e);
      }
    },
    async pull(): Promise<CloudSave | null> {
      const u = need();
      try {
        const snap = await fs.getDoc(saveRef(u.uid));
        if (!snap.exists()) return null;
        const d = snap.data() as { rev: number; savedAt: number; data: string };
        return { rev: d.rev, savedAt: d.savedAt, state: decodeSave(d.data) };
      } catch (e) {
        throw toOnlineError(e);
      }
    },
    async push(state: GameState, baseRev: number): Promise<PushResult> {
      const u = need();
      const savedAt = Date.now();
      const data = encodeSave({ ...state, savedAt });
      try {
        return await fs.runTransaction(db, async (tx) => {
          const snap = await tx.get(saveRef(u.uid));
          const cur = snap.exists() ? Number((snap.data() as { rev: number }).rev) : 0;
          if (cur !== baseRev) {
            const d = snap.data() as { rev: number; savedAt: number; data: string } | undefined;
            return { ok: false, conflict: d ? { rev: d.rev, savedAt: d.savedAt, state: decodeSave(d.data) } : null } as PushResult;
          }
          tx.set(saveRef(u.uid), { rev: cur + 1, savedAt, v: SAVE_VERSION, enc: 'lz64', data, summary: saveSummary(state) });
          return { ok: true, rev: cur + 1 } as PushResult;
        });
      } catch (e) {
        throw toOnlineError(e);
      }
    },
  };
}
