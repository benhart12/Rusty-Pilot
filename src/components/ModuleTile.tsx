// ============================================================
// RustyPilot Refresh — ModuleTile Component
//
// Displays a learning module as a clickable card with title,
// overview, metadata (type, est. time, tags), and mastery bar
// if the pilot has attempted this module before.
//
// Usage:
//   <ModuleTile
//     module={mod}
//     progress={progress}     // null or undefined → shows as "not started"
//     href={module("eng-001")}
//   />
// ============================================================

import Link from "next/link";
import { ContentModule, ModuleType, UserModuleProgress } from "@/types/domain";
import MasteryBar from "@/components/MasteryBar";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface ModuleTileProps {
  module: ContentModule;
  /** Progress record — null or undefined means not yet started */
  progress?: UserModuleProgress | null;
  /** Navigation target for the full module detail page */
  href: string;
  /** Additional classes on the outer card */
  className?: string;
}

// ------------------------------------------------------------
// Module type badge config
// ------------------------------------------------------------

const moduleTypeMeta: Record<
  ModuleType,
  { label: string; colorClasses: string }
> = {
  system:     { label: "System",      colorClasses: "bg-sky-50 text-sky-700 border border-sky-200" },
  procedure:  { label: "Procedure",   colorClasses: "bg-violet-50 text-violet-700 border border-violet-200" },
  airportOps: { label: "Airport Ops", colorClasses: "bg-amber-50 text-amber-700 border border-amber-200" },
  emergency:  { label: "Emergency",   colorClasses: "bg-red-50 text-red-700 border border-red-200" },
};

// Max tags to show before truncating with "+N more"
const MAX_VISIBLE_TAGS = 3;

// ------------------------------------------------------------
// Clock icon (inline SVG)
// ------------------------------------------------------------

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
      className="w-3.5 h-3.5"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function ModuleTile({
  module,
  progress,
  href,
  className,
}: ModuleTileProps) {
  const typeMeta = moduleTypeMeta[module.type];
  const hasProgress = progress != null && progress.attemptCount > 0;
  const mastery = progress?.mastery ?? 0;

  const visibleTags = module.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = module.tags.length - visibleTags.length;

  return (
    <Link
      href={href}
      className={cn(
        // Card base
        "group block rounded-xl border border-slate-200 bg-white",
        "shadow-sm hover:shadow-md",
        "transition-shadow duration-150",
        // Focus ring for keyboard nav
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        className
      )}
      aria-label={`${module.title}${hasProgress ? `, mastery ${mastery}%` : ", not started"}`}
    >
      <div className="p-4 flex flex-col gap-3">

        {/* ── Top row: type badge + est time ── */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
              typeMeta.colorClasses
            )}
          >
            {typeMeta.label}
          </span>

          <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <ClockIcon />
            {module.estMinutes} min
          </span>
        </div>

        {/* ── Title ── */}
        <h3
          className={cn(
            "text-slate-900 font-semibold text-sm leading-snug",
            "group-hover:text-sky-700 transition-colors duration-150"
          )}
        >
          {module.title}
        </h3>

        {/* ── Overview snippet ── */}
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
          {module.overview}
        </p>

        {/* ── Tags ── */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Tags">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-xs">
                +{hiddenTagCount}
              </span>
            )}
          </div>
        )}

        {/* ── Mastery bar (only if attempted) ── */}
        {hasProgress ? (
          <div className="pt-1 border-t border-slate-100">
            <MasteryBar value={mastery} showLabel />
          </div>
        ) : (
          <div className="pt-1 border-t border-slate-100">
            <span className="text-xs text-slate-400 italic">Not started</span>
          </div>
        )}

      </div>
    </Link>
  );
}