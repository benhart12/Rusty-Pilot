// ============================================================
// RustyPilot Refresh — AircraftPicker Component
//
// Searchable, family-grouped aircraft variant picker.
// Pure UI — no Firestore calls. Data is passed in via props.
//
// Usage:
//   <AircraftPicker
//     families={families}
//     variants={variants}
//     value={selectedVariantId}
//     onChange={(id) => setSelectedVariantId(id)}
//   />
// ============================================================

"use client";

import { useState, useMemo, useId } from "react";
import { AircraftFamily, AircraftVariant } from "@/types/domain";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface AircraftPickerProps {
  families: AircraftFamily[];
  variants: AircraftVariant[];
  /** Currently selected variant ID, or null if nothing selected */
  value: string | null;
  /** Called with the selected variant ID when the user picks one */
  onChange: (variantId: string) => void;
  /** Additional classes on the root container */
  className?: string;
}

// ------------------------------------------------------------
// Avionics badge config
// ------------------------------------------------------------

const avionicsBadge: Record<
  AircraftVariant["avionicsType"],
  { label: string; classes: string }
> = {
  steam:  { label: "Steam Gauges", classes: "bg-slate-100 text-slate-600 border border-slate-200" },
  glass:  { label: "Glass Panel",  classes: "bg-sky-50 text-sky-700 border border-sky-200" },
  mixed:  { label: "Mixed",        classes: "bg-violet-50 text-violet-700 border border-violet-200" },
};

// ------------------------------------------------------------
// Search icon (inline SVG)
// ------------------------------------------------------------

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
      className="w-4 h-4 text-slate-400"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5l4 4" />
    </svg>
  );
}

// ------------------------------------------------------------
// Checkmark icon
// ------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
      className="w-4 h-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// ------------------------------------------------------------
// Variant card
// ------------------------------------------------------------

interface VariantCardProps {
  variant: AircraftVariant;
  isSelected: boolean;
  onSelect: () => void;
}

function VariantCard({ variant, isSelected, onSelect }: VariantCardProps) {
  const badge = avionicsBadge[variant.avionicsType];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cn(
        // Base card
        "w-full text-left rounded-xl border px-4 py-3 transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
        // Unselected
        !isSelected && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        // Selected
        isSelected && "border-sky-500 bg-sky-50 ring-1 ring-sky-400",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Name + year + notes */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-semibold leading-snug",
            isSelected ? "text-sky-800" : "text-slate-800"
          )}>
            {variant.name}
            {variant.year && (
              <span className="ml-1.5 font-normal text-slate-400 text-xs">
                ({variant.year})
              </span>
            )}
          </p>

          {variant.notes && (
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
              {variant.notes}
            </p>
          )}

          {/* Tag overrides (variant-specific topics) */}
          {variant.moduleTagOverrides && variant.moduleTagOverrides.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {variant.moduleTagOverrides.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: avionics badge + checkmark */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
              badge.classes
            )}
          >
            {badge.label}
          </span>

          {isSelected && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white">
              <CheckIcon />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

export default function AircraftPicker({
  families,
  variants,
  value,
  onChange,
  className,
}: AircraftPickerProps) {
  const [search, setSearch] = useState("");
  const searchId = useId();

  // Normalize search query
  const query = search.trim().toLowerCase();

  // Filter variants by search query (name, notes, tags)
  const filteredVariants = useMemo<AircraftVariant[]>(() => {
    if (!query) return variants;
    return variants.filter((v) => {
      const searchable = [
        v.name,
        v.notes ?? "",
        ...(v.moduleTagOverrides ?? []),
        v.avionicsType,
        String(v.year ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [variants, query]);

  // Group filtered variants by family
  const groupedByFamily = useMemo<Array<{ family: AircraftFamily; variants: AircraftVariant[] }>>(() => {
    return families
      .map((family) => ({
        family,
        variants: filteredVariants.filter((v) => v.familyId === family.id),
      }))
      .filter((group) => group.variants.length > 0); // hide families with no matches
  }, [families, filteredVariants]);

  const totalVisible = filteredVariants.length;

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="radiogroup"
      aria-label="Select your aircraft"
    >
      {/* Search box */}
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Search aircraft
        </label>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <SearchIcon />
        </span>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, avionics, or tag…"
          className={cn(
            "w-full rounded-lg border border-slate-300 bg-white",
            "pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
            "transition-colors duration-150"
          )}
          aria-controls="aircraft-results"
        />
      </div>

      {/* Results */}
      <div id="aircraft-results" aria-live="polite" aria-atomic="false">
        {totalVisible === 0 ? (
          // Empty state
          <p className="text-center text-sm text-slate-400 py-8">
            No aircraft match{" "}
            <span className="font-medium text-slate-600">&ldquo;{search}&rdquo;</span>.
            Try a different search.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedByFamily.map(({ family, variants: groupVariants }) => (
              <section key={family.id} aria-labelledby={`family-${family.id}`}>
                {/* Family heading */}
                <div className="mb-2 flex items-baseline justify-between">
                  <h4
                    id={`family-${family.id}`}
                    className="text-xs font-semibold uppercase tracking-widest text-slate-400"
                  >
                    {family.manufacturer} — {family.name}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {groupVariants.length} variant{groupVariants.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Variant cards */}
                <div className="flex flex-col gap-2">
                  {groupVariants.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      isSelected={value === variant.id}
                      onSelect={() => onChange(variant.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}