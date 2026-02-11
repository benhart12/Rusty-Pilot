// ============================================================
// RustyPilot Refresh — Onboarding Wizard (/onboarding)
//
// 4-step wizard:
//   Step 0: Ratings + experience (PPL/IR/CPL, hours, last flight)
//   Step 1: Aircraft selection (AircraftPicker)
//   Step 2: Goals selection
//   Step 3: Finish confirmation + Firestore write
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listAircraftFamilies, listAircraftVariants } from "@/data/aircraft";
import { updateUserProfile } from "@/lib/user";
import { ROUTES } from "@/lib/routes";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AircraftFamily, AircraftVariant, PilotRatings, PilotGoal } from "@/types/domain";
import Stepper from "@/components/ui/Stepper";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AircraftPicker from "@/components/AircraftPicker";
import LoadingState from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const STEPS = ["Experience", "Aircraft", "Goals", "Finish"];

const AVAILABLE_GOALS: { id: PilotGoal; label: string; description: string }[] = [
  { id: "rust removal",     label: "Rust removal",           description: "General refresher after time away from flying" },
  { id: "BFR prep",         label: "BFR prep",               description: "Getting ready for a Biennial Flight Review" },
  { id: "IPC prep",         label: "IPC prep",               description: "Instrument Proficiency Check preparation" },
  { id: "checkride prep",   label: "Checkride prep",         description: "Preparing for a practical test" },
  { id: "night currency",   label: "Night currency",         description: "Refreshing night landing currency" },
  { id: "cross-country planning", label: "Cross-country", description: "Planning and flying cross-country routes" },
];

const DEFAULT_RATINGS: PilotRatings = {
  ppl: false, ir: false, cpl: false, cfi: false,
  atp: false, seaplane: false, multiEngine: false, tailwheel: false,
};

// ------------------------------------------------------------
// Step 0 — Experience
// ------------------------------------------------------------

interface StepExperienceProps {
  ratings: PilotRatings;
  totalHours: string;
  lastFlightDate: string;
  onRatingsChange: (r: PilotRatings) => void;
  onHoursChange: (h: string) => void;
  onDateChange: (d: string) => void;
  errors: { hours?: string; date?: string };
}

