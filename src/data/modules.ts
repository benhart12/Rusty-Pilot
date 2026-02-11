// ============================================================
// RustyPilot Refresh — Module Data Access
//
// All reads and writes for learning modules go through here.
// Pages never call Firestore directly for module data.
//
// If Firestore returns empty (common in local dev before seeding),
// a minimal hardcoded fallback is used so the app remains functional.
// See DEV_ONLY_FALLBACK section below.
// ============================================================

import { ContentModule, ModuleType } from "@/types/domain";
import { modulesCollection, moduleDoc } from "@/types/firestorePaths";
import { getDocData, setDocData, queryCollection } from "@/lib/firestore";

// ------------------------------------------------------------
// DEV_ONLY_FALLBACK — remove or gate behind env flag in production
// ------------------------------------------------------------
// These records exist so developers can run the full app flow
// without seeding Firestore first. Each covers a different
// ModuleType so all UI branches are exercisable immediately.
// ------------------------------------------------------------

const DEV_ONLY_FALLBACK_MODULES: ContentModule[] = [
  // ----------------------------------------------------------
  // 1. System — Fuel System
  // ----------------------------------------------------------
  {
    id: "sys-fuel-001",
    title: "Fuel System Overview",
    type: "system",
    tags: ["fuel", "aircraft-systems", "preflight"],
    overview:
      "Understand how fuel moves from tanks to engine, identify selector positions, and recognize contamination signs before every flight.",
    quickCheck: [
      {
        question: "What does BOTH mean on the fuel selector?",
        answer:
          "Both tanks are feeding simultaneously; used for all normal operations in the C172.",
      },
      {
        question: "Where should you sample fuel during preflight?",
        answer:
          "Each tank sump, the fuel strainer (gascolator), and the fuel caps after refueling.",
      },
    ],
    estMinutes: 10,
    diagramUrls: [],
    drillPrompts: [
      {
        kind: "flashcard",
        front: "What color is 100LL aviation fuel?",
        back: "Blue. 100LL (low lead) is dyed blue to distinguish it from other grades.",
      },
      {
        kind: "mcq",
        question: "What is the correct fuel selector position for takeoff in a C172?",
        choices: ["LEFT", "RIGHT", "BOTH", "OFF"],
        answerIndex: 2,
        explanation:
          "BOTH ensures balanced fuel draw and maximum available fuel flow during the critical takeoff and climb phase.",
      },
      {
        kind: "branch",
        situation:
          "On short final you notice the fuel selector is on LEFT and the gauge shows that tank nearly empty.",
        options: [
          "Continue the approach — you're almost on the ground",
          "Switch to BOTH immediately and continue",
          "Switch to RIGHT and execute a go-around",
          "Declare emergency and land straight ahead",
        ],
        bestIndex: 1,
        rationale:
          "Switch to BOTH immediately. You still have time to restore fuel flow before touchdown. A go-around on an almost-empty tank risks engine roughness; BOTH gives you both tanks.",
      },
    ],
  },

  // ----------------------------------------------------------
  // 2. Procedure — Engine Failure After Takeoff (EFATO)
  // ----------------------------------------------------------
  {
    id: "proc-efato-001",
    title: "Engine Failure After Takeoff (EFATO)",
    type: "procedure",
    tags: ["engine-failure", "emergency-landing", "normal-ops", "forced-landing"],
    overview:
      "The most time-critical emergency in single-engine flying. Know the memory items cold — pitch for best glide immediately, land ahead.",
    quickCheck: [
      {
        question: "What is the single most important action on EFATO?",
        answer:
          "Pitch for best glide speed immediately. Maintain control first — aviate before troubleshoot.",
      },
      {
        question: "Why should you generally not attempt to return to the runway below 1,000 ft AGL?",
        answer:
          "Insufficient altitude to complete the turn without exceeding bank angle limits, risking an accelerated stall at low altitude.",
      },
    ],
    estMinutes: 12,
    diagramUrls: [],
    drillPrompts: [
      {
        kind: "flowStep",
        step: "1. Pitch — Best Glide Speed (65 KIAS C172)",
        callout: "This is the only action that buys you time. Do it first, always.",
      },
      {
        kind: "flowStep",
        step: "2. Fuel Selector — BOTH",
        callout: "May restore flow if selector was on a depleted tank.",
      },
      {
        kind: "flowStep",
        step: "3. Mixture — RICH",
        callout: "Ensures full fuel if an accidental leaning caused the failure.",
      },
      {
        kind: "flowStep",
        step: "4. Carb Heat — ON (if equipped)",
        callout: "Clears carburetor ice — a common cause of power loss.",
      },
      {
        kind: "flowStep",
        step: "5. Ignition — BOTH (check, then try START if windmilling)",
        callout: "Confirm ignition is on. Attempt restart only if time allows.",
      },
      {
        kind: "flowStep",
        step: "6. Land Ahead — Choose Field, Squawk 7700",
        callout:
          "If engine does not restart, commit to landing straight ahead or slight turn. Do not attempt return below 1,000 ft AGL.",
      },
      {
        kind: "mcq",
        question: "Best glide speed for a C172N is approximately:",
        choices: ["55 KIAS", "65 KIAS", "75 KIAS", "80 KIAS"],
        answerIndex: 1,
        explanation:
          "65 KIAS gives maximum glide ratio. At this speed a C172 glides roughly 1.5 nautical miles per 1,000 ft of altitude.",
      },
    ],
  },

  // ----------------------------------------------------------
  // 3. Airport Ops — Towered Airport Communications
  // ----------------------------------------------------------
  {
    id: "airops-tower-001",
    title: "Towered Airport Radio Work",
    type: "airportOps",
    tags: ["towered", "radio", "atis", "clearance-delivery", "ground-ops", "class-d"],
    overview:
      "Radio confidence degrades fast. Review the standard call sequence from ATIS through takeoff so nothing catches you off-guard on the ground.",
    quickCheck: [
      {
        question: "What information does ATIS provide?",
        answer:
          "Current weather (ceiling, visibility, wind, altimeter), active runways, NOTAMs, and the phonetic letter identifier for that recording.",
      },
      {
        question:
          "What should you say in your initial call to ground after engine start at a Class D airport?",
        answer:
          'Station, aircraft type and tail number, location on field, destination or intentions, ATIS identifier. E.g., "Roanoke Ground, Cessna 1234A, West Ramp, VFR to Danville, information Kilo."',
      },
    ],
    estMinutes: 9,
    diagramUrls: [],
    drillPrompts: [
      {
        kind: "flashcard",
        front: "What is the Class D airspace radius and altitude?",
        back: "Typically 5 nm radius, from surface to 2,500 ft AGL. Requires two-way radio contact before entry.",
      },
      {
        kind: "branch",
        situation:
          'Tower clears you: "Cessna 1234A, runway 6, fly runway heading, cleared for takeoff." You read back the clearance and are rolling. At 500 ft AGL the tower says "Cessna 1234A, turn right heading 120."',
        options: [
          "Ignore it — you're too busy flying",
          "Acknowledge and comply: right turn to 120",
          "Ask tower to say again after you reach pattern altitude",
          "Declare pilot deviation and continue straight",
        ],
        bestIndex: 1,
        rationale:
          "ATC clearances must be acknowledged and followed unless unsafe. Read back the heading, turn to 120, and continue flying. Do not delay acknowledgment.",
      },
      {
        kind: "mcq",
        question: "ATIS phonetic identifiers cycle through the alphabet. When you copy a new ATIS recording, you should:",
        choices: [
          "Write down the identifier and report it on your initial call",
          "Say the full weather summary back to ground",
          "Only mention it if asked by ATC",
          "Copy it but there is no need to report it",
        ],
        answerIndex: 0,
        explanation:
          "Controllers use the ATIS identifier to confirm you have current weather. Always include it in your initial call: \"...information Kilo.\"",
      },
    ],
  },

  // ----------------------------------------------------------
  // 4. Emergency — Electrical Failure
  // ----------------------------------------------------------
  {
    id: "emrg-electrical-001",
    title: "Electrical System Failure",
    type: "emergency",
    tags: ["electrical-failure", "alternator", "battery", "aircraft-systems"],
    overview:
      "An alternator failure in a C172 is rarely an immediate emergency, but unrecognized it will drain the battery. Know the annunciator, the checklist, and when to land.",
    quickCheck: [
      {
        question: "How will you first notice an alternator failure in a C172SP (G1000)?",
        answer:
          "The MASTER CAUTION light illuminates and the ALT annunciator appears on the PFD. Ammeter will show discharge (negative value on older aircraft).",
      },
      {
        question: "With battery only (no alternator), how long can you expect to fly a C172 on electrical power alone?",
        answer:
          "Approximately 30 minutes with all normal loads active. Shed non-essential loads to extend this.",
      },
    ],
    estMinutes: 8,
    diagramUrls: [],
    drillPrompts: [
      {
        kind: "flowStep",
        step: "1. Identify — ALT caution light illuminated or ammeter showing discharge",
        callout: "Do not ignore — alternator failure is not immediately dangerous but leads to battery exhaustion.",
      },
      {
        kind: "flowStep",
        step: "2. ALT Master Switch — cycle OFF then ON (attempt reset)",
        callout: "A momentary spike can trip the overvoltage relay. Cycling may restore the alternator.",
      },
      {
        kind: "flowStep",
        step: "3. If alternator does not restore — Shed Non-Essential Electrical Loads",
        callout: "Pitot heat, cabin heat fan, interior lights off. Keep comm, nav, transponder, and PFD on.",
      },
      {
        kind: "flowStep",
        step: "4. Declare intentions — Land at nearest suitable airport",
        callout: "Advise ATC. Squawk 7600 if radios fail. You have roughly 30 minutes of battery.",
      },
      {
        kind: "mcq",
        question: "The alternator circuit breaker has popped and reset once already. It pops again immediately. You should:",
        choices: [
          "Reset it a second time — two resets are allowed",
          "Leave it popped and fly on battery only; land ASAP",
          "Pull the battery master and continue VFR",
          "Declare emergency and land immediately regardless of conditions",
        ],
        answerIndex: 1,
        explanation:
          "A circuit breaker that trips twice indicates a real fault in the circuit. Do not reset it again — leave it popped to prevent fire risk, manage battery load, and land at the nearest airport.",
      },
    ],
  },

  // ----------------------------------------------------------
  // 5. Procedure — Night Departure
  // ----------------------------------------------------------
  {
    id: "proc-night-001",
    title: "Night Departure Preparation",
    type: "procedure",
    tags: ["night-ops", "night-departure", "lighting", "preflight", "spatial-disorientation"],
    overview:
      "Night flying demands extra preflight attention to lighting, currency, and personal minimums. Brief yourself on the illusions and equipment before you taxi.",
    quickCheck: [
      {
        question: "What equipment must you check that you would not normally use during a day VFR preflight?",
        answer:
          "All aircraft lighting (position lights, beacon, landing/taxi lights, instrument and panel lighting), flashlight (with spare batteries), and confirm airport lighting is operational.",
      },
      {
        question: "What is the most common spatial disorientation illusion on departure?",
        answer:
          "The leans — a false sense of bank from a prolonged undetected turn, causing the pilot to feel wings-level when actually in a turn. Trust instruments.",
      },
    ],
    estMinutes: 10,
    diagramUrls: [],
    drillPrompts: [
      {
        kind: "flowStep",
        step: "1. Preflight — check all exterior lights (position, beacon, strobes, landing/taxi)",
        callout: "A burned-out position light makes you invisible to other traffic.",
      },
      {
        kind: "flowStep",
        step: "2. Cockpit — dim instruments to comfortable level before taxi",
        callout:
          "Bright panels destroy night vision. Allow 30 minutes of dark adaptation before departure.",
      },
      {
        kind: "flowStep",
        step: "3. Flashlight — within reach with fresh batteries",
        callout: "Primary cockpit lighting failure is rare; being unprepared for it is not acceptable.",
      },
      {
        kind: "flashcard",
        front: "How do you activate Pilot Controlled Lighting (PCL) on CTAF?",
        back: "Key the mic 7 times for high intensity, 5 times for medium, 3 times for low, within 5 seconds. Lights remain on for 15 minutes.",
      },
      {
        kind: "branch",
        situation:
          "On climbout at night you feel wings level but your attitude indicator shows a 20° right bank. There is no visible horizon.",
        options: [
          "Trust your body — the attitude indicator might be wrong",
          "Look out the window for ground lights to confirm",
          "Trust the attitude indicator — correct to wings level immediately",
          "Reduce power and slow down while you sort it out",
        ],
        bestIndex: 2,
        rationale:
          "Always trust calibrated instruments over body sensation at night. The vestibular system produces false inputs (the leans) in IMC or no-horizon conditions. Correct the bank immediately using the AI and cross-check with the turn coordinator.",
      },
    ],
  },
];

