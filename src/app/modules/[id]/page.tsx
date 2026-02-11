// ============================================================
// RustyPilot Refresh — Module Detail Page (/modules/[id])
//
// Shows:
//   - Module overview + key concepts
//   - Diagram images (from Firebase Storage URLs)
//   - Quick Check Q&A list (expandable)
//   - Three drill CTAs: Flashcards, Flow Rehearsal, Quiz
//
// Firestore reads:
//   - /modules/{moduleId}
//   - /userProgress/{uid}/modules/{moduleId}
//
// Firestore write:
//   - Stamps lastTouchedAt on the progress doc when the page loads
// ============================================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getModule } from "@/data/modules";
import { getUserModuleProgress, setUserModuleProgress } from "@/data/progress";
import { ROUTES } from "@/lib/routes";
import { ContentModule, UserModuleProgress, DrillPrompt } from "@/types/domain";
import AppShell from "@/components/AppShell";
import MasteryBar from "@/components/MasteryBar";
import Button from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Type badge config
// ─────────────────────────────────────────────────────────────

const TYPE_BADGES = {
  system:     { label: "System",      classes: "bg-sky-50 text-sky-700 border border-sky-200" },
  procedure:  { label: "Procedure",   classes: "bg-violet-50 text-violet-700 border border-violet-200" },
  airportOps: { label: "Airport Ops", classes: "bg-amber-50 text-amber-700 border border-amber-200" },
  emergency:  { label: "Emergency",   classes: "bg-red-50 text-red-700 border border-red-200" },
};

// ─────────────────────────────────────────────────────────────
// Drill type config
// ─────────────────────────────────────────────────────────────

interface DrillOption {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  availableFor: Array<DrillPrompt["kind"]>;
}

