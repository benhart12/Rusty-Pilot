// ============================================================
// RustyPilot Refresh — Dev Seed Utility
//
// WARNING: This file is FOR DEVELOPMENT USE ONLY.
// DO NOT import or call seedDevContent() in production code.
// DO NOT auto-run this file — it must be called explicitly,
// e.g. from a /dev/seed route or a browser console command.
//
// Seeds Firestore with minimal content so the full app flow is
// exercisable immediately after a fresh Firebase project setup.
//
// Safe to call multiple times — will not overwrite existing data.
// ============================================================

import { setDocData, queryCollection } from "@/lib/firestore";
import {
  modulesCollection,
  moduleDoc,
  aircraftFamiliesCollection,
  aircraftVariantsCollection,
} from "@/types/firestorePaths";
import {
  ContentModule,
  AircraftFamily,
  AircraftVariant,
} from "@/types/domain";

// ============================================================
// ⚠️  DEV-ONLY SEED DATA — NOT FOR PRODUCTION USE
// ============================================================

// ------------------------------------------------------------
// Aircraft families
// ------------------------------------------------------------

const SEED_FAMILIES: AircraftFamily[] = [
  {
    id: "cessna-172",
    name: "Cessna 172 Skyhawk",
    manufacturer: "Cessna",
    description:
      "The world's most popular training aircraft. High-wing, four-seat, docile handling, and highly reliable.",
    variantIds: ["c172n", "c172sp-g1000"],
  },
  {
    id: "piper-pa28",
    name: "Piper PA-28 Cherokee",
    manufacturer: "Piper",
    description:
      "Low-wing, single-engine trainer and personal aircraft. The Cherokee series spans from the basic 140 to the Arrow retractable.",
    variantIds: ["pa28-161"],
  },
];

// ------------------------------------------------------------
// Aircraft variants
// ------------------------------------------------------------

const SEED_VARIANTS: AircraftVariant[] = [
  {
    id: "c172n",
    familyId: "cessna-172",
    name: "172N (Steam Gauges)",
    year: 1978,
    avionicsType: "steam",
    notes: "Lycoming O-320-H2AD. No fuel injection. Classic six-pack panel. Carb heat required.",
    moduleTagOverrides: ["carburetor-heat", "mixture", "steam-gauges"],
  },
  {
    id: "c172sp-g1000",
    familyId: "cessna-172",
    name: "172SP (G1000 Glass)",
    year: 2007,
    avionicsType: "glass",
    notes: "Lycoming IO-360-L2A. Fuel injected. Garmin G1000 avionics suite. Optional GFC 700 autopilot.",
    moduleTagOverrides: ["g1000", "fuel-injection", "autopilot", "glass-panel"],
  },
  {
    id: "pa28-161",
    familyId: "piper-pa28",
    name: "Warrior II (PA-28-161)",
    year: 1984,
    avionicsType: "steam",
    notes: "Lycoming O-320-D3G. Low-wing. No carb heat required below throttle body. Simple fuel selector.",
    moduleTagOverrides: ["low-wing", "fuel-selector", "no-carb-heat"],
  },
];

// ------------------------------------------------------------
// Modules (8 modules covering all 4 ModuleTypes)
// ------------------------------------------------------------