// ------------------------------------------------------------
// listModules
// ------------------------------------------------------------

export interface ListModulesParams {
  /** Filter by module type */
  type?: ModuleType;
  /** Filter by a single tag (array-contains query) */
  tag?: string;
  /** Maximum number of results to return (default: 50) */
  limit?: number;
}

/**
 * Returns learning modules from Firestore, optionally filtered by type or tag.
 * Falls back to DEV_ONLY_FALLBACK_MODULES if the collection is empty.
 *
 * Note: Firestore does not support compound inequality filters in a single query.
 * Type and tag filters are applied separately — if both are provided, type is
 * used as the Firestore constraint and tag is post-filtered in memory.
 *
 * @example
 *   await listModules()                               // all modules
 *   await listModules({ type: "emergency" })          // emergency modules
 *   await listModules({ tag: "engine-failure" })      // by tag
 *   await listModules({ type: "procedure", limit: 5 })
 */
export async function listModules(
  params?: ListModulesParams
): Promise<ContentModule[]> {
  const resolvedLimit = params?.limit ?? 50;

  // Build the Firestore query — we can only use one `where` clause efficiently
  // without requiring composite indexes for every combination.
  type WhereEntry = { field: string; op: "==" | "array-contains"; value: unknown };
  let firestoreWhere: [WhereEntry] | undefined;

  if (params?.type) {
    firestoreWhere = [{ field: "type", op: "==", value: params.type }];
  } else if (params?.tag) {
    firestoreWhere = [{ field: "tags", op: "array-contains", value: params.tag }];
  }

  const results = await queryCollection<ContentModule>(modulesCollection(), {
    where: firestoreWhere,
    orderBy: { field: "title", direction: "asc" },
    limit: resolvedLimit,
  });

  // Post-filter by tag if both type and tag were provided
  // (Firestore can't do type == X AND tags array-contains Y without a composite index)
  const filtered =
    params?.type && params?.tag
      ? results.filter((m) => m.tags.includes(params.tag!))
      : results;

  if (filtered.length > 0) return filtered;

  // DEV_ONLY_FALLBACK: apply filters to seed data
  console.warn(
    "[modules] listModules: Firestore returned empty — using DEV_ONLY_FALLBACK data."
  );

  let fallback = DEV_ONLY_FALLBACK_MODULES;
  if (params?.type) fallback = fallback.filter((m) => m.type === params.type);
  if (params?.tag) fallback = fallback.filter((m) => m.tags.includes(params.tag!));
  fallback = fallback.slice(0, resolvedLimit);

  return fallback;
}