function StepExperience({
  ratings, totalHours, lastFlightDate,
  onRatingsChange, onHoursChange, onDateChange, errors,
}: StepExperienceProps) {
  const checkboxRatings: { key: keyof PilotRatings; label: string }[] = [
    { key: "ppl",         label: "Private (PPL)" },
    { key: "ir",          label: "Instrument (IR)" },
    { key: "cpl",         label: "Commercial (CPL)" },
    { key: "cfi",         label: "Flight Instructor (CFI)" },
    { key: "multiEngine", label: "Multi-Engine" },
    { key: "tailwheel",   label: "Tailwheel" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Your experience</h2>
        <p className="text-slate-500 text-sm">Tell us about your certificates and ratings.</p>
      </div>

      {/* Ratings checkboxes */}
      <fieldset>
        <legend className="text-sm font-medium text-slate-700 mb-3">
          Certificates &amp; ratings
          <span className="ml-1 text-slate-400 font-normal">(select all that apply)</span>
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkboxRatings.map(({ key, label }) => (
            <label
              key={key}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer",
                "transition-colors duration-100 select-none text-sm",
                ratings[key]
                  ? "border-sky-400 bg-sky-50 text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <input
                type="checkbox"
                checked={ratings[key]}
                onChange={(e) => onRatingsChange({ ...ratings, [key]: e.target.checked })}
                className="w-4 h-4 rounded accent-sky-600"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Total hours */}
      <Input
        label="Total logged flight hours"
        type="number"
        value={totalHours}
        onChange={(e) => onHoursChange(e.target.value)}
        placeholder="e.g. 150"
        error={errors.hours}
        helperText="Approximate is fine"
        min="0"
      />

      {/* Last flight date */}
      <Input
        label="Date of last flight"
        type="date"
        value={lastFlightDate}
        onChange={(e) => onDateChange(e.target.value)}
        error={errors.date}
        helperText="Used to calculate your rust level"
        max={new Date().toISOString().split("T")[0]}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Step 1 — Aircraft
// ------------------------------------------------------------

interface StepAircraftProps {
  families: AircraftFamily[];
  variants: AircraftVariant[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string;
}

function StepAircraft({ families, variants, value, onChange, error }: StepAircraftProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Your aircraft</h2>
        <p className="text-slate-500 text-sm">
          Select the aircraft you fly most. This customizes your study plan content.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </p>
      )}

      <AircraftPicker
        families={families}
        variants={variants}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Step 2 — Goals
// ------------------------------------------------------------

interface StepGoalsProps {
  selected: PilotGoal[];
  onChange: (goals: PilotGoal[]) => void;
}

function StepGoals({ selected, onChange }: StepGoalsProps) {
  function toggleGoal(id: PilotGoal) {
    onChange(
      selected.includes(id)
        ? selected.filter((g) => g !== id)
        : [...selected, id]
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Your goals</h2>
        <p className="text-slate-500 text-sm">
          What are you working toward? Select all that apply — we&apos;ll tailor your drills.
        </p>
      </div>

      <div className="flex flex-col gap-2" role="group" aria-label="Study goals">
        {AVAILABLE_GOALS.map(({ id, label, description }) => {
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggleGoal(id)}
              className={cn(
                "flex items-start gap-3 text-left px-4 py-3 rounded-xl border",
                "transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                isSelected
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {/* Custom checkbox visual */}
              <span
                className={cn(
                  "mt-0.5 flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-colors duration-100",
                  isSelected ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
                )}
                aria-hidden="true"
              >
                {isSelected && (
                  <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <polyline points="2,6.5 5,9.5 10,3" />
                  </svg>
                )}
              </span>
              <span>
                <span className={cn("block text-sm font-medium", isSelected ? "text-sky-800" : "text-slate-800")}>
                  {label}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Step 3 — Finish
// ------------------------------------------------------------

interface StepFinishProps {
  selectedVariantId: string | null;
  variants: AircraftVariant[];
  goals: PilotGoal[];
  totalHours: string;
  lastFlightDate: string;
  saving: boolean;
  saveError: string | null;
}

function StepFinish({
  selectedVariantId, variants, goals, totalHours, lastFlightDate, saving, saveError,
}: StepFinishProps) {
  const variant = variants.find((v) => v.id === selectedVariantId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg mb-1">Ready to go</h2>
        <p className="text-slate-500 text-sm">
          Here&apos;s a summary of your profile. Click <strong>Finish</strong> to save and go to your dashboard.
        </p>
      </div>

      {saveError && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {saveError}
        </p>
      )}

      <dl className="flex flex-col gap-3">
        <div className="flex justify-between text-sm border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Aircraft</dt>
          <dd className="text-slate-800 font-medium">{variant?.name ?? "—"}</dd>
        </div>
        <div className="flex justify-between text-sm border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Total hours</dt>
          <dd className="text-slate-800 font-medium">{totalHours || "—"}</dd>
        </div>
        <div className="flex justify-between text-sm border-b border-slate-100 pb-3">
          <dt className="text-slate-500">Last flight</dt>
          <dd className="text-slate-800 font-medium">{lastFlightDate || "—"}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Goals</dt>
          <dd className="text-slate-800 font-medium text-right">
            {goals.length > 0 ? goals.join(", ") : "None selected"}
          </dd>
        </div>
      </dl>

      {saving && (
        <p className="text-sm text-slate-500 text-center animate-pulse">Saving your profile…</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Main page
// ------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  // Aircraft data
  const [families, setFamilies]       = useState<AircraftFamily[]>([]);
  const [variants, setVariants]       = useState<AircraftVariant[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(true);

  // Wizard state
  const [step, setStep]               = useState(0);

  // Step 0 state
  const [ratings, setRatings]         = useState<PilotRatings>(DEFAULT_RATINGS);
  const [totalHours, setTotalHours]   = useState("");
  const [lastFlightDate, setDate]     = useState("");
  const [stepErrors, setStepErrors]   = useState<{ hours?: string; date?: string }>({});

  // Step 1 state
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [aircraftError, setAircraftError]     = useState<string | undefined>(undefined);

  // Step 2 state
  const [goals, setGoals]             = useState<PilotGoal[]>(["rust removal"]);

  // Step 3 state
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // Load aircraft data
  useEffect(() => {
    async function load() {
      try {
        const [f, v] = await Promise.all([listAircraftFamilies(), listAircraftVariants()]);
        setFamilies(f);
        setVariants(v);
      } finally {
        setAircraftLoading(false);
      }
    }
    load();
  }, []);

  // Validate step 0
  function validateStep0(): boolean {
    const errors: { hours?: string; date?: string } = {};
    const hours = parseFloat(totalHours);
    if (totalHours && (isNaN(hours) || hours < 0)) {
      errors.hours = "Enter a valid number of hours.";
    }
    if (lastFlightDate) {
      const d = new Date(lastFlightDate);
      if (isNaN(d.getTime())) errors.date = "Enter a valid date.";
      else if (d > new Date()) errors.date = "Last flight date cannot be in the future.";
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Validate step 1
  function validateStep1(): boolean {
    if (!selectedVariant) {
      setAircraftError("Please select an aircraft before continuing.");
      return false;
    }
    setAircraftError(undefined);
    return true;
  }

  function handleNext() {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      await updateUserProfile(user.uid, {
        ratings,
        totalHours: parseFloat(totalHours) || 0,
        lastFlightDate: lastFlightDate || null,
        defaultAircraftVariantId: selectedVariant,
        goals,
        onboarded: true,
      });

      router.replace(ROUTES.dashboard);
    } catch (err) {
      setSaveError(`Failed to save profile: ${(err as Error).message}`);
      setSaving(false);
    }
  }

  // Auth loading
  if (authLoading || aircraftLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <LoadingState lines={4} />
        </div>
      </div>
    );
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-5 h-5 text-sky-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
          <span className="text-slate-900 font-bold text-base tracking-tight">
            RustyPilot<span className="text-sky-600 font-semibold"> Refresh</span>
          </span>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={STEPS} activeIndex={step} />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">

          {/* Step content */}
          {step === 0 && (
            <StepExperience
              ratings={ratings}
              totalHours={totalHours}
              lastFlightDate={lastFlightDate}
              onRatingsChange={setRatings}
              onHoursChange={setTotalHours}
              onDateChange={setDate}
              errors={stepErrors}
            />
          )}

          {step === 1 && (
            <StepAircraft
              families={families}
              variants={variants}
              value={selectedVariant}
              onChange={(id) => { setSelectedVariant(id); setAircraftError(undefined); }}
              error={aircraftError}
            />
          )}

          {step === 2 && (
            <StepGoals
              selected={goals}
              onChange={setGoals}
            />
          )}

          {step === 3 && (
            <StepFinish
              selectedVariantId={selectedVariant}
              variants={variants}
              goals={goals}
              totalHours={totalHours}
              lastFlightDate={lastFlightDate}
              saving={saving}
              saveError={saveError}
            />
          )}
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={step === 0 || saving}
          >
            ← Back
          </Button>

          <span className="text-xs text-slate-400 font-mono-data tabular-nums">
            {step + 1} / {STEPS.length}
          </span>

          {isLastStep ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleFinish}
              disabled={saving || !selectedVariant}
            >
              {saving ? "Saving…" : "Finish →"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={saving}
            >
              Next →
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}