const SEED_MODULES: ContentModule[] = [
  // ── SYSTEMS ────────────────────────────────────────────────

  {
    id: "sys-fuel-001",
    title: "Fuel System Overview",
    type: "system",
    tags: ["fuel", "aircraft-systems", "preflight"],
    overview:
      "Understand how fuel moves from tanks to engine, identify selector positions, and recognize contamination signs before every flight.",
    quickCheck: [
      { question: "What does BOTH mean on the fuel selector?", answer: "Both tanks feeding simultaneously — use for all normal C172 operations." },
      { question: "Where do you sample fuel during preflight?", answer: "Each tank sump, the fuel strainer (gascolator), and check caps after refueling." },
    ],
    estMinutes: 10,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "What color is 100LL aviation fuel?", back: "Blue. Dyed to distinguish from other grades." },
      { kind: "mcq", question: "Correct fuel selector position for C172 takeoff?", choices: ["LEFT", "RIGHT", "BOTH", "OFF"], answerIndex: 2, explanation: "BOTH ensures balanced draw and maximum fuel flow during the critical climb phase." },
      { kind: "branch", situation: "On short final the fuel selector is on LEFT, that tank nearly empty.", options: ["Continue approach — almost on the ground", "Switch to BOTH and continue", "Switch to RIGHT and go-around", "Declare emergency"], bestIndex: 1, rationale: "Switch to BOTH immediately to restore fuel flow from both tanks before touchdown." },
    ],
  },

  {
    id: "sys-electrical-001",
    title: "Electrical System Basics",
    type: "system",
    tags: ["electrical-failure", "alternator", "battery", "aircraft-systems"],
    overview:
      "Know what the alternator does, how to detect failure, and how long your battery will last when flying on battery alone.",
    quickCheck: [
      { question: "How does a C172SP G1000 indicate alternator failure?", answer: "MASTER CAUTION light and ALT annunciator on PFD. Ammeter shows discharge." },
      { question: "How long does a fully charged C172 battery last alone?", answer: "Approximately 30 minutes with normal loads active." },
    ],
    estMinutes: 9,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "What is the first troubleshooting step for an alternator failure?", back: "Cycle the ALT master switch OFF then ON to attempt an overvoltage relay reset." },
      { kind: "mcq", question: "The alternator CB has popped twice. You should:", choices: ["Reset it a third time", "Leave it popped, manage battery loads, land ASAP", "Pull battery master", "Declare immediately"], answerIndex: 1, explanation: "A CB that trips twice indicates a real fault. Do not reset — leave it popped to prevent fire risk." },
    ],
  },

  {
    id: "sys-pitot-static-001",
    title: "Pitot-Static System",
    type: "system",
    tags: ["pitot-static", "instruments", "preflight", "airspeed", "altimeter"],
    overview:
      "The pitot-static system drives your airspeed, altimeter, and VSI. Know how blockages affect each instrument and what the backup options are.",
    quickCheck: [
      { question: "What does a blocked pitot tube do to the airspeed indicator in level flight?", answer: "ASI freezes at the blocked speed. Climbing causes ASI to read lower; descending causes it to read higher." },
      { question: "What does a blocked static port do to the altimeter?", answer: "Altimeter freezes at the altitude where blockage occurred." },
    ],
    estMinutes: 8,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "What is the alternate static source used for?", back: "Bypasses a blocked or failed main static port. Uses cabin air — readings are slightly off at altitude." },
      { kind: "mcq", question: "On climbout you notice the airspeed is decreasing despite a positive pitch and full power. Likely cause?", choices: ["Engine failure", "Blocked pitot tube", "Blocked static port", "Stuck trim"], answerIndex: 1, explanation: "A blocked pitot tube causes ASI to decrease as altitude increases because dynamic pressure can't enter." },
    ],
  },

  // ── PROCEDURES ─────────────────────────────────────────────

  {
    id: "proc-engine-start-001",
    title: "Engine Start & Runup",
    type: "procedure",
    tags: ["startup", "runup", "normal-ops", "preflight"],
    overview:
      "A thorough runup catches most mechanical problems before takeoff. Know each check item and what failure looks like.",
    quickCheck: [
      { question: "What RPM drop is acceptable on a single-mag check in a C172?", answer: "Up to 125 RPM drop on either mag, and no more than 50 RPM difference between mags." },
      { question: "What does the carb heat check verify?", answer: "That carb heat causes a slight RPM drop (proves hot air is flowing), then RPM restores or rises above baseline after clearing any ice." },
    ],
    estMinutes: 10,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flowStep", step: "Throttle — 1800 RPM for runup", callout: "Firm braking. Verify trim is set to takeoff." },
      { kind: "flowStep", step: "Magnetos — check LEFT and RIGHT individually", callout: "Max 125 RPM drop per mag, max 50 RPM differential." },
      { kind: "flowStep", step: "Carb Heat — ON, note RPM drop, then OFF", callout: "Any RPM rise after OFF suggests ice was present and cleared." },
      { kind: "flowStep", step: "Engine instruments — oil temp and pressure in green", callout: "Never take off with oil temp below the green arc." },
    ],
  },

  {
    id: "proc-crosswind-001",
    title: "Crosswind Takeoff & Landing",
    type: "procedure",
    tags: ["crosswind", "normal-landing", "short-field", "wind-correction"],
    overview:
      "Crosswind technique is perishable. Refresh the control inputs and common mistakes before flying in gusty or angled-wind conditions.",
    quickCheck: [
      { question: "Which aileron input do you use on crosswind takeoff rollout?", answer: "Aileron into the wind — full deflection initially, reducing as speed builds and controls become effective." },
      { question: "What causes a ballooning flare on crosswind landing?", answer: "Flying too fast across the threshold, or rounding out too high — excess airspeed causes the aircraft to float and balloon." },
    ],
    estMinutes: 9,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "What is the slip-skid ball doing in a proper crosswind crab on final?", back: "Centered — a crab is coordinated flight. The sideslip (wing-low) is applied only at the flare." },
      { kind: "branch", situation: "On final in a 15-knot 90° crosswind you've established a wing-low slip. The aircraft drifts toward the upwind edge of the runway.", options: ["Add more rudder away from drift", "Increase bank angle toward the wind", "Continue — normal variation", "Go around"], bestIndex: 1, rationale: "Drifting upwind means the bank angle is insufficient. Increase aileron into the wind to correct drift while maintaining directional control with opposite rudder." },
    ],
  },

  // ── AIRPORT OPS ─────────────────────────────────────────────

  {
    id: "airops-tower-001",
    title: "Towered Airport Radio Work",
    type: "airportOps",
    tags: ["towered", "radio", "atis", "clearance-delivery", "ground-ops", "class-d"],
    overview:
      "Radio confidence degrades fast. Review the standard call sequence from ATIS through takeoff so nothing catches you off-guard on the ground.",
    quickCheck: [
      { question: "What info does ATIS provide?", answer: "Current weather (ceiling, visibility, wind, altimeter), active runways, NOTAMs, and the phonetic identifier for that recording." },
      { question: "What goes in your initial call to ground at a Class D airport?", answer: "Station, aircraft type and tail, location on field, destination/intentions, ATIS ID. Example: 'Roanoke Ground, Cessna 1234A, West Ramp, VFR to Danville, information Kilo.'" },
    ],
    estMinutes: 9,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "Class D airspace dimensions?", back: "Typically 5 nm radius, surface to 2,500 ft AGL. Requires two-way radio contact before entry." },
      { kind: "mcq", question: "You copied ATIS 'information Kilo.' When should you report this to ATC?", choices: ["In every subsequent call", "Only in your initial ground call", "Only if ATC asks", "Never — just use it internally"], answerIndex: 1, explanation: "Report the ATIS identifier in your initial call to confirm you have current weather. Subsequent calls don't need it unless conditions change." },
    ],
  },

  {
    id: "airops-ctaf-001",
    title: "Non-Towered Airport Operations",
    type: "airportOps",
    tags: ["ctaf", "uncontrolled-pattern", "traffic-advisory", "radio"],
    overview:
      "At non-towered airports you are your own ATC. Know the standard traffic pattern calls, self-announce responsibilities, and blind-transmission discipline.",
    quickCheck: [
      { question: "When do you make the five standard CTAF position reports?", answer: "Inbound 10 miles out, entering downwind, turning base, turning final, and clear of the runway." },
      { question: "What do you do if your radio fails at a non-towered airport?", answer: "Continue to the airport, enter the traffic pattern, rock wings to signal other traffic, and land normally. Light gun signals are for towered fields." },
    ],
    estMinutes: 7,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flashcard", front: "What does CTAF stand for?", back: "Common Traffic Advisory Frequency — the radio frequency designated for pilots to self-announce at non-towered airports." },
      { kind: "branch", situation: "You're on a straight-in final to runway 28 at a non-towered airport. Another aircraft announces 'Cessna 456 turning base runway 28.' You are 3 miles out.", options: ["Continue straight in — you have right of way on final", "Announce your position and extend if needed to sequence behind", "Make an immediate go-around", "Ignore — no tower, no conflict"], bestIndex: 1, rationale: "Straight-in approaches at non-towered airports are discouraged when pattern traffic exists. Announce your position and coordinate with the pattern aircraft — extend or go around to maintain safety." },
    ],
  },

  // ── EMERGENCY ──────────────────────────────────────────────

  {
    id: "emrg-efato-001",
    title: "Engine Failure After Takeoff (EFATO)",
    type: "emergency",
    tags: ["engine-failure", "emergency-landing", "forced-landing", "mayday"],
    overview:
      "The most time-critical emergency in single-engine flying. Know the memory items cold — pitch for best glide immediately, land ahead.",
    quickCheck: [
      { question: "What is the most important action on EFATO?", answer: "Pitch for best glide immediately. Aviate before troubleshooting." },
      { question: "Why not return to the runway below 1,000 ft AGL?", answer: "Insufficient altitude to complete the turn without exceeding bank angle limits and risking an accelerated stall." },
    ],
    estMinutes: 12,
    diagramUrls: [],
    drillPrompts: [
      { kind: "flowStep", step: "1. Pitch — Best Glide (65 KIAS C172)", callout: "Only action that buys time. Do it first, always." },
      { kind: "flowStep", step: "2. Fuel Selector — BOTH", callout: "May restore flow if selector was on a depleted tank." },
      { kind: "flowStep", step: "3. Mixture — RICH", callout: "Ensures full fuel if accidental leaning caused failure." },
      { kind: "flowStep", step: "4. Carb Heat — ON (if equipped)", callout: "Clears carb ice — a common cause of power loss." },
      { kind: "flowStep", step: "5. Land Ahead — Commit to a field, Squawk 7700", callout: "Do not attempt to return below 1,000 ft AGL." },
      { kind: "mcq", question: "Best glide speed C172N:", choices: ["55 KIAS", "65 KIAS", "75 KIAS", "80 KIAS"], answerIndex: 1, explanation: "65 KIAS gives maximum glide ratio — roughly 1.5 nm per 1,000 ft." },
    ],
  },
];

