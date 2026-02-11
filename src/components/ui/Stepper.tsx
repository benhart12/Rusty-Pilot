// ============================================================
// RustyPilot Refresh — Stepper Component
//
// Horizontal wizard progress indicator with step labels.
// Mobile-friendly: labels hide below sm breakpoint, step numbers stay.
//
// Usage:
//   <Stepper
//     steps={["Aircraft", "Scenario", "Review"]}
//     activeIndex={1}
//   />
//
// States:
//   - completed  (index < activeIndex): filled circle + checkmark
//   - active     (index === activeIndex): filled sky circle + step number
//   - upcoming   (index > activeIndex): light circle + step number
// ============================================================

import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface StepperProps {
  /** Ordered step labels */
  steps: string[];
  /** 0-based index of the currently active step */
  activeIndex: number;
  /** Additional classes on the root container */
  className?: string;
}

// ------------------------------------------------------------
// Checkmark icon (inline SVG — no icon lib dependency)
// ------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polyline points="2,6.5 5,9.5 10,3" />
    </svg>
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function Stepper({ steps, activeIndex, className }: StepperProps) {
  const clampedActive = Math.min(Math.max(0, activeIndex), steps.length - 1);

  return (
    <nav
      aria-label="Progress"
      className={cn("w-full", className)}
    >
      <ol
        role="list"
        className="flex items-start justify-between"
      >
        {steps.map((label, index) => {
          const isCompleted = index < clampedActive;
          const isActive = index === clampedActive;
          const isUpcoming = index > clampedActive;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={label}
              className={cn(
                "flex flex-col items-center",
                // Each step takes equal share of the row
                "flex-1",
                // All but the last have a connecting line via a relative container
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {/* Step node + connector line row */}
              <div className="relative flex w-full items-center">

                {/* Left connector line — hidden on first step */}
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0 && "invisible", // first step has no left line
                    isCompleted || isActive ? "bg-sky-500" : "bg-slate-200"
                  )}
                  aria-hidden="true"
                />

                {/* Step circle */}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center",
                    "rounded-full shrink-0",
                    "transition-colors duration-200",
                    // Sizes
                    "w-8 h-8 text-xs font-semibold",
                    // Completed
                    isCompleted && "bg-sky-500 text-white",
                    // Active
                    isActive && "bg-sky-600 text-white ring-4 ring-sky-100",
                    // Upcoming
                    isUpcoming && "bg-white text-slate-400 border-2 border-slate-300",
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-3.5 h-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Right connector line — hidden on last step */}
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    isLast && "invisible", // last step has no right line
                    isCompleted ? "bg-sky-500" : "bg-slate-200"
                  )}
                  aria-hidden="true"
                />
              </div>

              {/* Step label — hidden on mobile, shown sm+ */}
              <span
                className={cn(
                  "mt-2 text-center leading-tight",
                  // Hidden on very small screens to avoid crowding
                  "hidden sm:block",
                  "text-xs",
                  isCompleted && "text-sky-600 font-medium",
                  isActive   && "text-sky-700 font-semibold",
                  isUpcoming && "text-slate-400",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile: show only the active step label below the bar */}
      <p className="mt-2 text-center text-xs font-medium text-sky-700 sm:hidden">
        Step {clampedActive + 1} of {steps.length}: {steps[clampedActive]}
      </p>
    </nav>
  );
}