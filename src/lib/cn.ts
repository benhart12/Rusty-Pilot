// ============================================================
// RustyPilot Refresh — Classname Helper
//
// Joins class strings while filtering out falsy values.
// Intentionally zero-dependency — no clsx, no tailwind-merge.
//
// Usage:
//   cn("base-class", isActive && "active", undefined, "other")
//   // → "base-class active other"
// ============================================================

type ClassValue = string | number | boolean | null | undefined;

/**
 * Joins any number of class values into a single trimmed string.
 * Falsy values (false, null, undefined, 0, "") are silently ignored.
 *
 * @example
 *   cn("btn", "btn-primary")           // "btn btn-primary"
 *   cn("btn", isActive && "btn-active") // "btn btn-active"  or  "btn"
 *   cn("px-4", undefined, "py-2")      // "px-4 py-2"
 */
export function cn(...args: ClassValue[]): string {
  return args
    .filter(Boolean)
    .join(" ")
    .trim();
}