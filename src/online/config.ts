import { FIREBASE_CONFIG_FILE } from './firebaseConfig';

const env = import.meta.env;

/** Firebase web config: env vars (VITE_FIREBASE_*) win over firebaseConfig.ts. */
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || FIREBASE_CONFIG_FILE.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_CONFIG_FILE.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || FIREBASE_CONFIG_FILE.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || FIREBASE_CONFIG_FILE.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_CONFIG_FILE.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || FIREBASE_CONFIG_FILE.appId,
};

/** "host:port" of the local Firebase emulators (development / tests only). */
export const EMULATOR_HOST: string = env.VITE_FIREBASE_EMULATOR || '';

export function onlineConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}
