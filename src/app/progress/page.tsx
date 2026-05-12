// ============================================================
// RustyPilot Refresh — Progress Page (/progress)
//
// Shows:
//   - Study streak (consecutive days with attempts)
//   - Recent activity timeline (last 7 days)
//   - Module mastery breakdown (by type)
//   - Recent drill attempts (last 10)
//
// Firestore reads:
//   - /users/{uid}/attempts (last 30 days)
//   - /userProgress/{uid}/modules (all)
//
// Charts are pure CSS — no external libraries.
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listRecentAttempts } from "@/data/progress";
import { queryCollection } from "@/lib/firestore";
import { moduleRoute, ROUTES } from "@/lib/routes";
import { AttemptRecord, UserModuleProgress, ModuleType } from "@/types/domain";
import AppShell from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import MasteryBar from "@/components/MasteryBar";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  return new Date(iso);
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

/** Compute consecutive day streak from attempts (most recent to oldest) */
function computeStreak(attempts: AttemptRecord[]): number {
  if (attempts.length === 0) return 0;

  const uniqueDays = new Set(attempts.map((a) => dateKey(parseDate(a.answeredAt))));
  const sorted = Array.from(uniqueDays).sort().reverse(); // newest first

  const today = dateKey(new Date());
  if (!sorted.includes(today) && sorted[0] !== today) {
    // No activity today — check if yesterday (allows 1-day gap for forgiveness)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (sorted[0] !== dateKey(yesterday)) return 0;
  }

  let streak = 0;
  let expected = new Date();
  for (const day of sorted) {
    if (dateKey(expected) === day) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Last 7 days activity counts */
function activityLast7Days(attempts: AttemptRecord[]): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    counts.set(dateKey(d), 0);
  }

  attempts.forEach((a) => {
    const k = dateKey(parseDate(a.answeredAt));
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color = "sky" }: {
  label: string; value: string | number; icon: React.ReactNode; color?: "sky" | "emerald" | "amber";
}) {
  const colors = {
    sky:     "bg-sky-100 text-sky-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber:   "bg-amber-100 text-amber-600",
  };

  return (
    <Card variant="flat">
      <CardBody className="py-4 flex items-center gap-3">
        <div className={cn("shrink-0 p-2.5 rounded-full", colors[color])}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity bar chart (CSS-only)
// ─────────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-1.5 h-24">
      {data.map(({ date, count }) => {
        const height = max > 0 ? (count / max) * 100 : 0;
        const d = new Date(date);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });

        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative" style={{ height: "100%" }}>
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300",
                  count > 0 ? "bg-sky-500" : "bg-slate-100"
                )}
                style={{ height: `${height}%` }}
                aria-label={`${label}: ${count} drill${count !== 1 ? "s" : ""}`}
                title={`${label}: ${count} drill${count !== 1 ? "s" : ""}`}
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mastery by type breakdown
// ─────────────────────────────────────────────────────────────

function MasteryBreakdown({ progress }: { progress: UserModuleProgress[] }) {
  const byType: Record<ModuleType, number[]> = {
    system: [], procedure: [], airportOps: [], emergency: [],
  };

  // Group mastery scores by type (requires knowing module type — we'll infer from tags or default)
  // For simplicity, we'll just show all modules in one list sorted by mastery
  const sorted = [...progress]
    .filter((p) => p.attemptCount > 0)
    .sort((a, b) => a.mastery - b.mastery);

  const top = sorted.slice(-5).reverse(); // top 5
  const bottom = sorted.slice(0, 5);      // bottom 5

  return (
    <div className="flex flex-col gap-4">
      {/* Top performers */}
      {top.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-2">
            Strongest areas
          </p>
          <div className="flex flex-col gap-1.5">
            {top.map((p) => (
              <a
                key={p.moduleId}
                href={moduleRoute(p.moduleId)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100",
                  "hover:bg-emerald-100 transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                )}
              >
                <span className="flex-1 text-sm text-slate-700 truncate">{p.moduleId}</span>
                <span className="text-xs font-semibold text-emerald-700 tabular-nums">{p.mastery}%</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Needs work */}
      {bottom.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">
            Needs more work
          </p>
          <div className="flex flex-col gap-1.5">
            {bottom.map((p) => (
              <a
                key={p.moduleId}
                href={moduleRoute(p.moduleId)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100",
                  "hover:bg-amber-100 transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                )}
              >
                <span className="flex-1 text-sm text-slate-700 truncate">{p.moduleId}</span>
                <span className="text-xs font-semibold text-amber-700 tabular-nums">{p.mastery}%</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [attempts, setAttempts]       = useState<AttemptRecord[]>([]);
  const [progress, setProgress]       = useState<UserModuleProgress[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch last 50 attempts (covers ~30 days for active users)
        const [recentAttempts, allProgress] = await Promise.all([
          listRecentAttempts(user!.uid, 50),
          queryCollection<UserModuleProgress>(`userProgress/${user!.uid}/modules`),
        ]);

        setAttempts(recentAttempts);
        setProgress(allProgress);
      } catch (err) {
        setError(`Failed to load progress: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const streak = computeStreak(attempts);
  const activity7d = activityLast7Days(attempts);
  const totalAttempts = attempts.length;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-3xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <div className="grid sm:grid-cols-3 gap-3">
            <LoadingState lines={2} />
            <LoadingState lines={2} />
            <LoadingState lines={2} />
          </div>
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <AppShell user={user}>
        <div className="max-w-xl mx-auto pt-8">
          <EmptyState
            title="Couldn't load progress"
            description={error}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </AppShell>
    );
  }

  // ── Empty state ──
  if (attempts.length === 0 && progress.length === 0) {
    return (
      <AppShell user={user}>
        <div className="max-w-xl mx-auto pt-12">
          <EmptyState
            title="No progress yet"
            description="Complete your first drill session to start tracking your mastery scores and study streaks."
            actionLabel="Browse modules"
            onAction={() => router.push(ROUTES.modules)}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Progress</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your study streak, mastery scores, and recent drill performance.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Current Streak"
            value={`${streak} day${streak !== 1 ? "s" : ""}`}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
            }
            color="emerald"
          />

          <StatCard
            label="Total Drills"
            value={totalAttempts}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            }
            color="sky"
          />

          <StatCard
            label="Avg Score"
            value={`${avgScore}%`}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
            color="amber"
          />
        </div>

        {/* ── Activity chart ── */}
        <Card variant="default">
          <CardHeader>
            <CardTitle as="h2">Last 7 days</CardTitle>
          </CardHeader>
          <CardBody className="pt-0 pb-4">
            <ActivityChart data={activity7d} />
          </CardBody>
        </Card>

        {/* ── Mastery breakdown ── */}
        {progress.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle as="h2">Module mastery</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <MasteryBreakdown progress={progress} />
            </CardBody>
          </Card>
        )}

        {/* ── Recent attempts ── */}
        {attempts.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle as="h2">Recent drills</CardTitle>
                <span className="text-xs text-slate-400">Last 10</span>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="flex flex-col gap-2">
                {attempts.slice(0, 10).map((att) => {
                  const date = parseDate(att.answeredAt);
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{att.moduleId}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="shrink-0 w-20">
                        <MasteryBar value={att.score} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

      </div>
    </AppShell>
  );
}