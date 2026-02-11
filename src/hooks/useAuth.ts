// ============================================================
// RustyPilot Refresh — useAuth Hook
//
// Subscribes to Firebase Auth state and exposes the current
// user, a loading flag, and any error message.
//
// This hook never throws — all errors are surfaced via the
// returned error string so components can render gracefully.
//
// Usage:
//   const { user, loading, error } = useAuth();
//   if (loading) return <LoadingState />;
//   if (error) return <ErrorMessage message={error} />;
//   if (!user) return <Redirect to={ROUTES.login} />;
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ------------------------------------------------------------
// Return type
// ------------------------------------------------------------

export interface UseAuthResult {
  /** The currently signed-in Firebase user, or null if signed out */
  user: User | null;
  /** True while the initial auth state is being resolved */
  loading: boolean;
  /** Human-readable error message, or null if no error occurred */
  error: string | null;
}

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

/**
 * Subscribes to Firebase Auth state changes and returns the
 * current user, a loading flag, and any error that occurred
 * during the subscription setup.
 *
 * - loading is true on mount until the first auth event fires.
 * - Cleans up the Firebase listener automatically on unmount.
 * - Never throws; errors are returned as a string.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        },
        (firebaseError) => {
          // onAuthStateChanged error callback — rare but possible
          // (e.g. network failure during token refresh)
          setError(
            `[useAuth] Auth state error: ${firebaseError.message}`
          );
          setLoading(false);
        }
      );
    } catch (err) {
      // Synchronous error during subscription setup (e.g. bad auth config)
      setError(
        `[useAuth] Failed to subscribe to auth state: ${(err as Error).message}`
      );
      setLoading(false);
    }

    return () => {
      unsubscribe?.();
    };
  }, []); // Empty deps — subscribe once on mount, clean up on unmount

  return { user, loading, error };
}