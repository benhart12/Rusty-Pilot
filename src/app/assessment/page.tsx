// ============================================================
// RustyPilot Refresh — Readiness Assessment (/assessment)
//
// Collects currency inputs and computes a 0-100 readiness score.
// Score is deterministic, broken down per factor, and explained
// inline so the pilot understands exactly what drives the result.
//
// Firestore write:
//   /users/{uid}/assessments/{timestamp-id}
//
// CTA after scoring:
//   "Build a plan" → /scenario?daysSince=X&score=Y&variant=Z
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getUserProfile } from "@/lib/user";
import { readinessScore, daysSince, rustLevel, ReadinessResult } from "@/lib/scoring";
import { addDocData } from "@/lib/firestore";
import { userAssessments } from "@/types/firestorePaths";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import { UserProfile } from "@/types/domain";
import AppShell from "@/components/AppShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import MasteryBar from "@/components/MasteryBar";
import LoadingState from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Assessment form state
// ------------------------------------------------------------

interface AssessmentForm {
  lastFlightDate: string;
  landings90: string;
  nightLandings90: string;
  toweredRecent: boolean;
  confidence: number; // 1-5
}

const DEFAULT_FORM: AssessmentForm = {
  lastFlightDate: "",
  landings90: "",
  nightLandings90: "",
  toweredRecent: false,
  confidence: 3,
};

// ------------------------------------------------------------
// Score band UI config
// ------------------------------------------------------------

function scoreBandInfo(score: number): { label: string; color: string; bgColor: string; borderColor: string } {
  if (score >= 80) return { label: "Ready",        color: "text-emerald-700", bgColor: "bg-emerald-50",  borderColor: "border-emerald-200" };
  if (score >= 60) return { label: "Almost there", color: "text-sky-700",     bgColor: "bg-sky-50",      borderColor: "border-sky-200"     };
  if (score >= 40) return { label: "Needs review",  color: "text-amber-700",  bgColor: "bg-amber-50",    borderColor: "border-amber-200"   };
  return               { label: "Ground yourself", color: "text-red-700",     bgColor: "bg-red-50",      borderColor: "border-red-200"     };
}

// ------------------------------------------------------------
// Confidence picker
// ------------------------------------------------------------

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Not confident at all",
  2: "Somewhat uncertain",
  3: "Moderately confident",
  4: "Quite confident",
  5: "Very confident",
};

function ConfidencePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700 mb-3">
        How confident do you feel about flying today?
      </legend>
      <div className="flex gap-2" role="radiogroup" aria-label="Confidence level 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${CONFIDENCE_LABELS[n]}`}
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 h-10 rounded-lg border text-sm font-semibold transition-all duration-100",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              value === n
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500 text-center">{CONFIDENCE_LABELS[value]}</p>
    </fieldset>
  );
}

// ------------------------------------------------------------
// Breakdown table
// ------------------------------------------------------------

