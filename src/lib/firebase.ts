// ============================================================
// RustyPilot Refresh — Firebase Initialization
//
// Initializes the Firebase app exactly once (safe for Next.js
// hot-reload and SSR module re-evaluation).
//
// Required environment variables (.env.local):
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//   NEXT_PUBLIC_FIREBASE_APP_ID
// ============================================================

import { getApps, getApp, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ------------------------------------------------------------
// Environment variable guard
// ------------------------------------------------------------

/**
 * Asserts that a NEXT_PUBLIC_ environment variable is present and non-empty.
 * Throws a descriptive error at startup rather than producing silent undefined
 * values that surface as cryptic Firebase errors later.
 */
function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[firebase.ts] Missing required environment variable: ${name}\n` +
        `Add it to your .env.local file and restart the dev server.`
    );
  }
  return value;
}

// ------------------------------------------------------------
// Firebase config
// ------------------------------------------------------------

const firebaseConfig = {
  apiKey:            assertEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain:        assertEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId:         assertEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket:     assertEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: assertEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             assertEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

// ------------------------------------------------------------
// Safe initialization — prevents double-init in Next.js
// ------------------------------------------------------------

/**
 * Returns the existing Firebase app if already initialized,
 * otherwise creates a new one. This is the correct pattern for
 * Next.js where modules can be evaluated more than once during
 * hot-reload or across server/client boundaries.
 */
const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ------------------------------------------------------------
// Service instances
// ------------------------------------------------------------

/** Firebase Authentication — email/password */
const auth: Auth = getAuth(app);

/** Cloud Firestore — primary data store */
const db: Firestore = getFirestore(app);

/** Firebase Storage — diagrams and media uploads */
const storage: FirebaseStorage = getStorage(app);

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

export { app, auth, db, storage };