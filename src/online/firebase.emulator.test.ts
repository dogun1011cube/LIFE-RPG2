import { describe, expect, it } from 'vitest';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, runTransaction, setDoc } from 'firebase/firestore/lite';
import { createNewGame } from '../game/state';
import { createFirebaseBackend, emailOf } from './firebaseBackend';
import { FIREBASE_CONFIG } from './config';

// Runs only against the local Firebase emulators:
//   firebase emulators:start --only auth,firestore --project demo-liferpg
//   VITE_FIREBASE_EMULATOR=127.0.0.1 VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_PROJECT_ID=demo-liferpg VITE_FIREBASE_APP_ID=demo-app npx vitest run src/online/firebase.emulator.test.ts
const ON = !!process.env.VITE_FIREBASE_EMULATOR;
const run = Date.now().toString(36).slice(-6);

/** A second, independent Firebase client (another player / another device). */
function client(name: string) {
  const app = initializeApp(FIREBASE_CONFIG, name + run);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { auth, db };
}

async function denied(p: Promise<unknown>) {
  try {
    await p;
    return false;
  } catch (e) {
    return String((e as { code?: string }).code || e).includes('permission-denied');
  }
}

describe.skipIf(!ON)('firebase backend (emulator)', () => {
  it('signs up with sequential UIDs, saves, loads and detects stale revisions', async () => {
    const be = await createFirebaseBackend();
    const a = await be.signUp(`al${run}`, 'secret1');
    expect(a.username).toBe(`al${run}`);
    expect(a.uid).toBeGreaterThanOrEqual(10000001);
    await be.signOut();
    const b = await be.signUp(`bo${run}`, 'secret2');
    expect(b.uid).toBe(a.uid + 1);
    await expect(be.signUp(`bo${run}`, 'other12')).rejects.toThrow('이미 사용 중인 아이디');

    expect(await be.pull()).toBeNull();
    const g = createNewGame('파이어');
    g.player.gold = 999;
    expect(await be.push(g, 0)).toEqual({ ok: true, rev: 1 });
    const stale = await be.push(g, 0);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.conflict?.rev).toBe(1);
    const cloud = await be.pull();
    expect(cloud?.rev).toBe(1);
    expect(cloud?.state.player.gold).toBe(999);

    await be.signOut();
    await expect(be.signIn(`bo${run}`, 'wrong!!')).rejects.toThrow('올바르지 않습니다');
    const again = await be.signIn(`bo${run}`, 'secret2');
    expect(again.uid).toBe(b.uid);
    await be.changePassword('secret2', 'secret3');
    await be.signOut();
    expect((await be.signIn(`bo${run}`, 'secret3')).uid).toBe(b.uid);
    expect((await be.init())?.uid).toBe(b.uid); // session restore
    await be.signOut();
  });

  it('Hangul IDs work with the published security rules', async () => {
    const be = await createFirebaseBackend();
    const name = '용사' + run.slice(-4).replace(/[^0-9a-z]/g, '');
    const a = await be.signUp(name, 'secret1');
    expect(a.username).toBe(name);
    expect(await be.push(createNewGame('한글'), 0)).toEqual({ ok: true, rev: 1 });
    await be.signOut();
    await expect(be.signUp(name, 'secret2')).rejects.toThrow('이미 사용 중인 아이디');
    const again = await be.signIn(name, 'secret1');
    expect(again.uid).toBe(a.uid);
    expect(again.username).toBe(name);
    expect((await be.pull())?.state.player.name).toBe('한글');
    await be.signOut();
  });

  it('security rules: saves are private and UIDs cannot be forged', async () => {
    const be = await createFirebaseBackend();
    const owner = await be.signUp(`ow${run}`, 'secret1');
    await be.push(createNewGame('주인'), 0);
    await be.signOut();

    const other = client('other');
    await createUserWithEmailAndPassword(other.auth, emailOf(`ev${run}`), 'secret1');
    const me = other.auth.currentUser!.uid;
    // cannot read / write someone else's save or profile
    expect(await denied(getDoc(doc(other.db, 'saves', owner.authId)))).toBe(true);
    expect(await denied(setDoc(doc(other.db, 'saves', owner.authId), { rev: 99, data: 'x' }))).toBe(true);
    expect(await denied(getDoc(doc(other.db, 'users', owner.authId)))).toBe(true);
    // cannot pick an arbitrary UID or skip the counter
    expect(await denied(setDoc(doc(other.db, 'users', me), { uid: 7, username: `ev${run}`, createdAt: 1 }))).toBe(true);
    expect(
      await denied(
        runTransaction(other.db, async (tx) => {
          const c = await tx.get(doc(other.db, 'meta', 'counter'));
          const next = (c.data() as { next: number }).next;
          tx.set(doc(other.db, 'meta', 'counter'), { next: next + 2 });
          tx.set(doc(other.db, 'users', me), { uid: next + 1, username: `ev${run}`, createdAt: 1 });
        }),
      ),
    ).toBe(true);
    // a save must move forward one revision at a time
    await setDoc(doc(other.db, 'saves', me), { rev: 1, savedAt: 1, data: 'abc' });
    expect(await denied(setDoc(doc(other.db, 'saves', me), { rev: 5, savedAt: 2, data: 'abc' }))).toBe(true);
    // the owner can still sign in and read their own save
    const again = client('owner');
    await signInWithEmailAndPassword(again.auth, emailOf(`ow${run}`), 'secret1');
    expect((await getDoc(doc(again.db, 'saves', owner.authId))).exists()).toBe(true);
  });
});
