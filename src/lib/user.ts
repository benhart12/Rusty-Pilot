// ============================================================
// RustyPilot Refresh — User Profile Management
//
// All reads and writes for /users/{uid} go through this file.
// UI code should never call Firestore directly for user data.
//
// Functions:
//   getUserProfile   — fetch profile or null
//   ensureUserProfile — fetch or create on first login
//   updateUserProfile — partial merge update
//   isOnboarded      — pure check, no I/O
// ============================================================

import { UserProfile, PilotRatings } from "@/types/domain";
import { userDoc } from "@/types/firestorePaths";
import { getDocData, setDocData } from "@/lib/firestore";

// ------------------------------------------------------------
// Default values
// ------------------------------------------------------------

/** Ratings object with all flags set to false — used for new profiles */
const DEFAULT_RATINGS: PilotRatings = {
  ppl: false,
  ir: false,
  cpl: false,
  cfi: false,
  atp: false,
  seaplane: false,
  multiEngine: false,
  tailwheel: false,
};

// ------------------------------------------------------------
// getUserProfile
// ------------------------------------------------------------

/**
 * Fetches the user's profile document from Firestore.
 * Returns null if the document does not yet exist (new user).
 *
 * @example
 *   const profile = await getUserProfile(uid);
 *   if (!profile) { /* first-time user *\/ }
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) throw new Error("[user] getUserProfile: uid must not be empty.");

  return getDocData<UserProfile>(userDoc(uid));
}

// ------------------------------------------------------------
// ensureUserProfile
// ------------------------------------------------------------

/**
 * Returns the existing profile if one exists, otherwise creates
 * a minimal profile document and returns it.
 *
 * Safe to call on every login — idempotent on subsequent calls.
 *
 * @example
 *   const profile = await ensureUserProfile(uid, "pilot@example.com");
 */
export async function ensureUserProfile(
  uid: string,
  email: string
): Promise<UserProfile> {
  if (!uid) throw new Error("[user] ensureUserProfile: uid must not be empty.");
  if (!email) throw new Error("[user] ensureUserProfile: email must not be empty.");

  const existing = await getUserProfile(uid);
  if (existing) return existing;

  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    uid,
    email,
    createdAt: now,
    ratings: DEFAULT_RATINGS,
    totalHours: 0,
    lastFlightDate: null,
    defaultAircraftVariantId: null,
    goals: [],
    onboarded: false,
  };

  await setDocData<UserProfile>(userDoc(uid), newProfile);
  return newProfile;
}

// ------------------------------------------------------------
// updateUserProfile
// ------------------------------------------------------------

/**
 * Merges a partial update into the user's existing profile document.
 * Fields not included in the partial are left unchanged.
 *
 * @example
 *   await updateUserProfile(uid, {
 *     displayName: "Alex",
 *     totalHours: 120,
 *     onboarded: true,
 *   });
 */
export async function updateUserProfile(
  uid: string,
  partial: Partial<UserProfile>
): Promise<void> {
  if (!uid) throw new Error("[user] updateUserProfile: uid must not be empty.");
  if (Object.keys(partial).length === 0) return; // nothing to write

  // Cast is safe because setDocData uses merge:true —
  // only the supplied fields are written.
  await setDocData(userDoc(uid), partial as Record<string, unknown>, true);
}

// ------------------------------------------------------------
// isOnboarded
// ------------------------------------------------------------

/**
 * Pure function — no I/O.
 * Returns true when the pilot has completed onboarding:
 *   - has selected a default aircraft variant
 *   - has provided their last flight date
 *   - the onboarded flag is set
 *
 * Any one of these being absent means the onboarding flow
 * should still be shown.
 *
 * @example
 *   if (!isOnboarded(profile)) router.push(ROUTES.onboarding);
 */
export function isOnboarded(profile: UserProfile): boolean {
  return (
    profile.onboarded === true &&
    profile.defaultAircraftVariantId !== null &&
    profile.defaultAircraftVariantId.trim() !== "" &&
    profile.lastFlightDate !== null &&
    profile.lastFlightDate.trim() !== ""
  );
}