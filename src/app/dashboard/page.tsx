// ============================================================
// RustyPilot Refresh — Dashboard (/dashboard)
//
// Shows the pilot's current rust level, recent module progress,
// and weak areas for targeted review.
//
// Data reads:
//   - /users/{uid}                      → profile
//   - /userProgress/{uid}/modules       → all module progress records
//   - /modules/{moduleId}               → module details for progress items
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getUserProfile } from "@/lib/user";
import { daysSince, rustLevel } from "@/lib/scoring";
import { queryCollection } from "@/lib/firestore";
import { getModule } from "@/data/modules";
import { ROUTES, module as moduleRoute } from "@/lib/routes";
import { UserProfile, UserModuleProgress, ContentModule } from "@/types/domain";
import AppShell from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import MasteryBar from "@/components/MasteryBar";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface ProgressWithModule {
  progress: UserModuleProgress;
  module: ContentModule | null;
}

// ------------------------------------------------------------
// Rust level colors
// ------------------------------------------------------------

const rustColorMap = {
  green:  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" },
  yellow: { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-800"   },
  orange: { bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  badge: "bg-orange-100 text-orange-800" },
  red:    { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     badge: "bg-red-100 text-red-800"      },
};

// ------------------------------------------------------------
// RustCard
// ------------------------------------------------------------

function RustCard({ profile }: { profile: UserProfile }) {
  const days = profile.lastFlightDate ? daysSince(profile.lastFlightDate) : null;
  const rust = days !== null ? rustLevel(days) : null;
  const colors = rust ? rustColorMap[rust.colorHint] : rustColorMap.red;

  return (
    <Card variant="flat" className={cn("border", colors.border, colors.bg)}>
      <CardBody className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
              Rust Level
            </p>
            {rust ? (
              <>
                <p className={cn("text-2xl font-bold mb-1", colors.text)}>
                  {rust.label}
                </p>
                <p className="text-sm text-slate-600 leading-snug">
                  {rust.explanation}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {days === 0
                    ? "You flew today."
                    : `${days} day${days === 1 ? "" : "s"} since last flight.`}
                </p>
              </>
            ) : (
              <>
                <p className={cn("text-2xl font-bold mb-1", colors.text)}>Unknown</p>
                <p className="text-sm text-slate-600 leading-snug">
                  Add your last flight date in Settings to see your rust level.
                </p>
              </>
            )}
          </div>

          {/* Gauge icon */}
          <div className={cn("shrink-0 p-2 rounded-full", colors.badge)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 2a10 10 0 110 20A10 10 0 0112 2z" />
            </svg>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ------------------------------------------------------------
// NextFlightCard
// ------------------------------------------------------------

function NextFlightCard({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const scenarioHref = profile.defaultAircraftVariantId
    ? `${ROUTES.scenario}?variant=${encodeURIComponent(profile.defaultAircraftVariantId)}`
    : ROUTES.scenario;

  return (
    <Card variant="default">
      <CardBody className="py-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2 rounded-full bg-sky-100 text-sky-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
              Next flight
            </p>
            <p className="text-slate-900 font-semibold text-base mb-1">
              Build your preflight plan
            </p>
            <p className="text-slate-500 text-sm leading-snug">
              Answer a few questions about your upcoming flight and get a personalized study plan in under a minute.
            </p>
          </div>
        </div>
      </CardBody>
      <CardFooter>
        <Button
          variant="primary"
          size="md"
          onClick={() => router.push(scenarioHref)}
        >
          Build a study plan
        </Button>
      </CardFooter>
    </Card>
  );
}

// ------------------------------------------------------------
// ModuleProgressRow
// ------------------------------------------------------------

function ModuleProgressRow({ item }: { item: ProgressWithModule }) {
  const { progress, module: mod } = item;
  if (!mod) return null;

  return (
    <a
      href={moduleRoute(mod.id)}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200",
        "hover:border-slate-300 hover:bg-slate-50 transition-colors duration-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      )}
      aria-label={`${mod.title}, mastery ${progress.mastery}%`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{mod.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Last reviewed {new Date(progress.lastTouchedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="w-28 shrink-0">
        <MasteryBar value={progress.mastery} showLabel />
      </div>
    </a>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [allProgress, setAllProgress] = useState<UserModuleProgress[]>([]);
  const [recentItems, setRecentItems] = useState<ProgressWithModule[]>([]);
  const [weakItems, setWeakItems]     = useState<ProgressWithModule[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setDataLoading(true);
      setError(null);

      try {
        // Parallel: profile + all progress records
        const [prof, progressRecords] = await Promise.all([
          getUserProfile(user!.uid),
          queryCollection<UserModuleProgress>(
            `userProgress/${user!.uid}/modules`,
            { orderBy: { field: "lastTouchedAt", direction: "desc" } }
          ),
        ]);

        setProfile(prof);
        setAllProgress(progressRecords);

        // Hydrate module details for recent (top 3 by lastTouchedAt)
        const recent = progressRecords
          .filter((p) => p.attemptCount > 0)
          .slice(0, 3);

        // Hydrate module details for weak areas (lowest mastery, min 1 attempt)
        const attempted = progressRecords.filter((p) => p.attemptCount > 0);
        const weak = [...attempted]
          .sort((a, b) => a.mastery - b.mastery)
          .slice(0, 3);

        // Deduplicate: if a module appears in both, show it once (recent wins)
        const weakDeduped = weak.filter(
          (w) => !recent.find((r) => r.moduleId === w.moduleId)
        );

        // Parallel module fetches
        const [recentModules, weakModules] = await Promise.all([
          Promise.all(recent.map((p) => getModule(p.moduleId))),
          Promise.all(weakDeduped.map((p) => getModule(p.moduleId))),
        ]);

        setRecentItems(recent.map((p, i) => ({ progress: p, module: recentModules[i] })));
        setWeakItems(weakDeduped.map((p, i) => ({ progress: p, module: weakModules[i] })));
      } catch (err) {
        setError(`Failed to load dashboard: ${(err as Error).message}`);
      } finally {
        setDataLoading(false);
      }
    }

    load();
  }, [user]);

  // ── Auth loading ──
  if (authLoading) {
    return (
      <AppShell user={null}>
        <div className="max-w-2xl mx-auto pt-8">
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <AppShell user={user}>
        <div className="max-w-2xl mx-auto pt-8">
          <EmptyState
            title="Couldn't load dashboard"
            description={error}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </AppShell>
    );
  }

  // ── Data loading ──
  if (dataLoading) {
    return (
      <AppShell user={user}>
        <div className="max-w-2xl mx-auto pt-8 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={3} />
          <LoadingState lines={3} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Greeting */}
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">
            {profile?.displayName ? `Welcome back, ${profile.displayName.split(" ")[0]}.` : "Welcome back."}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here&apos;s where you stand before your next flight.
          </p>
        </div>

        {/* Top cards: rust + next flight */}
        <div className="grid sm:grid-cols-2 gap-4">
          {profile && <RustCard profile={profile} />}
          {profile && <NextFlightCard profile={profile} />}
        </div>

        {/* Continue drilling */}
        <section aria-labelledby="continue-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="continue-heading" className="text-slate-900 font-semibold text-base">
              Continue drilling
            </h2>
            <button
              type="button"
              onClick={() => router.push(ROUTES.modules)}
              className="text-xs text-sky-600 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
            >
              All modules →
            </button>
          </div>

          {recentItems.length === 0 ? (
            <EmptyState
              title="No drills started yet"
              description="Pick a module from the library to begin building your mastery scores."
              actionLabel="Browse modules"
              onAction={() => router.push(ROUTES.modules)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentItems.map((item) => (
                <ModuleProgressRow
                  key={item.progress.moduleId}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>

        {/* Weak areas */}
        {weakItems.length > 0 && (
          <section aria-labelledby="weak-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="weak-heading" className="text-slate-900 font-semibold text-base">
                Weak areas
              </h2>
              <span className="text-xs text-slate-400">Lowest mastery scores</span>
            </div>

            <div className="flex flex-col gap-2">
              {weakItems.map((item) => (
                <ModuleProgressRow
                  key={item.progress.moduleId}
                  item={item}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state for brand-new users with no progress anywhere */}
        {recentItems.length === 0 && weakItems.length === 0 && allProgress.length === 0 && (
          <Card variant="flat">
            <CardBody className="py-8 text-center">
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                You haven&apos;t completed any drills yet. Build a study plan or browse the module library to get started.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button variant="primary" size="sm" onClick={() => router.push(ROUTES.scenario)}>
                  Build a plan
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.push(ROUTES.modules)}>
                  Browse modules
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

      </div>
    </AppShell>
  );
}