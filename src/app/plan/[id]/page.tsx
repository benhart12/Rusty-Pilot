// ============================================================
// RustyPilot Refresh — Plan Detail Page (/plan/[id])
//
// Shows a generated study plan with all 4 sections.
// Supports:
//   - Live plans: fetched from Firestore
//   - Demo plans: read from sessionStorage at /plan/demo
//
// Each section is rendered via PlanSectionView.
// Print styles are included via a <style> tag for a clean
// black-and-white layout when the pilot prints the page.
// ============================================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getStudyPlan } from "@/data/plans";
import { ROUTES } from "@/lib/routes";
import { StudyPlan } from "@/types/domain";
import { rustLevel } from "@/lib/scoring";
import AppShell from "@/components/AppShell";
import PlanSectionView from "@/components/PlanSectionView";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Print styles (injected once, scoped with .plan-print-root)
// ─────────────────────────────────────────────────────────────

const PRINT_STYLES = `
@media print {
  /* Hide nav, CTAs, and non-content chrome */
  header, nav, .no-print { display: none !important; }

  /* Reset page background */
  body, .plan-print-root { background: white !important; color: black !important; }

  /* Plan title block */
  .plan-print-root h1 { font-size: 20pt; margin-bottom: 6pt; }
  .plan-print-root .plan-meta { font-size: 9pt; color: #555; margin-bottom: 12pt; }

  /* Section cards */
  .plan-print-root section {
    border: 1pt solid #ccc !important;
    border-radius: 0 !important;
    background: white !important;
    break-inside: avoid;
    margin-bottom: 12pt;
  }

  /* Section headings */
  .plan-print-root section h3 { font-size: 11pt; font-weight: bold; }

  /* Item rows */
  .plan-print-root ol li a {
    color: black !important;
    text-decoration: none;
  }
  .plan-print-root ol li a::after {
    content: " (" attr(href) ")";
    font-size: 8pt;
    color: #777;
  }

  /* Footer note */
  .plan-print-footer {
    font-size: 8pt;
    color: #777;
    border-top: 1pt solid #ccc;
    padding-top: 8pt;
    margin-top: 16pt;
  }
}
`;

// ─────────────────────────────────────────────────────────────
// Metadata strip
// ─────────────────────────────────────────────────────────────

function PlanMeta({ plan }: { plan: StudyPlan }) {
  const rust = plan.inputs.daysSinceLastFlight != null
    ? rustLevel(plan.inputs.daysSinceLastFlight)
    : null;

  const metaItems: { label: string; value: string }[] = [
    { label: "Aircraft",    value: plan.inputs.aircraftVariantId },
    { label: "Airport",     value: plan.inputs.airportType === "towered"
        ? `Towered${plan.inputs.airspace ? ` Class ${plan.inputs.airspace}` : ""}`
        : "Non-towered" },
    ...(rust ? [{ label: "Rust level", value: rust.label }] : []),
    { label: "Est. time",   value: `~${plan.estTotalMinutes} min` },
    { label: "Sections",    value: String(plan.sections.length) },
    { label: "Created",     value: new Date(plan.createdAt).toLocaleDateString() },
  ];

  return (
    <dl className={cn("flex flex-wrap gap-x-6 gap-y-2 plan-meta")}>
      {metaItems.map(({ label, value }) => (
        <div key={label} className="flex gap-1.5 items-baseline">
          <dt className="text-xs text-slate-400 font-medium">{label}:</dt>
          <dd className="text-xs text-slate-700 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const isDemo = id === "demo";

  const [plan, setPlan]         = useState<StudyPlan | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo) {
          // Read from sessionStorage (set by /scenario in demo mode)
          const raw = sessionStorage.getItem("rustypilot_demo_plan");
          if (!raw) {
            setError("No demo plan found. Please generate one from the scenario wizard.");
            return;
          }
          const parsed = JSON.parse(raw) as Omit<StudyPlan, "id">;
          setPlan({ ...parsed, id: "demo" });
          return;
        }

        // Authenticated plan
        if (!user) {
          // Auth still loading — will retry when user resolves
          return;
        }
        const fetched = await getStudyPlan(user.uid, id);
        if (!fetched) {
          setError("Plan not found. It may have been deleted.");
          return;
        }
        setPlan(fetched);
      } catch (err) {
        setError(`Failed to load plan: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      load();
    }
  }, [id, user, authLoading, isDemo]);

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-2xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={4} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (error || !plan) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-xl mx-auto pt-8">
          <EmptyState
            title="Plan not found"
            description={error ?? "This plan doesn't exist or you don't have access to it."}
            actionLabel="Build a new plan"
            onAction={() => router.push(ROUTES.scenario)}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <>
      {/* Inject print styles once */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <AppShell user={user ?? null}>
        <div className={cn("max-w-2xl mx-auto flex flex-col gap-6 plan-print-root")}>

          {/* ── Header ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4 flex-wrap no-print">
              <div className="flex items-center gap-2">
                {isDemo && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                    Demo
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                >
                  ← Back
                </Button>
              </div>

              {/* Print button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="no-print"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print
              </Button>
            </div>

            {/* Plan title */}
            <div>
              <h1 className="text-slate-900 font-bold text-2xl leading-tight">
                {plan.title}
              </h1>
              <div className="mt-2">
                <PlanMeta plan={plan} />
              </div>
            </div>
          </div>

          {/* ── Sections ── */}
          {plan.sections.length === 0 ? (
            <EmptyState
              title="No sections in this plan"
              description="This plan has no study sections. Try generating a new one."
              actionLabel="Build a new plan"
              onAction={() => router.push(ROUTES.scenario)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {plan.sections.map((section) => (
                <PlanSectionView key={section.title} section={section} />
              ))}
            </div>
          )}

          {/* ── CTAs ── */}
          <div className={cn("flex flex-col sm:flex-row gap-3 no-print")}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/drill/session?planId=${plan.id}`)}
              className="flex-1"
            >
              Start drills →
            </Button>

            {!isDemo && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(ROUTES.modules)}
              >
                Browse modules
              </Button>
            )}

            {isDemo && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push(ROUTES.login)}
              >
                Save this plan — Sign up free
              </Button>
            )}
          </div>

          {/* ── Print footer ── */}
          <footer className="plan-print-footer hidden">
            <p>RustyPilot Refresh — for study purposes only. Not a substitute for FAA-approved training or a CFI.</p>
            <p>Generated: {new Date(plan.createdAt).toLocaleString()}</p>
          </footer>

        </div>
      </AppShell>
    </>
  );
}