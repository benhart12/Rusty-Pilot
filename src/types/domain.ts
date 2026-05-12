// ============================================================
// RustyPilot Refresh — Domain Types
// All timestamps are stored as ISO 8601 strings (e.g. "2024-06-01T12:00:00.000Z")
// for Firestore compatibility and human readability.
// ============================================================

// ------------------------------------------------------------
// Aircraft
// ------------------------------------------------------------

/** Top-level aircraft family (e.g. "Cessna 172", "Piper PA-28") */
export interface AircraftFamily {
    id: string;
    name: string;                  // e.g. "Cessna 172 Skyhawk"
    manufacturer: string;          // e.g. "Cessna"
    description: string;
    imageUrl?: string;
    variantIds: string[];          // IDs of AircraftVariant records belonging to this family
  }
  
  /** A specific variant within a family (e.g. "C172N", "C172SP G1000") */
  export interface AircraftVariant {
    id: string;
    familyId: string;
    name: string;                  // e.g. "172SP (G1000)"
    year?: number;                 // Representative model year
    avionicsType: "steam" | "glass" | "mixed";
    notes?: string;                // Notable differences from base variant
    moduleTagOverrides?: string[]; // Tags that are especially relevant to this variant
  }
  
  // ------------------------------------------------------------
  // Content Modules
  // ------------------------------------------------------------
  
  export type ModuleType = "system" | "procedure" | "airportOps" | "emergency";
  
  /** A single quick-check question inside a module (plain text Q&A) */
  export interface QuickCheck {
    question: string;
    answer: string;
  }
  
  // --- Drill Prompt union ---
  
  export interface FlashcardPrompt {
    kind: "flashcard";
    front: string;
    back: string;
  }
  
  export interface FlowStepPrompt {
    kind: "flowStep";
    step: string;         // The checklist / procedural step
    callout?: string;     // Optional "why it matters" annotation
  }
  
  export interface McqPrompt {
    kind: "mcq";
    question: string;
    choices: string[];    // 2–5 choices
    answerIndex: number;  // 0-based index into choices[]
    explanation: string;  // Shown after answer is revealed
  }
  
  export interface BranchPrompt {
    kind: "branch";
    situation: string;
    options: string[];    // 2–4 courses of action
    bestIndex: number;    // 0-based index into options[]
    rationale: string;    // Why the best option is correct
  }
  
  export type DrillPrompt =
    | FlashcardPrompt
    | FlowStepPrompt
    | McqPrompt
    | BranchPrompt;
  
  /** A learning module — the atomic unit of content in the app */
  export interface ContentModule {
    id: string;
    title: string;
    type: ModuleType;
  
    /** Searchable / filterable tags (e.g. ["engine", "startup", "C172"]) */
    tags: string[];
  
    /** 1–3 sentence plain-language summary shown on the module tile */
    overview: string;
  
    /** Short Q&A checks shown before drilling begins */
    quickCheck: QuickCheck[];
  
    /** Estimated review time in minutes */
    estMinutes: number;
  
    /** Firebase Storage URLs for diagrams, checklists, etc. */
    diagramUrls: string[];
  
    /** Ordered drill prompts for the interactive session */
    drillPrompts: DrillPrompt[];
  }
  
  // ------------------------------------------------------------
  // User
  // ------------------------------------------------------------
  
  /** Pilot certification / rating flags */
  export interface PilotRatings {
    ppl: boolean;            // Private Pilot
    ir: boolean;             // Instrument Rating
    cpl: boolean;            // Commercial Pilot
    cfi: boolean;            // CFI
    atp: boolean;            // ATP
    seaplane: boolean;
    multiEngine: boolean;
    tailwheel: boolean;
  }
  
  /** Goals are free-form strings the pilot sets during onboarding */
  export type PilotGoal =
    | "BFR prep"
    | "IPC prep"
    | "checkride prep"
    | "rust removal"
    | "night currency"
    | "cross-country planning"
    | string;                // Allow arbitrary custom goals
  
  export interface UserProfile {
    uid: string;
    email: string;
  
    /** ISO 8601 — when the account was created */
    createdAt: string;
  
    /** Pilot's display name (optional, set during onboarding) */
    displayName?: string;
  
    /** Certification / rating flags */
    ratings: PilotRatings;
  
    /** Total logged flight hours (self-reported) */
    totalHours: number;
  
    /** ISO 8601 date of most recent flight (self-reported, e.g. "2024-05-20") */
    lastFlightDate: string | null;
  
    /** The aircraft variant the pilot primarily flies */
    defaultAircraftVariantId: string | null;
  
    /** Goals selected or typed during onboarding */
    goals: PilotGoal[];
  
    /** True after the pilot completes the onboarding flow */
    onboarded: boolean;
  
    /** Elevated access flag — reserved for content editors */
    isAdmin?: boolean;
  }
  
  // ------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------
  
  /**
   * Mastery is an integer in the range [0, 100].
   * 0  = never attempted
   * 1–39  = needs work
   * 40–69 = developing
   * 70–89 = proficient
   * 90–100 = mastered
   */
  export type MasteryScore = number;
  
  /** Per-module progress record stored under /userProgress/{uid}/modules/{moduleId} */
  export interface UserModuleProgress {
    moduleId: string;
  
    /** ISO 8601 — most recent interaction */
    lastTouchedAt: string;
  
    /** Raw score from the most recent drill attempt (0–100) */
    lastScore: number;
  
    /** Calculated mastery level (0–100) — updated by scoring.ts */
    mastery: MasteryScore;
  
    /** Total number of drill attempts completed for this module */
    attemptCount: number;
  }
  
  // ------------------------------------------------------------
  // Study Plans
  // ------------------------------------------------------------
  
  /** The scenario inputs the pilot provided when generating the plan */
  export interface PlanInputs {
    aircraftVariantId: string;
    daysSinceLastFlight: number;
    totalHours: number;
    selectedGoals: PilotGoal[];
    /** Module or category tags the pilot explicitly asked to focus on */
    focusTags: string[];
    /** Rough time budget in minutes the pilot has for studying */
    availableMinutes: number;
    /** Where the pilot will be operating */
    airportType?: "towered" | "nonTowered";
    /** Airspace class (optional) */
    airspace?: "B" | "C" | "D" | "E" | "G";
  }
  
  /** A single item within a plan section — references either a module or a tag group */
  export type PlanItem =
    | { kind: "module"; moduleId: string }
    | { kind: "tagGroup"; tag: string; label: string };
  
  /** A logical section within a study plan (e.g. "Emergency Procedures", "Systems Review") */
  export interface PlanSection {
    title: string;
    description?: string;
    items: PlanItem[];
  }
  
  /** A generated study plan saved to Firestore */
  export interface StudyPlan {
    id: string;
    uid: string;
  
    /** ISO 8601 — when the plan was generated */
    createdAt: string;
  
    /** The inputs used to generate this plan */
    inputs: PlanInputs;
  
    /** Ordered sections of the plan */
    sections: PlanSection[];
  
    /** Optional user-supplied title (defaults to auto-generated name) */
    title?: string;
  
    /** Estimated total study time across all sections in minutes */
    estTotalMinutes: number;
  }
  
  // ------------------------------------------------------------
  // Attempt Records
  // ------------------------------------------------------------
  
  /** The user's answer to a single drill prompt */
  export interface PromptAnswer {
    /** Index of the DrillPrompt within the module's drillPrompts array */
    promptIndex: number;
  
    /** For MCQ/branch: the option index selected; for flashcard/flowStep: omit or -1 */
    selectedIndex?: number;
  
    /** Did the user self-report or the system grade as correct? */
    correct: boolean;
  }
  
  /** One completed drill session — stored under /users/{uid}/attempts/{attemptId} */
  export interface AttemptRecord {
    id: string;
    uid: string;
  
    /** ISO 8601 — when the session was completed */
    createdAt: string;
  
    /** All modules included in this session */
    moduleIds: string[];
  
    /**
     * Overall session score 0–100.
     * Calculated as (correct answers / total prompts) * 100.
     */
    score: number;
  
    /** Per-prompt answer data */
    answers: PromptAnswer[];
  
    /** Duration of the session in seconds */
    durationSeconds: number;
  }