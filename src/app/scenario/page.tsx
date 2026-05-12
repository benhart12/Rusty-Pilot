// ============================================================
// RustyPilot Refresh — Scenario Wizard (/scenario)
//
// 4-step wizard:
//   Step 0: Aircraft selection (prefilled from profile or ?variant=)
//   Step 1: Airport type + airspace class
//   Step 2: Flight conditions + passengers
//   Step 3: Review + Generate
//
// On submit:
//   1. generateStudyPlan() builds the plan client-side (pure function)
//   2. createStudyPlan() saves to Firestore
//   3. Navigate to /plan/[planId]
//
// Demo mode (?demo=1):
//   - No auth required
//   - Plan stored in sessionStorage, shown at /plan/demo
// ============================================================

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/user";
import { daysSince } from "@/lib/scoring";
import { listAircraftFamilies, listAircraftVariants } from "@/data/aircraft";
import { createStudyPlan } from "@/data/plans";
import { generateStudyPlan, PlanGeneratorInput } from "@/lib/planGenerator";
import { ROUTES } from "@/lib/routes";
import { AircraftFamily, AircraftVariant } from "@/types/domain";
import AppShell from "@/components/AppShell";
import Stepper from "@/components/ui/Stepper";
import Button from "@/components/ui/Button";
import AircraftPicker from "@/components/AircraftPicker";
import LoadingState from "@/components/LoadingState";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Step labels
// ─────────────────────────────────────────────────────────────

const STEPS = ["Aircraft", "Airport", "Conditions", "Review"];

// ─────────────────────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────────────────────

interface WizardState {
  variantId:       string | null;
  airportType:     "towered" | "nonTowered" | null;
  airspace:        "B" | "C" | "D" | null;
  night:           boolean;
  windy:           boolean;
  crosswind:       boolean;
  shortField:      boolean;
  softField:       boolean;
  passengers:      boolean;
  daysSinceFlight: number | null;
}

const DEFAULT_WIZARD: WizardState = {
  variantId: null, airportType: null, airspace: null,
  night: false, windy: false, crosswind: false,
  shortField: false, softField: false, passengers: false,
  daysSinceFlight: null,
};

// ─────────────────────────────────────────────────────────────
// Reusable toggle row
// ─────────────────────────────────────────────────────────────

