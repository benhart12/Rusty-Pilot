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
// Firebase config
// ------------------------------------------------------------

// Next.js only inlines NEXT_PUBLIC_ vars with static dot notation —
// bracket notation (process.env[name]) is not replaced in the browser bundle.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "",
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