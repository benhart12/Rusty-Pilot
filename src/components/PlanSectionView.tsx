// ============================================================
// RustyPilot Refresh — PlanSectionView Component
//
// Renders a single PlanSection from a generated study plan.
// Each item links to either:
//   - a specific module detail page (kind:"module")
//   - a filtered module list by tag (kind:"tagGroup")
//
// Purely presentational — no data fetching, no state.
//
// Usage:
//   {plan.sections.map((section) => (
//     <PlanSectionView key={section.title} section={section} />
//   ))}
// ============================================================

import Link from "next/link";
import { PlanSection, PlanItem } from "@/types/domain";
import { module as moduleRoute } from "@/lib/routes";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface PlanSectionViewProps {
  section: PlanSection;
  /** Additional classes on the outer wrapper */
  className?: string;
}

// ------------------------------------------------------------
// Item href resolver
// ------------------------------------------------------------

function resolveHref(item: PlanItem): string {
  if (item.kind === "module") {
    return moduleRoute(item.moduleId);
  }
  // tag-based item — link to module library filtered by tag
  return `/modules?tag=${encodeURIComponent(item.tag)}`;
}

function resolveLabel(item: PlanItem): string {
  if (item.kind === "module") {
    // The moduleId is used as a label fallback; the calling page
    // can pass a pre-resolved ContentModule if richer labels are needed,
    // but keeping this component dependency-free means we use what's in PlanItem.
    return item.moduleId;
  }
  return item.label;
}

// ------------------------------------------------------------
// Arrow icon (inline SVG)
// ------------------------------------------------------------

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
      className={cn("w-4 h-4 shrink-0", className)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ------------------------------------------------------------
// Tag icon (inline SVG)
// ------------------------------------------------------------

function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
      className={cn("w-3.5 h-3.5 shrink-0", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

// ------------------------------------------------------------
// Item row
// ------------------------------------------------------------

interface ItemRowProps {
  item: PlanItem;
  index: number;
}

function ItemRow({ item, index }: ItemRowProps) {
  const href = resolveHref(item);
  const label = resolveLabel(item);
  const isModule = item.kind === "module";
  const isTag = item.kind === "tagGroup";

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5",
          "border border-transparent",
          "hover:border-slate-200 hover:bg-slate-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
          "transition-colors duration-100"
        )}
      >
        {/* Step number */}
        <span
          className={cn(
            "flex items-center justify-center shrink-0",
            "w-6 h-6 rounded-full text-xs font-semibold",
            isModule && "bg-sky-100 text-sky-700",
            isTag    && "bg-slate-100 text-slate-500",
          )}
          aria-hidden="true"
        >
          {index + 1}
        </span>

        {/* Label */}
        <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 leading-snug transition-colors duration-100">
          {label}
        </span>

        {/* Kind indicator */}
        <span className="shrink-0 flex items-center gap-1">
          {isTag && (
            <TagIcon className="text-slate-300 group-hover:text-slate-400" />
          )}
          <ArrowRightIcon className="text-slate-300 group-hover:text-sky-500 transition-colors duration-100" />
        </span>
      </Link>
    </li>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

export default function PlanSectionView({
  section,
  className,
}: PlanSectionViewProps) {
  if (section.items.length === 0) return null;

  return (
    <section
      aria-labelledby={`plan-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
      className={cn(
        "rounded-xl border border-slate-200 bg-white overflow-hidden",
        className
      )}
    >
      {/* Section header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <h3
          id={`plan-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-sm font-semibold text-slate-900"
        >
          {section.title}
        </h3>
        {section.description && (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
            {section.description}
          </p>
        )}
      </div>

      {/* Item list */}
      <ol
        className="px-2 py-2"
        aria-label={`${section.title} items`}
      >
        {section.items.map((item, index) => (
          <ItemRow
            key={item.kind === "module" ? item.moduleId : `${item.tag}-${index}`}
            item={item}
            index={index}
          />
        ))}
      </ol>
    </section>
  );
}