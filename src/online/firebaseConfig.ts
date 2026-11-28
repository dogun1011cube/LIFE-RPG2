// ─────────────────────────────────────────────────────────────
// Firebase web app settings (Firebase console → Project settings →
// "Your apps" → Web app → SDK setup → Config).
// These values are public by design (they ship to every browser);
// access is protected by Firebase Authentication + firestore.rules.
// Environment variables VITE_FIREBASE_* override this file.
// Leave apiKey empty to run the game without online accounts.
// ─────────────────────────────────────────────────────────────
export const FIREBASE_CONFIG_FILE = {
  apiKey: 'AIzaSyDjGD69mfMSpRHsuD0HOsuRlLHFpsnLrgU',
  authDomain: 'life-rpg-cd12d.firebaseapp.com',
  projectId: 'life-rpg-cd12d',
  storageBucket: 'life-rpg-cd12d.firebasestorage.app',
  messagingSenderId: '1087200069804',
  appId: '1:1087200069804:web:fa4037818ecb37f34df709',
};