// ------------------------------------------------------------
// getModule
// ------------------------------------------------------------

/**
 * Returns a single learning module by ID, or null if not found.
 * Falls back to DEV_ONLY_FALLBACK_MODULES if Firestore returns null.
 *
 * @example
 *   const mod = await getModule("sys-fuel-001");
 */
export async function getModule(id: string): Promise<ContentModule | null> {
  if (!id) throw new Error("[modules] getModule: id must not be empty.");

  const result = await getDocData<ContentModule>(moduleDoc(id));
  if (result) return result;

  // DEV_ONLY_FALLBACK
  const fallback = DEV_ONLY_FALLBACK_MODULES.find((m) => m.id === id) ?? null;

  if (fallback) {
    console.warn(
      `[modules] getModule("${id}"): Firestore returned null — using DEV_ONLY_FALLBACK data.`
    );
  }

  return fallback;
}

// ------------------------------------------------------------
// upsertModule (admin only)
// ------------------------------------------------------------

/**
 * Creates or fully overwrites a module document in Firestore.
 * Uses the module's `id` field as the document ID.
 *
 * Admin use only — there is no UI-level permission check here.
 * Firestore Security Rules must enforce isAdmin on the /modules collection.
 *
 * @example
 *   await upsertModule({ id: "sys-fuel-001", title: "...", ... });
 */
export async function upsertModule(module: ContentModule): Promise<void> {
  if (!module.id) throw new Error("[modules] upsertModule: module.id must not be empty.");

  await setDocData<ContentModule>(moduleDoc(module.id), module, false);
}