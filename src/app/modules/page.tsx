// ============================================================
// RustyPilot Refresh — Module Library (/modules)
//
// Tabs:  Systems | Procedures | Airport Ops | Emergencies
// Filters: tag chips populated dynamically from visible modules
//
// Firestore reads:
//   - modules collection (filtered by type per tab)
//   - userProgress/{uid}/modules (all, once — then join client-side)
//
// Performance notes for 100+ modules:
//   - Data is fetched per-tab (lazy) and cached in Map state
//   - Tag filtering is pure in-memory after initial fetch
//   - Rendered list is windowed manually: slice to MAX_VISIBLE,
//     with a "Show more" button — no external virtualizer needed
//     at typical module counts (<500).
// ============================================================

"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listModules } from "@/data/modules";
import { queryCollection } from "@/lib/firestore";
import { moduleRoute } from "@/lib/routes";
import { ContentModule, ModuleType, UserModuleProgress } from "@/types/domain";
import AppShell from "@/components/AppShell";
import ModuleTile from "@/components/ModuleTile";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20; // Show N tiles at a time before "Show more"

// Tab config
const TABS: { id: ModuleType; label: string; emoji: string }[] = [
  { id: "system",     label: "Systems",     emoji: "⚙️" },
  { id: "procedure",  label: "Procedures",  emoji: "📋" },
  { id: "airportOps", label: "Airport Ops", emoji: "🗼" },
  { id: "emergency",  label: "Emergencies", emoji: "🚨" },
];

