// ============================================================
// RustyPilot Refresh — useRequireAuth Hook
//
// Guards protected pages by redirecting unauthenticated users
// to /login. Use this in any page or layout that requires
// the pilot to be signed in.
//
// Usage:
//   const { user, loading } = useRequireAuth();
//   if (loading) return <LoadingState />;
//   if (!user) return null; // redirect is in-flight
//   return <ProtectedContent />;
// ============================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

// ------------------------------------------------------------
// Return type
// ------------------------------------------------------------

export interface UseRequireAuthResult {
  /** The currently signed-in Firebase user, or null if not yet resolved */
  user: User | null;
  /** True while Firebase is resolving the initial auth state */
  loading: boolean;
}

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

/**
 * Requires the user to be authenticated. Redirects to /login
 * if auth has resolved and no user is present.
 *
 * - While loading, neither redirect nor render happens — callers
 *   should show a loading indicator.
 * - After redirect is triggered the hook returns { user: null, loading: false };
 *   callers should render null to avoid flashing protected UI.
 *
 * @example
 *   export default function DashboardPage() {
 *     const { user, loading } = useRequireAuth();
 *     if (loading) return <LoadingState />;
 *     if (!user) return null;
 *     return <Dashboard />;
 *   }
 */
export function useRequireAuth(): UseRequireAuthResult {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth state is resolved
    if (!loading && user === null) {
      router.replace(ROUTES.login);
    }
  }, [user, loading, router]);

  return { user, loading };
}