function ToggleRow({ label, hint, checked, onChange }: {
  label: string; hint?: string;
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn(
      "flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-100 select-none",
      checked ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
    )}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded accent-sky-600" />
      <span>
        <span className={cn("block text-sm font-medium", checked ? "text-sky-800" : "text-slate-800")}>
          {label}
        </span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 0 — Aircraft
// ─────────────────────────────────────────────────────────────

function StepAircraft({ families, variants, value, onChange, error }: {
  families: AircraftFamily[]; variants: AircraftVariant[];
  value: string | null; onChange: (id: string) => void; error?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Which aircraft are you flying?</h2>
        <p className="text-slate-500 text-sm">We use this to tailor your systems and procedures review.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</p>}
      <AircraftPicker families={families} variants={variants} value={value} onChange={onChange} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Airport
// ─────────────────────────────────────────────────────────────

function StepAirport({ airportType, airspace, onTypeChange, onAirspaceChange, typeError }: {
  airportType: WizardState["airportType"];
  airspace: WizardState["airspace"];
  onTypeChange: (t: "towered" | "nonTowered") => void;
  onAirspaceChange: (a: WizardState["airspace"]) => void;
  typeError?: string;
}) {
  const classes: Array<{ v: "B" | "C" | "D"; label: string; hint: string }> = [
    { v: "B", label: "Class B", hint: "Major metro — complex ops" },
    { v: "C", label: "Class C", hint: "Radar — mandatory contact" },
    { v: "D", label: "Class D", hint: "Tower — standard clearances" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Destination airport</h2>
        <p className="text-slate-500 text-sm">Shapes your radio, pattern, and ATC drill sections.</p>
      </div>

      {typeError && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{typeError}</p>}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700 mb-2">Airport type</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["towered", "nonTowered"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={airportType === t}
              onClick={() => onTypeChange(t)}
              className={cn(
                "px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-100",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                airportType === t ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}>
              {t === "towered" ? "🗼 Towered" : "📻 Non-towered"}
            </button>
          ))}
        </div>
      </fieldset>

      {airportType === "towered" && (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700 mb-2">
            Airspace class <span className="font-normal text-slate-400">(optional)</span>
          </legend>
          <div className="flex flex-col gap-2">
            {classes.map(({ v, label, hint }) => (
              <button key={v} type="button" role="radio" aria-checked={airspace === v}
                onClick={() => onAirspaceChange(airspace === v ? null : v)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-all duration-100",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                  airspace === v ? "border-sky-400 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}>
                <span className={cn("shrink-0 w-4 h-4 rounded-full border-2 transition-colors",
                  airspace === v ? "border-sky-500 bg-sky-500" : "border-slate-300")} aria-hidden="true" />
                <span><span className="font-medium">{label}</span><span className="text-xs text-slate-500 ml-2">{hint}</span></span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Conditions
// ─────────────────────────────────────────────────────────────

function StepConditions({ state, onChange }: {
  state: WizardState; onChange: (u: Partial<WizardState>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Flight conditions</h2>
        <p className="text-slate-500 text-sm">Check everything that applies to today&apos;s flight.</p>
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow label="Night flight" hint="Departing or arriving after sunset" checked={state.night} onChange={(v) => onChange({ night: v })} />
        <ToggleRow label="Windy / gusty conditions" hint="Surface winds > 15 kt or gusts expected" checked={state.windy} onChange={(v) => onChange({ windy: v })} />
        <ToggleRow label="Crosswind practice" hint="Intentional crosswind technique work" checked={state.crosswind} onChange={(v) => onChange({ crosswind: v })} />
        <ToggleRow label="Short-field operations" hint="Short runway or obstacle departure/approach" checked={state.shortField} onChange={(v) => onChange({ shortField: v })} />
        <ToggleRow label="Soft-field operations" hint="Grass, gravel, or unpaved surface" checked={state.softField} onChange={(v) => onChange({ softField: v })} />
        <ToggleRow label="Carrying passengers" hint="Raises the bar for emergency procedure review" checked={state.passengers} onChange={(v) => onChange({ passengers: v })} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Days since your last flight
          <span className="ml-1 font-normal text-slate-400 text-xs">(adjusts emergency section emphasis)</span>
        </label>
        <input
          type="number" min="0"
          value={state.daysSinceFlight ?? ""}
          onChange={(e) => onChange({ daysSinceFlight: e.target.value ? parseInt(e.target.value, 10) : null })}
          placeholder="e.g. 45"
          className={cn(
            "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-150"
          )}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Review
// ─────────────────────────────────────────────────────────────

function StepReview({ state, variants, generating, error }: {
  state: WizardState; variants: AircraftVariant[];
  generating: boolean; error: string | null;
}) {
  const variant = variants.find((v) => v.id === state.variantId);

  const rows = [
    { label: "Aircraft",        value: variant?.name ?? "—" },
    { label: "Airport type",    value: state.airportType === "towered" ? `Towered${state.airspace ? ` (Class ${state.airspace})` : ""}` : state.airportType === "nonTowered" ? "Non-towered" : "—" },
    { label: "Night flight",    value: state.night      ? "Yes" : "No" },
    { label: "Windy",           value: state.windy      ? "Yes" : "No" },
    { label: "Crosswind",       value: state.crosswind  ? "Yes" : "No" },
    { label: "Short field",     value: state.shortField ? "Yes" : "No" },
    { label: "Soft field",      value: state.softField  ? "Yes" : "No" },
    { label: "Passengers",      value: state.passengers ? "Yes" : "No" },
    { label: "Days since last flight", value: state.daysSinceFlight !== null ? String(state.daysSinceFlight) : "Not specified" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Review your scenario</h2>
        <p className="text-slate-500 text-sm">Confirm your selections, then generate your study plan.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</p>}

      <dl className="flex flex-col gap-1.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <dt className="text-xs text-slate-500 font-medium">{label}</dt>
            <dd className="text-sm text-slate-800 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {generating && <p className="text-sm text-slate-500 text-center animate-pulse mt-2">Generating your plan…</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inner page component (uses useSearchParams)
// ─────────────────────────────────────────────────────────────

function ScenarioPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const isDemo       = searchParams.get("demo") === "1";
  const variantParam = searchParams.get("variant");
  const daysParam    = searchParams.get("daysSince");

  const [families, setFamilies]     = useState<AircraftFamily[]>([]);
  const [variants, setVariants]     = useState<AircraftVariant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [step, setStep]             = useState(0);
  const [wiz, setWiz]               = useState<WizardState>({
    ...DEFAULT_WIZARD,
    variantId:       variantParam ?? null,
    daysSinceFlight: daysParam ? parseInt(daysParam, 10) : null,
  });
  const [stepErrors, setStepErrors] = useState<{ [k: string]: string }>({});
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);

  function update(u: Partial<WizardState>) {
    setWiz((s) => ({ ...s, ...u }));
  }

  useEffect(() => {
    async function load() {
      try {
        const [fams, vars] = await Promise.all([listAircraftFamilies(), listAircraftVariants()]);
        setFamilies(fams);
        setVariants(vars);

        if (!variantParam && user) {
          const prof = await getUserProfile(user.uid);
          const updates: Partial<WizardState> = {};
          if (prof?.defaultAircraftVariantId) updates.variantId = prof.defaultAircraftVariantId;
          if (!daysParam && prof?.lastFlightDate) updates.daysSinceFlight = daysSince(prof.lastFlightDate);
          if (Object.keys(updates).length > 0) update(updates);
        }
      } finally {
        setDataLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function validateStep(s: number): boolean {
    const errs: { [k: string]: string } = {};
    if (s === 0 && !wiz.variantId) errs.variant = "Please select an aircraft before continuing.";
    if (s === 1 && !wiz.airportType) errs.airportType = "Please select an airport type.";
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  }

  async function handleGenerate() {
    if (!validateStep(step)) return;
    setGenerating(true);
    setGenError(null);

    try {
      const input: PlanGeneratorInput = {
        aircraftVariantId: wiz.variantId!,
        airportType:       wiz.airportType!,
        airspace:          wiz.airspace ?? undefined,
        conditions: {
          night:             wiz.night,
          windy:             wiz.windy,
          crosswindPractice: wiz.crosswind,
          shortField:        wiz.shortField,
          softField:         wiz.softField,
        },
        passengers:        wiz.passengers,
        daysSinceFlight:   wiz.daysSinceFlight ?? 30,
      };

      const planData = generateStudyPlan(input);

      if (isDemo || !user) {
        sessionStorage.setItem("rustypilot_demo_plan", JSON.stringify(planData));
        router.push("/plan/demo");
        return;
      }

      const planWithUid = { ...planData, uid: user.uid };
      const planId = await createStudyPlan(user.uid, planWithUid);
      router.push(`/plan/${planId}`);
    } catch (err) {
      setGenError(`Failed to generate plan: ${(err as Error).message}`);
      setGenerating(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  if (authLoading || dataLoading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-lg mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user ?? null}>
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 font-bold text-2xl">
              {isDemo ? "Demo Plan" : "Build Your Plan"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isDemo ? "No account needed — generates a sample plan." : "Describe your flight and we'll build your plan."}
            </p>
          </div>
          {isDemo && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Demo</span>
          )}
        </div>

        <Stepper steps={STEPS} activeIndex={step} />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {step === 0 && <StepAircraft families={families} variants={variants} value={wiz.variantId}
            onChange={(id) => { update({ variantId: id }); setStepErrors({}); }} error={stepErrors.variant} />}
          {step === 1 && <StepAirport airportType={wiz.airportType} airspace={wiz.airspace}
            onTypeChange={(t) => { update({ airportType: t }); setStepErrors({}); }}
            onAirspaceChange={(a) => update({ airspace: a })} typeError={stepErrors.airportType} />}
          {step === 2 && <StepConditions state={wiz} onChange={update} />}
          {step === 3 && <StepReview state={wiz} variants={variants} generating={generating} error={genError} />}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="md" onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || generating}>← Back</Button>
          <span className="text-xs text-slate-400 tabular-nums">{step + 1} / {STEPS.length}</span>
          {isLastStep ? (
            <Button variant="primary" size="md" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate plan →"}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleNext} disabled={generating}>Next →</Button>
          )}
        </div>

      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Export — Suspense boundary required for useSearchParams
// ─────────────────────────────────────────────────────────────

export default function ScenarioPage() {
  return (
    <Suspense fallback={
      <AppShell user={null}>
        <div className="max-w-lg mx-auto pt-6"><LoadingState lines={4} /></div>
      </AppShell>
    }>
      <ScenarioPageInner />
    </Suspense>
  );
}