// Well-known tag groups per type (populate chips initially)
const TAG_SUGGESTIONS: Record<ModuleType, string[]> = {
  system:     ["fuel", "electrical", "pitot-static", "engine", "instruments"],
  procedure:  ["startup", "runup", "crosswind", "short-field", "soft-field", "night-ops"],
  airportOps: ["towered", "ctaf", "radio", "pattern", "class-d", "class-b"],
  emergency:  ["engine-failure", "forced-landing", "electrical-failure", "fire", "mayday"],
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Extract all unique tags from a list of modules */
function extractTags(modules: ContentModule[]): string[] {
  const set = new Set<string>();
  modules.forEach((m) => m.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

/** Client-side filter: match module against search query + selected tags */
function filterModules(
  modules: ContentModule[],
  query: string,
  activeTags: Set<string>
): ContentModule[] {
  const q = query.trim().toLowerCase();

  return modules.filter((m) => {
    // Tag filter — module must include ALL selected tags
    if (activeTags.size > 0) {
      const hasAllTags = Array.from(activeTags).every((t) => m.tags.includes(t));
      if (!hasAllTags) return false;
    }

    // Search filter — match title, overview, or any tag
    if (q) {
      const searchable = [m.title, m.overview, ...m.tags].join(" ").toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────────
// Tag chip
// ─────────────────────────────────────────────────────────────

function TagChip({
  tag, active, onClick,
}: {
  tag: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        active
          ? "bg-sky-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {tag}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Inner page (uses useSearchParams)
// ─────────────────────────────────────────────────────────────

function ModulesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useRequireAuth();

  // URL param: ?tag=xyz pre-selects a chip
  const tagParam = searchParams.get("tag");

  // Tab state
  const [activeType, setActiveType] = useState<ModuleType>("system");

  // Per-tab data cache: Map<ModuleType, ContentModule[]>
  const [moduleCache, setModuleCache] = useState<Map<ModuleType, ContentModule[]>>(new Map());
  const [loadingTab, setLoadingTab]   = useState(false);
  const [tabError, setTabError]       = useState<string | null>(null);

  // Progress cache (loaded once)
  const [progressMap, setProgressMap] = useState<Map<string, UserModuleProgress>>(new Map());
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags]   = useState<Set<string>>(
    tagParam ? new Set([tagParam]) : new Set()
  );

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Load progress once (independent of tab)
  useEffect(() => {
    if (!user || progressLoaded) return;
    queryCollection<UserModuleProgress>(`userProgress/${user.uid}/modules`)
      .then((records) => {
        const map = new Map<string, UserModuleProgress>();
        records.forEach((r) => map.set(r.moduleId, r));
        setProgressMap(map);
      })
      .catch(() => {/* Non-fatal — progress just won't show */})
      .finally(() => setProgressLoaded(true));
  }, [user, progressLoaded]);

  // Load modules for active tab (lazy per tab)
  useEffect(() => {
    if (moduleCache.has(activeType)) return; // already fetched

    setLoadingTab(true);
    setTabError(null);

    listModules({ type: activeType })
      .then((mods) => {
        setModuleCache((prev) => new Map(prev).set(activeType, mods));
      })
      .catch((err) => setTabError(`Failed to load modules: ${(err as Error).message}`))
      .finally(() => setLoadingTab(false));
  }, [activeType, moduleCache]);

  // Reset pagination + tags when switching tabs
  function switchTab(type: ModuleType) {
    setActiveType(type);
    setActiveTags(new Set());
    setSearchQuery("");
    setVisibleCount(PAGE_SIZE);
  }

  // Toggle a tag chip
  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  }

  // Current tab's modules
  const rawModules = moduleCache.get(activeType) ?? [];

  // All unique tags in current tab (for chips)
  const availableTags = useMemo(
    () => extractTags(rawModules.length ? rawModules : []),
    [rawModules]
  );

  // Merge with suggestion list so chips appear even before fetch
  const displayTags = useMemo(() => {
    const combined = new Set([...TAG_SUGGESTIONS[activeType], ...availableTags]);
    return Array.from(combined).sort();
  }, [activeType, availableTags]);

  // Filtered module list
  const filteredModules = useMemo(
    () => filterModules(rawModules, searchQuery, activeTags),
    [rawModules, searchQuery, activeTags]
  );

  // Sliced for pagination
  const visibleModules = filteredModules.slice(0, visibleCount);
  const hasMore = filteredModules.length > visibleCount;

  // ── Auth loading ──
  if (authLoading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-4xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-4xl mx-auto flex flex-col gap-5">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Module Library</h1>
          <p className="text-slate-500 text-sm mt-1">
            Study individual systems, procedures, and operations. Your mastery scores update after every drill session.
          </p>
        </div>

        {/* ── Type tabs ── */}
        <div
          role="tablist"
          aria-label="Module types"
          className="flex gap-1 border-b border-slate-200"
        >
          {TABS.map(({ id, label, emoji }) => {
            const isActive = activeType === id;
            const count = moduleCache.get(id)?.length;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${id}`}
                onClick={() => switchTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium",
                  "border-b-2 -mb-px transition-colors duration-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-t",
                  isActive
                    ? "border-sky-500 text-sky-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <span className="hidden sm:inline" aria-hidden="true">{emoji}</span>
                {label}
                {count !== undefined && (
                  <span className={cn(
                    "ml-1 text-xs px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + tag filters ── */}
        <div className="flex flex-col gap-3">
          {/* Search box */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-4 h-4 text-slate-400">
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5l4 4" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder={`Search ${TABS.find(t => t.id === activeType)?.label.toLowerCase()} modules…`}
              className={cn(
                "w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm",
                "text-slate-900 placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
                "transition-colors duration-150"
              )}
              aria-label="Search modules"
            />
          </div>

          {/* Tag chips */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
              {displayTags.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  active={activeTags.has(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
              {activeTags.size > 0 && (
                <button
                  type="button"
                  onClick={() => { setActiveTags(new Set()); setVisibleCount(PAGE_SIZE); }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear filters ✕
                </button>
              )}
            </div>
          )}

          {/* Result count */}
          <p className="text-xs text-slate-400" aria-live="polite" aria-atomic="true">
            {loadingTab
              ? "Loading…"
              : `${filteredModules.length} module${filteredModules.length !== 1 ? "s" : ""}${activeTags.size > 0 || searchQuery ? " matching filters" : ""}`}
          </p>
        </div>

        {/* ── Tab panel ── */}
        <div
          id={`panel-${activeType}`}
          role="tabpanel"
          aria-label={`${TABS.find(t => t.id === activeType)?.label} modules`}
        >
          {/* Loading state */}
          {loadingTab && (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <LoadingState key={i} lines={3} />)}
            </div>
          )}

          {/* Error */}
          {!loadingTab && tabError && (
            <EmptyState
              title="Couldn't load modules"
              description={tabError}
              actionLabel="Retry"
              onAction={() => {
                setModuleCache((prev) => { const m = new Map(prev); m.delete(activeType); return m; });
              }}
            />
          )}

          {/* Empty state (no results) */}
          {!loadingTab && !tabError && filteredModules.length === 0 && (
            <EmptyState
              title={activeTags.size > 0 || searchQuery ? "No modules match your filters" : "No modules yet"}
              description={
                activeTags.size > 0 || searchQuery
                  ? "Try removing some filters or broadening your search."
                  : "Modules for this category haven't been loaded yet. Run the dev seed to populate content."
              }
              actionLabel={activeTags.size > 0 || searchQuery ? "Clear filters" : undefined}
              onAction={activeTags.size > 0 || searchQuery ? () => { setActiveTags(new Set()); setSearchQuery(""); } : undefined}
            />
          )}

          {/* Module grid */}
          {!loadingTab && !tabError && visibleModules.length > 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {visibleModules.map((mod) => (
                  <ModuleTile
                    key={mod.id}
                    module={mod}
                    progress={progressMap.get(mod.id) ?? null}
                    href={moduleRoute(mod.id)}
                  />
                ))}
              </div>

              {/* Show more */}
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className={cn(
                      "px-5 py-2 rounded-xl text-sm font-medium",
                      "border border-slate-200 bg-white text-slate-600",
                      "hover:border-slate-300 hover:bg-slate-50 transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    )}
                  >
                    Show more ({filteredModules.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Export — Suspense required for useSearchParams
// ─────────────────────────────────────────────────────────────

export default function ModulesPage() {
  return (
    <Suspense fallback={
      <AppShell user={null}>
        <div className="max-w-4xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    }>
      <ModulesPageInner />
    </Suspense>
  );
}