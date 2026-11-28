// ─────────────────────────────────────────────────────────────
// Firebase web app settings (Firebase console → Project settings →
// "Your apps" → Web app → SDK setup → Config).
// These values are public by design (they ship to every browser);
// access is protected by Firebase Authentication + firestore.rules.
// Environment variables VITE_FIREBASE_* override this file.
// Leave apiKey empty to run the game without online accounts.
// ─────────────────────────────────────────────────────────────
export const FIREBASE_CONFIG_FILE = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