function ScoreBreakdown({ result }: { result: ReadinessResult }) {
  return (
    <div className="flex flex-col gap-2" aria-label="Score breakdown">
      {result.breakdown.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 leading-snug">{item.note}</p>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                item.points >= 8 ? "text-emerald-600" :
                item.points >= 4 ? "text-amber-600" :
                "text-red-500"
              )}
            >
              +{item.points}
            </span>
            <span className="text-xs text-slate-400"> pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Result panel
// ------------------------------------------------------------

function ResultPanel({
  result,
  form,
  profile,
  onBuildPlan,
  onRetake,
  saving,
}: {
  result: ReadinessResult;
  form: AssessmentForm;
  profile: UserProfile | null;
  onBuildPlan: () => void;
  onRetake: () => void;
  saving: boolean;
}) {
  const band = scoreBandInfo(result.score);
  const days = form.lastFlightDate ? daysSince(form.lastFlightDate) : null;
  const rust = days !== null ? rustLevel(days) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Score hero */}
      <Card variant="flat" className={cn("border", band.borderColor, band.bgColor)}>
        <CardBody className="py-6 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">
            Readiness Score
          </p>
          <p className={cn("text-6xl font-bold tabular-nums mb-1", band.color)}>
            {result.score}
          </p>
          <p className={cn("text-base font-semibold mb-4", band.color)}>
            {band.label}
          </p>
          <div className="max-w-xs mx-auto">
            <MasteryBar value={result.score} showLabel />
          </div>
          {rust && (
            <p className="mt-3 text-sm text-slate-500">
              Rust level: <span className="font-medium text-slate-700">{rust.label}</span>
              {days !== null && ` · ${days} day${days === 1 ? "" : "s"} since last flight`}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Breakdown */}
      <section aria-labelledby="breakdown-heading">
        <h3 id="breakdown-heading" className="text-sm font-semibold text-slate-700 mb-3">
          How your score was calculated
        </h3>
        <ScoreBreakdown result={result} />
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Maximum score: 100 pts. Each factor reflects known currency risks based on FAR 61.57 and general pilot proficiency research.
        </p>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onBuildPlan}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "Saving…" : "Build a study plan →"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onRetake}
          disabled={saving}
        >
          Retake
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function AssessmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { addToast } = useToast();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [form, setForm]               = useState<AssessmentForm>(DEFAULT_FORM);
  const [errors, setErrors]           = useState<Partial<Record<keyof AssessmentForm, string>>>({});
  const [result, setResult]           = useState<ReadinessResult | null>(null);
  const [saving, setSaving]           = useState(false);

  // Pre-fill last flight date from profile
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((prof) => {
        setProfile(prof);
        if (prof?.lastFlightDate) {
          setForm((f) => ({ ...f, lastFlightDate: prof.lastFlightDate! }));
        }
      })
      .finally(() => setProfileLoading(false));
  }, [user]);

  function updateField<K extends keyof AssessmentForm>(key: K, value: AssessmentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // Validate
  function validate(): boolean {
    const newErrors: Partial<Record<keyof AssessmentForm, string>> = {};

    if (!form.lastFlightDate) {
      newErrors.lastFlightDate = "Enter your last flight date to calculate recency.";
    } else {
      const d = new Date(form.lastFlightDate);
      if (isNaN(d.getTime())) newErrors.lastFlightDate = "Enter a valid date.";
      else if (d > new Date()) newErrors.lastFlightDate = "Last flight date cannot be in the future.";
    }

    const landings = parseFloat(form.landings90);
    if (form.landings90 === "" || isNaN(landings) || landings < 0) {
      newErrors.landings90 = "Enter number of takeoffs/landings (0 is valid).";
    }

    const nightLandings = parseFloat(form.nightLandings90);
    if (form.nightLandings90 === "" || isNaN(nightLandings) || nightLandings < 0) {
      newErrors.nightLandings90 = "Enter night landings in past 90 days (0 is valid).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Calculate
  function handleCalculate() {
    if (!validate()) return;

    const days = daysSince(form.lastFlightDate);
    const scored = readinessScore({
      daysSinceFlight:  days,
      landings90:       parseFloat(form.landings90),
      nightLandings90:  parseFloat(form.nightLandings90),
      toweredRecent:    form.toweredRecent,
      confidence1to5:   form.confidence,
    });

    setResult(scored);
  }

  // Save to Firestore + navigate to scenario
  async function handleBuildPlan() {
    if (!user || !result) return;
    setSaving(true);

    const days = form.lastFlightDate ? daysSince(form.lastFlightDate) : 0;

    // Save assessment snapshot
    try {
      await addDocData(userAssessments(user.uid), {
        createdAt: new Date().toISOString(),
        uid: user.uid,
        lastFlightDate: form.lastFlightDate,
        landings90: parseFloat(form.landings90),
        nightLandings90: parseFloat(form.nightLandings90),
        toweredRecent: form.toweredRecent,
        confidence: form.confidence,
        score: result.score,
        breakdown: result.breakdown,
      });
    } catch {
      // Non-blocking — assessment save failure shouldn't block navigation
      addToast({ type: "info", message: "Assessment saved locally; Firestore write failed." });
    }

    // Build query params to pre-fill scenario wizard
    const params = new URLSearchParams({
      daysSince: String(days),
      score:     String(result.score),
    });
    if (profile?.defaultAircraftVariantId) {
      params.set("variant", profile.defaultAircraftVariantId);
    }

    router.push(`${ROUTES.scenario}?${params.toString()}`);
  }

  // ── Auth / profile loading ──
  if (authLoading || profileLoading) {
    return (
      <AppShell user={user}>
        <div className="max-w-xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={3} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Readiness Assessment</h1>
          <p className="text-slate-500 text-sm mt-1">
            Answer honestly — this is for you, not for a logbook. Your score is calculated entirely on your device.
          </p>
        </div>

        {result ? (
          /* ── Result view ── */
          <ResultPanel
            result={result}
            form={form}
            profile={profile}
            onBuildPlan={handleBuildPlan}
            onRetake={() => setResult(null)}
            saving={saving}
          />
        ) : (
          /* ── Form ── */
          <form
            onSubmit={(e) => { e.preventDefault(); handleCalculate(); }}
            noValidate
            className="flex flex-col gap-6"
          >
            {/* Last flight date */}
            <Input
              label="Date of last flight"
              type="date"
              value={form.lastFlightDate}
              onChange={(e) => updateField("lastFlightDate", e.target.value)}
              error={errors.lastFlightDate}
              helperText="Used to calculate your recency score (up to 40 points)"
              max={new Date().toISOString().split("T")[0]}
              required
            />

            {/* Landings in 90 days */}
            <Input
              label="Takeoffs / landings in the past 90 days"
              type="number"
              value={form.landings90}
              onChange={(e) => updateField("landings90", e.target.value)}
              placeholder="0"
              error={errors.landings90}
              helperText="FAR 61.57 requires 3 for passenger currency (up to 25 points)"
              min="0"
              required
            />

            {/* Night landings */}
            <Input
              label="Night landings in the past 90 days"
              type="number"
              value={form.nightLandings90}
              onChange={(e) => updateField("nightLandings90", e.target.value)}
              placeholder="0"
              error={errors.nightLandings90}
              helperText="3 required for night passenger ops per FAR 61.57 (up to 10 points)"
              min="0"
              required
            />

            {/* Towered ops */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.toweredRecent}
                  onChange={(e) => updateField("toweredRecent", e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-sky-600"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-700">
                    Recent Class B / C / D tower operations
                  </span>
                  <span className="block text-slate-500 text-xs mt-0.5">
                    Check if you&apos;ve operated at a towered airport in the last 60 days (up to 10 points)
                  </span>
                </span>
              </label>
            </div>

            {/* Confidence */}
            <ConfidencePicker
              value={form.confidence}
              onChange={(v) => updateField("confidence", v)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
            >
              Calculate my readiness score
            </Button>
          </form>
        )}

      </div>
    </AppShell>
  );
}