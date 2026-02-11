// ============================================================
// RustyPilot Refresh — LoadingState Component
//
// Animated skeleton placeholder shown while data is loading.
// Renders a card-shaped block with a title bar and content lines.
//
// Usage:
//   <LoadingState />               // default: 3 lines
//   <LoadingState lines={5} />     // more content lines
//   <LoadingState lines={1} />     // single-line skeleton (e.g. a heading)
// ============================================================

import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface LoadingStateProps {
  /** Number of content skeleton lines to render (default: 3, max: 8) */
  lines?: number;
  /** Additional classes on the outer wrapper */
  className?: string;
}

// ------------------------------------------------------------
// Individual skeleton bar
// ------------------------------------------------------------

function SkeletonBar({ width, className }: { width: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-3 rounded-full bg-slate-200",
        width,
        className
      )}
    />
  );
}

// Cycle through widths so the lines feel like real text, not a grid
const LINE_WIDTHS = ["w-full", "w-5/6", "w-full", "w-4/5", "w-11/12", "w-3/4", "w-full", "w-5/6"];

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function LoadingState({ lines = 3, className }: LoadingStateProps) {
  const clampedLines = Math.min(Math.max(1, lines), 8);

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-busy="true"
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white p-5",
        "animate-pulse",
        className
      )}
    >
      {/* Title skeleton */}
      <div className="mb-4 space-y-2">
        <SkeletonBar width="w-2/5" className="h-4" />
        <SkeletonBar width="w-1/4" className="h-3" />
      </div>

      {/* Divider */}
      <div aria-hidden="true" className="mb-4 h-px bg-slate-100" />

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: clampedLines }).map((_, i) => (
          <SkeletonBar
            key={i}
            width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
          />
        ))}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  );
}