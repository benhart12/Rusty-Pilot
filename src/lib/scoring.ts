// ============================================================
// RustyPilot Refresh — Scoring Helpers
//
// Pure, deterministic functions. No Firebase. No UI.
// These are the only functions allowed to compute pilot rust
// level and readiness scores — domain logic lives here, not
// in pages or components.
// ============================================================

// ------------------------------------------------------------
// daysSince
// ------------------------------------------------------------

/**
 * Returns the number of whole days between the given ISO 8601
 * date string and today (UTC midnight comparison).
 *
 * @example
 *   daysSince("2024-01-01") // → 365 (approximately, depending on today)
 */
export function daysSince(dateIso: string): number {
    const past = new Date(dateIso);
    const now = new Date();
  
    // Strip time component from both sides for a clean day diff
    const pastMidnight = Date.UTC(
      past.getUTCFullYear(),
      past.getUTCMonth(),
      past.getUTCDate()
    );
    const nowMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
  
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((nowMidnight - pastMidnight) / msPerDay));
  }
  
  // ------------------------------------------------------------
  // rustLevel
  // ------------------------------------------------------------
  
  export interface RustLevel {
    label: "Fresh" | "Warming Up" | "Rusty" | "Very Rusty";
    /** Tailwind-compatible color token hint for UI theming */
    colorHint: "green" | "yellow" | "orange" | "red";
    /** One-sentence explanation shown to the pilot */
    explanation: string;
  }
  
  /**
   * Maps days since last flight to a human-readable rust level.
   *
   * Thresholds (loosely based on FAR 61.57 currency norms):
   *   0–29  days  → Fresh        (within the last month)
   *   30–89 days  → Warming Up   (1–3 months)
   *   90–179 days → Rusty        (3–6 months)
   *   180+  days  → Very Rusty   (more than 6 months)
   *
   * @example
   *   rustLevel(10)  // { label: "Fresh", colorHint: "green", ... }
   *   rustLevel(120) // { label: "Rusty", colorHint: "orange", ... }
   */
  export function rustLevel(days: number): RustLevel {
    if (days < 0) days = 0;
  
    if (days < 30) {
      return {
        label: "Fresh",
        colorHint: "green",
        explanation:
          "You flew within the last month — your skills should be sharp.",
      };
    }
  
    if (days < 90) {
      return {
        label: "Warming Up",
        colorHint: "yellow",
        explanation:
          "It's been 1–3 months. A quick systems and procedure review will set you up.",
      };
    }
  
    if (days < 180) {
      return {
        label: "Rusty",
        colorHint: "orange",
        explanation:
          "3–6 months since your last flight. Focus on emergency procedures and normal ops.",
      };
    }
  
    return {
      label: "Very Rusty",
      colorHint: "red",
      explanation:
        "More than 6 months since your last flight. A BFR or dual session is strongly recommended.",
    };
  }
  
  // ------------------------------------------------------------
  // readinessScore
  // ------------------------------------------------------------
  
  export interface ReadinessInput {
    /** Days since the pilot's last logged flight */
    daysSinceFlight: number;
    /** Full-stop or touch-and-go landings in the past 90 days */
    landings90: number;
    /** Night landings in the past 90 days */
    nightLandings90: number;
    /** Has the pilot operated at a towered airport recently? */
    toweredRecent: boolean;
    /** Self-reported confidence on a 1–5 scale */
    confidence1to5: number;
  }
  
  export interface ScoreBreakdownItem {
    key: string;
    points: number; // positive = earned, negative = deducted
    note: string;
  }
  
  export interface ReadinessResult {
    /** Final readiness score, clamped to [0, 100] */
    score: number;
    /** Transparent breakdown of every contribution to the score */
    breakdown: ScoreBreakdownItem[];
  }
  
  /**
   * Calculates an overall readiness score (0–100) from pilot currency inputs.
   *
   * Scoring model (additive from 0, capped at 100):
   *
   *   recency base          0–40 pts  (inverse of days since flight)
   *   landing currency      0–25 pts  (landings in past 90 days)
   *   night currency        0–10 pts  (night landings in past 90 days)
   *   towered ops           0–10 pts  (recent towered airport ops)
   *   self-confidence       0–15 pts  (pilot's own 1–5 rating)
   *
   * Total max = 100 pts. Score is clamped to [0, 100].
   *
   * @example
   *   readinessScore({
   *     daysSinceFlight: 15,
   *     landings90: 8,
   *     nightLandings90: 2,
   *     toweredRecent: true,
   *     confidence1to5: 4,
   *   });
   *   // → { score: 87, breakdown: [...] }
   */
  export function readinessScore(input: ReadinessInput): ReadinessResult {
    const breakdown: ScoreBreakdownItem[] = [];
  
    // ----------------------------------------------------------
    // 1. Recency base (0–40 pts)
    //    Full points at 0 days, linearly decays to 0 at 180 days,
    //    stays 0 beyond that.
    // ----------------------------------------------------------
    const MAX_RECENCY_DAYS = 180;
    const MAX_RECENCY_PTS = 40;
    const days = Math.max(0, input.daysSinceFlight);
    const recencyPts =
      days >= MAX_RECENCY_DAYS
        ? 0
        : Math.round(((MAX_RECENCY_DAYS - days) / MAX_RECENCY_DAYS) * MAX_RECENCY_PTS);
  
    breakdown.push({
      key: "recency",
      points: recencyPts,
      note:
        days === 0
          ? "Flew today."
          : `Last flight ${days} day${days === 1 ? "" : "s"} ago.`,
    });
  
    // ----------------------------------------------------------
    // 2. Landing currency (0–25 pts)
    //    FAR 61.57 requires 3 landings in 90 days for passenger
    //    currency. We reward up to 10 landings generously.
    //    < 3  → 0 pts (not current)
    //    3–4  → 10 pts (barely current)
    //    5–6  → 18 pts
    //    7–9  → 22 pts
    //    10+  → 25 pts
    // ----------------------------------------------------------
    const landings = Math.max(0, input.landings90);
    let landingPts: number;
    let landingNote: string;
  
    if (landings < 3) {
      landingPts = 0;
      landingNote = `${landings} landing${landings === 1 ? "" : "s"} in 90 days — not current per FAR 61.57.`;
    } else if (landings < 5) {
      landingPts = 10;
      landingNote = `${landings} landings in 90 days — minimally current.`;
    } else if (landings < 7) {
      landingPts = 18;
      landingNote = `${landings} landings in 90 days — reasonably current.`;
    } else if (landings < 10) {
      landingPts = 22;
      landingNote = `${landings} landings in 90 days — solidly current.`;
    } else {
      landingPts = 25;
      landingNote = `${landings}+ landings in 90 days — very current.`;
    }
  
    breakdown.push({ key: "landingCurrency", points: landingPts, note: landingNote });
  
    // ----------------------------------------------------------
    // 3. Night currency (0–10 pts)
    //    FAR 61.57 requires 3 night landings for night passenger ops.
    //    0   → 0 pts
    //    1–2 → 4 pts
    //    3+  → 10 pts
    // ----------------------------------------------------------
    const nightLandings = Math.max(0, input.nightLandings90);
    let nightPts: number;
    let nightNote: string;
  
    if (nightLandings === 0) {
      nightPts = 0;
      nightNote = "No night landings in 90 days.";
    } else if (nightLandings < 3) {
      nightPts = 4;
      nightNote = `${nightLandings} night landing${nightLandings === 1 ? "" : "s"} — not yet night current.`;
    } else {
      nightPts = 10;
      nightNote = `${nightLandings} night landings — night current.`;
    }
  
    breakdown.push({ key: "nightCurrency", points: nightPts, note: nightNote });
  
    // ----------------------------------------------------------
    // 4. Towered airport ops (0 or 10 pts)
    // ----------------------------------------------------------
    const toweredPts = input.toweredRecent ? 10 : 0;
    breakdown.push({
      key: "toweredOps",
      points: toweredPts,
      note: input.toweredRecent
        ? "Recent Class B/C/D ops — ATC communications sharp."
        : "No recent towered airport ops — consider a tower visit before flying Class B/C/D.",
    });
  
    // ----------------------------------------------------------
    // 5. Self-reported confidence (0–15 pts)
    //    1 → 0 pts, 2 → 4, 3 → 8, 4 → 12, 5 → 15
    // ----------------------------------------------------------
    const confidence = Math.min(5, Math.max(1, Math.round(input.confidence1to5)));
    const confidencePts = [0, 0, 4, 8, 12, 15][confidence];
    breakdown.push({
      key: "selfConfidence",
      points: confidencePts,
      note: `Self-reported confidence: ${confidence}/5.`,
    });
  
    // ----------------------------------------------------------
    // Total — clamp to [0, 100]
    // ----------------------------------------------------------
    const raw = breakdown.reduce((sum, item) => sum + item.points, 0);
    const score = Math.min(100, Math.max(0, raw));
  
    return { score, breakdown };
  }
  
  // ------------------------------------------------------------
  // clamp (internal utility — not exported)
  // ------------------------------------------------------------
  
  // Note: clamping is inlined above for clarity, but if more
  // scoring functions are added, extract this:
  //   function clamp(value: number, min: number, max: number): number {
  //     return Math.min(max, Math.max(min, value));
  //   }