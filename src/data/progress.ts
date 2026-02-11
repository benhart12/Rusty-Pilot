// ============================================================
// RustyPilot Refresh — Progress & Attempts Data Access
//
// All reads and writes for module progress and drill attempt
// records go through here. Pages never call Firestore directly
// for progress data.
//
// Progress records live at:
//   /userProgress/{uid}/modules/{moduleId}
//
// Attempt records live at:
//   /users/{uid}/attempts/{attemptId}
// ============================================================

import { UserModuleProgress, AttemptRecord } from "@/types/domain";
import { userProgressModule, userAttempts } from "@/types/firestorePaths";
import { getDocData, setDocData, addDocData, queryCollection } from "@/lib/firestore";

// ------------------------------------------------------------
// getUserModuleProgress
// ------------------------------------------------------------

/**
 * Returns the progress record for a single module, or null if
 * the user has never touched it.
 *
 * @example
 *   const progress = await getUserModuleProgress(uid, "sys-fuel-001");
 *   if (!progress) {
 *     // module is untouched — mastery is 0
 *   }
 */
export async function getUserModuleProgress(
  uid: string,
  moduleId: string
): Promise<UserModuleProgress | null> {
  if (!uid)      throw new Error("[progress] getUserModuleProgress: uid must not be empty.");
  if (!moduleId) throw new Error("[progress] getUserModuleProgress: moduleId must not be empty.");

  return getDocData<UserModuleProgress>(userProgressModule(uid, moduleId));
}

// ------------------------------------------------------------
// setUserModuleProgress
// ------------------------------------------------------------

/**
 * Merges a partial update into the user's progress record for a module.
 * Creates the document if it does not yet exist.
 *
 * Always merges — fields not included in `data` are preserved.
 * Callers should include `lastTouchedAt` with the current ISO timestamp.
 *
 * @example
 *   await setUserModuleProgress(uid, "sys-fuel-001", {
 *     lastTouchedAt: new Date().toISOString(),
 *     lastScore: 85,
 *     mastery: 72,
 *     attemptCount: 3,
 *   });
 */
export async function setUserModuleProgress(
  uid: string,
  moduleId: string,
  data: Partial<UserModuleProgress>
): Promise<void> {
  if (!uid)      throw new Error("[progress] setUserModuleProgress: uid must not be empty.");
  if (!moduleId) throw new Error("[progress] setUserModuleProgress: moduleId must not be empty.");
  if (Object.keys(data).length === 0) return; // nothing to write

  // Always stamp moduleId into the document so the field is present
  // even on the first write (when creating from a partial).
  const payload: Partial<UserModuleProgress> = {
    moduleId,
    ...data,
  };

  await setDocData(
    userProgressModule(uid, moduleId),
    payload as Record<string, unknown>,
    true // merge — never overwrite fields not present in payload
  );
}

// ------------------------------------------------------------
// recordAttempt
// ------------------------------------------------------------

/**
 * Writes a completed drill attempt to Firestore and returns
 * the auto-generated Firestore document ID.
 *
 * The `attempt.id` field is intentionally ignored during the write —
 * Firestore assigns the canonical ID. The returned ID should be
 * stored back on the AttemptRecord by the caller if persistence is needed.
 *
 * @example
 *   const attemptId = await recordAttempt(uid, {
 *     id: "",           // ignored — Firestore assigns this
 *     uid,
 *     createdAt: new Date().toISOString(),
 *     moduleIds: ["sys-fuel-001"],
 *     score: 80,
 *     answers: [...],
 *     durationSeconds: 245,
 *   });
 */
export async function recordAttempt(
  uid: string,
  attempt: AttemptRecord
): Promise<string> {
  if (!uid) throw new Error("[progress] recordAttempt: uid must not be empty.");
  if (!attempt.moduleIds?.length) {
    throw new Error("[progress] recordAttempt: attempt must reference at least one moduleId.");
  }

  // Strip the client-side id field before writing — Firestore will assign one.
  // We spread and omit `id` so the stored document doesn't have an empty string field.
  const { id: _ignored, ...attemptData } = attempt;

  // Ensure uid is stamped on the stored record
  const payload = { ...attemptData, uid };

  return addDocData<Omit<AttemptRecord, "id">>(userAttempts(uid), payload);
}

// ------------------------------------------------------------
// listRecentAttempts
// ------------------------------------------------------------

/**
 * Returns the most recent drill attempt records for a user,
 * ordered newest first.
 *
 * @param uid   The user's Firebase uid.
 * @param limit Maximum number of records to return (default: 10, max: 50).
 *
 * @example
 *   const recent = await listRecentAttempts(uid, 5);
 */
export async function listRecentAttempts(
  uid: string,
  limit = 10
): Promise<AttemptRecord[]> {
  if (!uid) throw new Error("[progress] listRecentAttempts: uid must not be empty.");

  const resolvedLimit = Math.min(Math.max(1, limit), 50);

  return queryCollection<AttemptRecord>(userAttempts(uid), {
    orderBy: { field: "createdAt", direction: "desc" },
    limit: resolvedLimit,
  });
}