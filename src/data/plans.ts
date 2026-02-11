// ============================================================
// RustyPilot Refresh — Study Plan Data Access
//
// All reads and writes for generated study plans go through here.
// Pages never call Firestore directly for plan data.
//
// Plans live at: /studyPlans/{uid}/{planId}
//
// The stored document always includes an `id` field equal to
// the Firestore document ID so callers never need to reconstruct
// it from the path.
// ============================================================

import { StudyPlan } from "@/types/domain";
import { studyPlan, studyPlans } from "@/types/firestorePaths";
import { addDocData, getDocData, setDocData, queryCollection } from "@/lib/firestore";

// ------------------------------------------------------------
// createStudyPlan
// ------------------------------------------------------------

/**
 * Writes a new study plan to Firestore and returns the
 * auto-generated Firestore document ID.
 *
 * The plan is stored with its `id` field populated so future
 * reads are self-describing without needing the document path.
 *
 * @example
 *   const planId = await createStudyPlan(uid, generatedPlan);
 *   router.push(plan(planId));
 */
export async function createStudyPlan(
  uid: string,
  plan: Omit<StudyPlan, "id">
): Promise<string> {
  if (!uid) throw new Error("[plans] createStudyPlan: uid must not be empty.");

  // Stamp uid onto the plan in case planGenerator returned uid: ""
  const planWithUid = { ...plan, uid };

  // Step 1: Add the document and get the Firestore-assigned ID
  const planId = await addDocData<Omit<StudyPlan, "id">>(
    studyPlans(uid),
    planWithUid
  );

  // Step 2: Write the id field back into the document so it is
  // self-contained when retrieved (avoids path reconstruction).
  await setDocData(studyPlan(uid, planId), { id: planId }, true);

  return planId;
}

// ------------------------------------------------------------
// getStudyPlan
// ------------------------------------------------------------

/**
 * Returns a single study plan by ID, or null if not found.
 *
 * The returned object always includes the `id` field — either
 * from the stored document or hydrated from the path if missing.
 *
 * @example
 *   const p = await getStudyPlan(uid, planId);
 *   if (!p) { /* plan not found or wrong uid *\/ }
 */
export async function getStudyPlan(
  uid: string,
  planId: string
): Promise<StudyPlan | null> {
  if (!uid)    throw new Error("[plans] getStudyPlan: uid must not be empty.");
  if (!planId) throw new Error("[plans] getStudyPlan: planId must not be empty.");

  const result = await getDocData<StudyPlan>(studyPlan(uid, planId));
  if (!result) return null;

  // Ensure id field is present even on legacy documents written without it
  return result.id ? result : { ...result, id: planId };
}

// ------------------------------------------------------------
// listStudyPlans
// ------------------------------------------------------------

/**
 * Returns the most recent study plans for a user, ordered newest first.
 *
 * @param uid   The user's Firebase uid.
 * @param limit Maximum number of plans to return (default: 10, max: 50).
 *
 * @example
 *   const plans = await listStudyPlans(uid, 5);
 */
export async function listStudyPlans(
  uid: string,
  limit = 10
): Promise<StudyPlan[]> {
  if (!uid) throw new Error("[plans] listStudyPlans: uid must not be empty.");

  const resolvedLimit = Math.min(Math.max(1, limit), 50);

  const results = await queryCollection<StudyPlan>(studyPlans(uid), {
    orderBy: { field: "createdAt", direction: "desc" },
    limit: resolvedLimit,
  });

  // Hydrate id field on any documents that predate the two-step write pattern.
  // queryCollection already injects { id: d.id } via the spread in firestore.ts,
  // so this is a no-op for all documents created by createStudyPlan above —
  // but it acts as a safety net for manually created or migrated documents.
  return results.map((p) => (p.id ? p : { ...p, id: (p as StudyPlan & { id: string }).id }));
}