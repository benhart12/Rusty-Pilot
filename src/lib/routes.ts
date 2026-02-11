// ============================================================
// RustyPilot Refresh — Route Constants & Builders
//
// All navigation paths live here. Import ROUTES or the builder
// functions instead of writing path strings inline.
//
// Usage:
//   import { ROUTES, plan, module, drillSession } from "@/lib/routes";
//
//   router.push(ROUTES.dashboard);
//   router.push(plan("abc123"));
//   router.push(module("eng-001"));
//   router.push(drillSession({ type: "flashcard", moduleId: "eng-001" }));
// ============================================================

// ------------------------------------------------------------
// Static routes
// ------------------------------------------------------------

export const ROUTES = {
    /** / — marketing / landing page */
    home: "/",
  
    /** /login — email+password auth */
    login: "/login",
  
    /** /onboarding — first-time profile setup */
    onboarding: "/onboarding",
  
    /** /dashboard — home screen after login */
    dashboard: "/dashboard",
  
    /** /aircraft — aircraft family + variant picker */
    aircraft: "/aircraft",
  
    /** /assessment — rust / readiness assessment */
    assessment: "/assessment",
  
    /** /scenario — study plan builder wizard */
    scenario: "/scenario",
  
    /** /modules — full module library listing */
    modules: "/modules",
  
    /** /progress — user performance & mastery overview */
    progress: "/progress",
  
    /** /settings — user profile & preferences */
    settings: "/settings",
  } as const;
  
  // Derive a union type of all static route values for type-safe checks elsewhere
  export type StaticRoute = (typeof ROUTES)[keyof typeof ROUTES];
  
  // ------------------------------------------------------------
  // Dynamic route builders
  // ------------------------------------------------------------
  
  /**
   * Builds the path for a generated study plan detail page.
   *
   * @example
   *   plan("abc123")  // → "/plan/abc123"
   */
  export function plan(id: string): string {
    if (!id) throw new Error("[routes] plan(): id must not be empty.");
    return `/plan/${encodeURIComponent(id)}`;
  }
  
  /**
   * Builds the path for a single module detail page.
   *
   * @example
   *   module("eng-001")  // → "/modules/eng-001"
   */
  export function module(id: string): string {
    if (!id) throw new Error("[routes] module(): id must not be empty.");
    return `/modules/${encodeURIComponent(id)}`;
  }
  
  /**
   * Builds the path for a drill session, optionally appending query params.
   * The `/drill/session` route matches the `[type]` segment with value "session";
   * callers distinguish session kind via the `type` query param.
   *
   * @example
   *   drillSession()
   *   // → "/drill/session"
   *
   *   drillSession({ type: "flashcard", moduleId: "eng-001" })
   *   // → "/drill/session?type=flashcard&moduleId=eng-001"
   */
  export function drillSession(params?: Record<string, string>): string {
    const base = "/drill/session";
    if (!params || Object.keys(params).length === 0) return base;
  
    const qs = new URLSearchParams(params).toString();
    return `${base}?${qs}`;
  }