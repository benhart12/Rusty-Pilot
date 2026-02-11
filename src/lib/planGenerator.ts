// ============================================================
// RustyPilot Refresh — Study Plan Generator
//
// Pure function. No Firebase. No UI. No side effects.
//
// Takes a pilot's scenario inputs and returns a StudyPlan
// (without an id — the data layer assigns one on save).
//
// Architecture:
//   1. Build a prioritized tag list from inputs
//   2. Map tags → PlanItems per section
//   3. Assemble sections in a fixed order
//   4. Estimate total time
//
// Tag-to-module mapping is intentionally loose — we reference
// tags so the data layer can query modules dynamically. Known
// module IDs (from seeds or future hardcoding) can be layered
// in as PlanItem { kind:"module" } entries.
// ============================================================

import {
    StudyPlan,
    PlanSection,
    PlanItem,
    PlanInputs,
    PilotGoal,
  } from "@/types/domain";
  
  // ------------------------------------------------------------
  // Generator Input Type
  // ------------------------------------------------------------
  
  export interface PlanGeneratorInput {
    /** Selected aircraft variant ID */
    aircraftVariantId: string;
  
    /** Where the pilot will be operating */
    airportType: "towered" | "nonTowered";
  
    /** Airspace class (optional — inferred from airportType if omitted) */
    airspace?: "B" | "C" | "D" | "E" | "G";
  
    /** Environmental and technique conditions for the planned flight */
    conditions: {
      night: boolean;
      windy: boolean;
      crosswindPractice: boolean;
      shortField: boolean;
      softField: boolean;
    };
  
    /** Will passengers be on board? Raises the review bar for emergencies */
    passengers: boolean;
  
    /** Days since the pilot's last logged flight */
    daysSinceFlight: number;
  }
  
  // ------------------------------------------------------------
  // Estimation constants
  // ------------------------------------------------------------
  
  // Approximate minutes per tag/module item — used for total time estimate
  const MINUTES_PER_ITEM = 8;
  
  // ------------------------------------------------------------
  // Internal tag-weight helpers
  // ------------------------------------------------------------
  
  /**
   * Returns an array of system-layer tags ordered by relevance to
   * the pilot's scenario. Higher-priority tags appear first so the
   * section stays focused when trimmed to max items.
   *
   * Rules:
   * - Aircraft-specific tags always lead (we may not know the exact
   *   module IDs yet, but the variant ID becomes a filter hint).
   * - Fuel and electrical are always included — cornerstones of any
   *   pre-flight mental model.
   * - Add fuel-system emphasis for longer cross-countries or night.
   * - Add pitot-static for IFR / night ops where instruments matter.
   */
  function buildSystemsTags(input: PlanGeneratorInput): string[] {
    const tags: string[] = ["aircraft-systems", "fuel", "electrical"];
  
    if (input.conditions.night) {
      // Lighting systems and pitot-static become critical at night
      tags.push("lighting", "pitot-static");
    }
  
    if (input.conditions.windy || input.conditions.crosswindPractice) {
      // Flight controls and stall awareness matter more in gusty conditions
      tags.push("flight-controls", "stall-awareness");
    } else {
      // Default: engine and flight controls are always worth a review
      tags.push("engine", "flight-controls");
    }
  
    if (input.daysSinceFlight > 90) {
      // Very rusty — add avionics/instruments to catch up on forgotten flows
      tags.push("avionics", "instruments");
    }
  
    return dedupe(tags).slice(0, 6);
  }
  
  /**
   * Builds procedure tags. Ordered by scenario priority.
   *
   * Rules:
   * - Normal operations (startup, runup, taxi) always included.
   * - Landing technique tags added based on conditions.
   * - Night adds lighting checks and night departure procedures.
   * - Passengers trigger a passenger briefing tag.
   */
  function buildProceduresTags(input: PlanGeneratorInput): string[] {
    const tags: string[] = ["normal-ops", "startup", "runup"];
  
    // Landing technique — add relevant variants
    if (input.conditions.shortField) tags.push("short-field");
    if (input.conditions.softField) tags.push("soft-field");
    if (input.conditions.crosswindPractice) tags.push("crosswind");
  
    // If no specific technique requested, include standard pattern work
    if (
      !input.conditions.shortField &&
      !input.conditions.softField &&
      !input.conditions.crosswindPractice
    ) {
      tags.push("pattern", "normal-landing");
    }
  
    if (input.conditions.night) tags.push("night-ops", "night-departure");
    if (input.conditions.windy) tags.push("wind-correction", "gusts");
    if (input.passengers) tags.push("passenger-briefing");
  
    return dedupe(tags).slice(0, 6);
  }
  
  /**
   * Builds airport ops tags. Ordered by complexity of airspace.
   *
   * Rules:
   * - Radio phraseology always included — it degrades fast.
   * - Towered airports add ATIS, clearances, and ground ops.
   * - Specific airspace class adds its own tag for detailed review.
   * - Non-towered adds CTAF, traffic advisories, uncontrolled pattern.
   * - Night adds airport lighting controls (PCL) and beacon interpretation.
   */
  function buildAirportOpsTags(input: PlanGeneratorInput): string[] {
    const tags: string[] = ["radio", "pattern"];
  
    if (input.airportType === "towered") {
      tags.push("towered", "atis", "clearance-delivery", "ground-ops");
  
      // Add airspace-specific review for Class B or C (complex ATC)
      if (input.airspace === "B") tags.push("class-b");
      if (input.airspace === "C") tags.push("class-c");
    } else {
      // Non-towered / uncontrolled
      tags.push("ctaf", "uncontrolled-pattern", "traffic-advisory");
  
      if (input.airspace === "G") tags.push("class-g");
    }
  
    if (input.conditions.night) tags.push("airport-lighting", "pcl", "beacon");
  
    return dedupe(tags).slice(0, 6);
  }
  
  /**
   * Builds emergency procedure tags. Ordered by severity and frequency.
   *
   * Rules:
   * - Engine failure and emergency landing always included — the Big Two.
   * - Electrical failure covers alternator-out scenarios (common in C172s).
   * - Passenger flights increase urgency: add fire and forced landing.
   * - Night conditions add spatial disorientation and lost comm procedures.
   * - Very rusty pilots (>180 days) get the full emergency battery.
   * - Icing is excluded here — not yet a supported scenario.
   */
  function buildEmergencyTags(input: PlanGeneratorInput): string[] {
    // Anchors — always present regardless of scenario
    const tags: string[] = ["engine-failure", "emergency-landing", "electrical-failure"];
  
    if (input.passengers) {
      // Lives on board raises the stakes
      tags.push("fire", "forced-landing", "mayday");
    }
  
    if (input.conditions.night) {
      tags.push("spatial-disorientation", "lost-comm", "night-emergency");
    }
  
    if (input.daysSinceFlight > 180) {
      // More than 6 months — cover the full emergency checklist
      tags.push("vacuum-failure", "fuel-emergency", "emergency-descent");
    } else {
      // Under 6 months — two more common scenarios are enough
      tags.push("fuel-emergency", "emergency-descent");
    }
  
    return dedupe(tags).slice(0, 6);
  }
  
  // ------------------------------------------------------------
  // Tag → PlanItem mapper
  // ------------------------------------------------------------
  
  /**
   * Converts a list of tags into PlanItem[] objects.
   * All items are tag-based for now. Module-ID items can be
   * injected by the data layer once module IDs are known.
   */
  function tagsToItems(tags: string[], labels?: Record<string, string>): PlanItem[] {
    return tags.map((tag) => ({
      kind: "tagGroup" as const,
      tag,
      label: labels?.[tag] ?? formatTagLabel(tag),
    }));
  }
  
  /**
   * Converts a kebab-case tag into a Title Case label for display.
   * e.g. "engine-failure" → "Engine Failure"
   */
  function formatTagLabel(tag: string): string {
    return tag
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  
  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  
  /** Removes duplicate strings while preserving order */
  function dedupe(arr: string[]): string[] {
    return [...new Set(arr)];
  }
  
  // ------------------------------------------------------------
  // Main: generateStudyPlan
  // ------------------------------------------------------------
  
  /**
   * Generates a StudyPlan from the pilot's scenario inputs.
   *
   * Returns a plan without an `id` — callers must assign an ID
   * (via addDocData) before persisting to Firestore.
   *
   * @example
   *   const plan = generateStudyPlan({
   *     aircraftVariantId: "c172sp-g1000",
   *     airportType: "towered",
   *     airspace: "D",
   *     conditions: { night: false, windy: true, crosswindPractice: true,
   *                   shortField: false, softField: false },
   *     passengers: true,
   *     daysSinceFlight: 65,
   *   });
   */
  export function generateStudyPlan(
    input: PlanGeneratorInput
  ): Omit<StudyPlan, "id"> {
    const now = new Date().toISOString();
  
    // ----------------------------------------------------------
    // Build section items
    // ----------------------------------------------------------
  
    const systemsItems = tagsToItems(buildSystemsTags(input));
    const proceduresItems = tagsToItems(buildProceduresTags(input));
    const airportOpsItems = tagsToItems(buildAirportOpsTags(input));
    const emergencyItems = tagsToItems(buildEmergencyTags(input));
  
    // ----------------------------------------------------------
    // Assemble sections in prescribed order
    // ----------------------------------------------------------
  
    const sections: PlanSection[] = [
      {
        title: "Systems Review",
        description:
          "Refresh your mental model of the aircraft's key systems before you brief anything else.",
        items: systemsItems,
      },
      {
        title: "Normal Procedures",
        description:
          "Run through the flows and checklists you'll actually use on this flight.",
        items: proceduresItems,
      },
      {
        title: "Airport Operations",
        description:
          "Sharpen your radio work, pattern awareness, and airspace knowledge for today's environment.",
        items: airportOpsItems,
      },
      {
        title: "Emergency Quick Hits",
        description:
          "Brief the emergencies most likely for your conditions. Know them cold before you taxi.",
        items: emergencyItems,
      },
    ];
  
    // ----------------------------------------------------------
    // Estimate total study time
    // ----------------------------------------------------------
  
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    const estTotalMinutes = totalItems * MINUTES_PER_ITEM;
  
    // ----------------------------------------------------------
    // Build PlanInputs (for Firestore storage & plan re-display)
    // ----------------------------------------------------------
  
    // Map scenario conditions to focusTags for the stored PlanInputs
    const focusTags: string[] = [];
    if (input.conditions.night) focusTags.push("night-ops");
    if (input.conditions.windy) focusTags.push("wind-correction");
    if (input.conditions.crosswindPractice) focusTags.push("crosswind");
    if (input.conditions.shortField) focusTags.push("short-field");
    if (input.conditions.softField) focusTags.push("soft-field");
    if (input.airportType === "towered") focusTags.push("towered");
    if (input.passengers) focusTags.push("passenger-briefing");
  
    // Derive goals from conditions for PlanInputs storage
    const goals: PilotGoal[] = ["rust removal"];
    if (input.daysSinceFlight > 90) goals.push("BFR prep");
    if (input.conditions.night) goals.push("night currency");
  
    const planInputs: PlanInputs = {
      aircraftVariantId: input.aircraftVariantId,
      daysSinceLastFlight: input.daysSinceFlight,
      // totalHours is not available in PlanGeneratorInput — default to 0;
      // the caller can merge in the real value from UserProfile if needed.
      totalHours: 0,
      selectedGoals: goals,
      focusTags,
      // availableMinutes is estimated from section count — caller can override
      availableMinutes: estTotalMinutes,
    };
  
    // ----------------------------------------------------------
    // Auto-generate a descriptive plan title
    // ----------------------------------------------------------
  
    const rustLabel =
      input.daysSinceFlight < 30
        ? "Quick Refresh"
        : input.daysSinceFlight < 90
        ? "Warm-Up Briefing"
        : input.daysSinceFlight < 180
        ? "Rust Removal Plan"
        : "Full Comeback Plan";
  
    const conditionSuffix = [
      input.conditions.night && "Night",
      input.conditions.crosswindPractice && "Crosswind",
      input.conditions.shortField && "Short Field",
    ]
      .filter(Boolean)
      .join(" / ");
  
    const title = conditionSuffix
      ? `${rustLabel} — ${conditionSuffix}`
      : rustLabel;
  
    // ----------------------------------------------------------
    // Return plan (without id)
    // ----------------------------------------------------------
  
    return {
      uid: "", // caller must set uid before saving
      createdAt: now,
      inputs: planInputs,
      sections,
      title,
      estTotalMinutes,
    };
  }