// ============================================================
// Seed function
// ============================================================

/**
 * Seeds Firestore with minimal dev content.
 *
 * ⚠️  FOR DEVELOPMENT USE ONLY.
 * ⚠️  Call manually — never auto-import or auto-run.
 *
 * Safe to call multiple times — will not overwrite existing data.
 * If the modules collection already has documents, exits immediately.
 *
 * @example
 *   // In a browser console or a /dev/seed admin route:
 *   import { seedDevContent } from "@/lib/devSeed";
 *   await seedDevContent();
 */
export async function seedDevContent(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error("[devSeed] Refusing to seed — NODE_ENV is 'production'.");
    return;
  }

  console.log("[devSeed] Checking existing content…");

  // Guard: skip if modules already exist
  const existing = await queryCollection<ContentModule>(modulesCollection(), { limit: 1 });
  if (existing.length > 0) {
    console.log("[devSeed] Modules already exist — skipping seed. Delete them to re-seed.");
    return;
  }

  console.log("[devSeed] No existing modules found. Seeding…");

  // ── Families ──
  const familyPath = (id: string) => `${aircraftFamiliesCollection()}/${id}`;
  for (const family of SEED_FAMILIES) {
    await setDocData(familyPath(family.id), family, false);
    console.log(`[devSeed]   ✓ Family: ${family.name}`);
  }

  // ── Variants ──
  const variantPath = (id: string) => `${aircraftVariantsCollection()}/${id}`;
  for (const variant of SEED_VARIANTS) {
    await setDocData(variantPath(variant.id), variant, false);
    console.log(`[devSeed]   ✓ Variant: ${variant.name}`);
  }

  // ── Modules ──
  for (const mod of SEED_MODULES) {
    await setDocData(moduleDoc(mod.id), mod, false);
    console.log(`[devSeed]   ✓ Module [${mod.type}]: ${mod.title}`);
  }

  console.log(
    `[devSeed] Done. Seeded ${SEED_FAMILIES.length} families, ${SEED_VARIANTS.length} variants, ${SEED_MODULES.length} modules.`
  );
}