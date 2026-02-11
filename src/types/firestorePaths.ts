// ============================================================
// RustyPilot Refresh — Firestore Path Builders
//
// All Firestore document and collection paths are constructed
// here and nowhere else. Import from this file instead of
// writing path strings inline to prevent typos and keep the
// schema in one place.
//
// Firestore layout:
//
//   /users/{uid}
//   /users/{uid}/assessments/{assessmentId}
//   /users/{uid}/attempts/{attemptId}
//   /userProgress/{uid}/modules/{moduleId}
//   /studyPlans/{uid}/{planId}
//   /modules/{moduleId}
//   /aircraftFamilies/{familyId}
//   /aircraftVariants/{variantId}
// ============================================================

// ------------------------------------------------------------
// User
// ------------------------------------------------------------

/** /users/{uid} — the user's profile document */
export function userDoc(uid: string): string {
    return `users/${uid}`;
  }
  
  /** /users/{uid}/assessments — collection of rust/readiness assessment records */
  export function userAssessments(uid: string): string {
    return `users/${uid}/assessments`;
  }
  
  /** /users/{uid}/attempts — collection of drill attempt records */
  export function userAttempts(uid: string): string {
    return `users/${uid}/attempts`;
  }
  
  // ------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------
  
  /** /userProgress/{uid}/modules/{moduleId} — a single module progress record */
  export function userProgressModule(uid: string, moduleId: string): string {
    return `userProgress/${uid}/modules/${moduleId}`;
  }
  
  // ------------------------------------------------------------
  // Study Plans
  // ------------------------------------------------------------
  
  /** /studyPlans/{uid} — collection of all study plans belonging to a user */
  export function studyPlans(uid: string): string {
    return `studyPlans/${uid}`;
  }
  
  /** /studyPlans/{uid}/{planId} — a single generated study plan document */
  export function studyPlan(uid: string, planId: string): string {
    return `studyPlans/${uid}/${planId}`;
  }
  
  // ------------------------------------------------------------
  // Content
  // ------------------------------------------------------------
  
  /** /modules — top-level collection of all learning module documents */
  export function modulesCollection(): string {
    return `modules`;
  }
  
  /** /modules/{moduleId} — a single learning module document */
  export function moduleDoc(moduleId: string): string {
    return `modules/${moduleId}`;
  }
  
  // ------------------------------------------------------------
  // Aircraft
  // ------------------------------------------------------------
  
  /** /aircraftFamilies — top-level collection of aircraft family documents */
  export function aircraftFamiliesCollection(): string {
    return `aircraftFamilies`;
  }
  
  /** /aircraftVariants — top-level collection of aircraft variant documents */
  export function aircraftVariantsCollection(): string {
    return `aircraftVariants`;
  }