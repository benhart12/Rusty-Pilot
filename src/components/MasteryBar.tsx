// ============================================================
// RustyPilot Refresh — MasteryBar Component
//
// Displays a pilot's mastery score (0–100) as a colored
// progress bar. Color shifts from red → yellow → green as
// mastery increases, matching the scoring.ts band definitions.
//
// Usage:
//   <MasteryBar value={72} />
//   <MasteryBar value={45} showLabel />
//   <MasteryBar value={0}  showLabel />   // "Not started"
// ============================================================

import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface MasteryBarProps {
  /** Mastery score in [0, 100] */
  value: number;
  /** Shows the numeric label and band name to the right of the bar */
  showLabel?: boolean;
  /** Additional classes on the root wrapper */
  className?: string;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Clamps a number to [min, max] */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

interface BandInfo {
  label: string;          // e.g. "Proficient"
  fillClass: string;      // Tailwind bg color for the fill bar
  trackClass: string;     // Tailwind bg color for the track (lighter)
  labelClass: string;     // Text color for the label
}

/** Maps a mastery score to its visual band. Matches scoring.ts band definitions. */
function getBand(value: number): BandInfo {
  if (value === 0) {
    return {
      label: "Not started",
      fillClass: "bg-slate-300",
      trackClass: "bg-slate-100",
      labelClass: "text-slate-400",
    };
  }
  if (value < 40) {
    return {
      label: "Needs work",
      fillClass: "bg-red-400",
      trackClass: "bg-red-50",
      labelClass: "text-red-500",
    };
  }
  if (value < 70) {
    return {
      label: "Developing",
      fillClass: "bg-amber-400",
      trackClass: "bg-amber-50",
      labelClass: "text-amber-600",
    };
  }
  if (value < 90) {
    return {
      label: "Proficient",
      fillClass: "bg-sky-500",
      trackClass: "bg-sky-50",
      labelClass: "text-sky-600",
    };
  }
  return {
    label: "Mastered",
    fillClass: "bg-emerald-500",
    trackClass: "bg-emerald-50",
    labelClass: "text-emerald-600",
  };
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function MasteryBar({
  value,
  showLabel = false,
  className,
}: MasteryBarProps) {
  const clamped = clamp(Math.round(value), 0, 100);
  const band = getBand(clamped);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Progress track */}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Mastery: ${clamped}% — ${band.label}`}
        className={cn(
          "flex-1 h-2 rounded-full overflow-hidden",
          band.trackClass
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            band.fillClass
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Optional label */}
      {showLabel && (
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className={cn("text-sm font-semibold tabular-nums", band.labelClass)}>
            {clamped}%
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {band.label}
          </span>
        </div>
      )}
    </div>
  );
}