const DRILL_OPTIONS: DrillOption[] = [
  {
    type: "flashcard",
    label: "Flashcards",
    description: "Flip through key facts and definitions",
    availableFor: ["flashcard"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" />
      </svg>
    ),
  },
  {
    type: "flow",
    label: "Flow Rehearsal",
    description: "Step through procedures in order",
    availableFor: ["flowStep"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M3 6.75h.008v.008H3V6.75zm0 5.25h.008v.008H3V12zm0 5.25h.008v.008H3v-.008z" />
      </svg>
    ),
  },
  {
    type: "quiz",
    label: "Quiz",
    description: "Multiple choice questions and scenarios",
    availableFor: ["mcq", "branch"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// Expandable Quick Check item
// ─────────────────────────────────────────────────────────────

function QuickCheckItem({
  question, answer, index,
}: {
  question: string; answer: string; index: number;
}) {
  const [open, setOpen] = useState(false);
  const id = `qc-${index}`;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          "w-full flex items-start justify-between gap-3 px-4 py-3 text-left",
          "hover:bg-slate-50 transition-colors duration-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset"
        )}
      >
        <span className="text-sm font-medium text-slate-800 leading-snug flex-1">
          <span className="text-slate-400 font-mono text-xs mr-2">Q{index + 1}</span>
          {question}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth={2} stroke="currentColor" aria-hidden="true"
          className={cn("w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150", open && "rotate-180")}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id={id}
          className="px-4 pb-4 pt-1 bg-sky-50 border-t border-sky-100"
        >
          <p className="text-xs font-medium text-sky-600 uppercase tracking-widest mb-1">Answer</p>
          <p className="text-sm text-slate-700 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Drill card
// ─────────────────────────────────────────────────────────────

function DrillCard({
  option, moduleId, available,
}: {
  option: DrillOption; moduleId: string; available: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => router.push(`/drill/${option.type}?moduleId=${encodeURIComponent(moduleId)}`)}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        available
          ? "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50 hover:shadow-sm cursor-pointer"
          : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-50"
      )}
      aria-disabled={!available}
      title={!available ? "No drill prompts of this type for this module" : undefined}
    >
      <div className={cn("text-sky-600", !available && "text-slate-400")}>{option.icon}</div>
      <div>
        <p className={cn("text-sm font-semibold", available ? "text-slate-900" : "text-slate-400")}>
          {option.label}
        </p>
        <p className="text-xs text-slate-500 leading-snug mt-0.5">{option.description}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: moduleId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [module, setModule]     = useState<ContentModule | null>(null);
  const [progress, setProgress] = useState<UserModuleProgress | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const mod = await getModule(moduleId);
        if (!mod) {
          setError("Module not found.");
          return;
        }
        setModule(mod);

        if (user) {
          // Load progress
          const prog = await getUserModuleProgress(user.uid, moduleId);
          setProgress(prog ?? null);

          // Stamp lastTouchedAt (non-blocking)
          setUserModuleProgress(user.uid, moduleId, {
            lastTouchedAt: new Date().toISOString(),
          }).catch(() => {/* best-effort */});
        }
      } catch (err) {
        setError(`Failed to load module: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) load();
  }, [moduleId, user, authLoading]);

  // Determine which drill types are available for this module
  const availableDrillTypes = new Set(module?.drillPrompts.map((p) => p.kind) ?? []);

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-2xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={5} />
          <LoadingState lines={3} />
        </div>
      </AppShell>
    );
  }

  // ── Error / not found ──
  if (error || !module) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-xl mx-auto pt-8">
          <EmptyState
            title="Module not found"
            description={error ?? "This module doesn't exist."}
            actionLabel="Back to library"
            onAction={() => router.push(ROUTES.modules)}
          />
        </div>
      </AppShell>
    );
  }

  const typeBadge = TYPE_BADGES[module.type];

  return (
    <AppShell user={user ?? null}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Back + header ── */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-slate-500 hover:text-slate-700 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
          >
            ← Back to library
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeBadge.classes)}>
                  {typeBadge.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                  </svg>
                  {module.estMinutes} min
                </span>
              </div>
              <h1 className="text-slate-900 font-bold text-2xl leading-tight">{module.title}</h1>
            </div>
          </div>

          {/* Mastery bar */}
          {progress && progress.attemptCount > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Your mastery</span>
                <span className="text-xs text-slate-400">
                  {progress.attemptCount} attempt{progress.attemptCount !== 1 ? "s" : ""}
                  {progress.lastTouchedAt && ` · last reviewed ${new Date(progress.lastTouchedAt).toLocaleDateString()}`}
                </span>
              </div>
              <MasteryBar value={progress.mastery} showLabel />
            </div>
          )}
        </div>

        {/* ── Overview ── */}
        <Card variant="flat">
          <CardBody className="py-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Overview</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{module.overview}</p>
          </CardBody>
        </Card>

        {/* ── Tags ── */}
        {module.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Module tags">
            {module.tags.map((tag) => (
              <a
                key={tag}
                href={`${ROUTES.modules}?tag=${encodeURIComponent(tag)}`}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  "transition-colors duration-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                )}
              >
                {tag}
              </a>
            ))}
          </div>
        )}

        {/* ── Diagrams ── */}
        {module.diagramUrls && module.diagramUrls.length > 0 && (
          <section aria-labelledby="diagrams-heading">
            <h2 id="diagrams-heading" className="text-sm font-semibold text-slate-700 mb-3">Diagrams</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {module.diagramUrls.map((url, i) => (
                <div key={url} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${module.title} diagram ${i + 1}`}
                    className="w-full object-contain max-h-64"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick Check ── */}
        {module.quickCheck && module.quickCheck.length > 0 && (
          <section aria-labelledby="quickcheck-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="quickcheck-heading" className="text-sm font-semibold text-slate-700">
                Quick Check
              </h2>
              <span className="text-xs text-slate-400">{module.quickCheck.length} question{module.quickCheck.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-col gap-2">
              {module.quickCheck.map((item, i) => (
                <QuickCheckItem
                  key={i}
                  question={item.question}
                  answer={item.answer}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Drill options ── */}
        <section aria-labelledby="drills-heading">
          <div className="flex items-center gap-2 mb-3">
            <h2 id="drills-heading" className="text-sm font-semibold text-slate-700">Start a drill</h2>
            <span className="text-xs text-slate-400">
              ({module.drillPrompts.length} prompt{module.drillPrompts.length !== 1 ? "s" : ""} available)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {DRILL_OPTIONS.map((opt) => {
              const available = opt.availableFor.some((kind) => availableDrillTypes.has(kind));
              return (
                <DrillCard
                  key={opt.type}
                  option={opt}
                  moduleId={moduleId}
                  available={available}
                />
              );
            })}
          </div>
        </section>

        {/* ── Primary "Start drills" CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => {
              // Default to quiz if available, else flashcard, else flow
              const defaultType = availableDrillTypes.has("mcq") || availableDrillTypes.has("branch")
                ? "quiz"
                : availableDrillTypes.has("flashcard")
                  ? "flashcard"
                  : "flow";
              router.push(`/drill/${defaultType}?moduleId=${encodeURIComponent(moduleId)}`);
            }}
          >
            Start drills →
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => router.push(ROUTES.modules)}
          >
            Back to library
          </Button>
        </div>

      </div>
    </AppShell>
  );
}