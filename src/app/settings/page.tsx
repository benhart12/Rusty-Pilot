// ============================================================
// RustyPilot Refresh — Settings Page (/settings)
//
// Sections:
//   1. Profile — display name, ratings, hours, last flight date
//   2. Aircraft — change default aircraft
//   3. Data Export — download JSON snapshot of profile + progress
//
// Firestore writes:
//   - /users/{uid} — profile updates
//
// No delete account flow yet — can be added later.
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getUserProfile, updateUserProfile } from "@/lib/user";
import { listAircraftFamilies, listAircraftVariants, getAircraftVariant } from "@/data/aircraft";
import { queryCollection } from "@/lib/firestore";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import { UserProfile, AircraftFamily, AircraftVariant, PilotRatings, UserModuleProgress } from "@/types/domain";
import AppShell from "@/components/AppShell";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AircraftPicker from "@/components/AircraftPicker";
import LoadingState from "@/components/LoadingState";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Profile section
// ─────────────────────────────────────────────────────────────

function ProfileSection({ profile, onSave }: {
  profile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}) {
  const [displayName, setDisplayName]     = useState(profile.displayName ?? "");
  const [totalHours, setTotalHours]       = useState(String(profile.totalHours ?? ""));
  const [lastFlightDate, setLastFlightDate] = useState(profile.lastFlightDate ?? "");
  const [ratings, setRatings]             = useState<PilotRatings>(profile.ratings ?? {
    ppl: false, ir: false, cpl: false, cfi: false,
    atp: false, seaplane: false, multiEngine: false, tailwheel: false,
  });

  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<{ [k: string]: string }>({});

  const isDirty =
    displayName !== (profile.displayName ?? "") ||
    totalHours !== String(profile.totalHours ?? "") ||
    lastFlightDate !== (profile.lastFlightDate ?? "") ||
    JSON.stringify(ratings) !== JSON.stringify(profile.ratings);

  const checkboxRatings: { key: keyof PilotRatings; label: string }[] = [
    { key: "ppl",         label: "Private (PPL)" },
    { key: "ir",          label: "Instrument (IR)" },
    { key: "cpl",         label: "Commercial (CPL)" },
    { key: "cfi",         label: "Flight Instructor (CFI)" },
    { key: "multiEngine", label: "Multi-Engine" },
    { key: "tailwheel",   label: "Tailwheel" },
  ];

  function validate(): boolean {
    const errs: { [k: string]: string } = {};
    const hours = parseFloat(totalHours);
    if (totalHours && (isNaN(hours) || hours < 0)) {
      errs.totalHours = "Enter a valid number of hours.";
    }
    if (lastFlightDate) {
      const d = new Date(lastFlightDate);
      if (isNaN(d.getTime())) errs.lastFlightDate = "Enter a valid date.";
      else if (d > new Date()) errs.lastFlightDate = "Last flight date cannot be in the future.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim() || undefined,
        totalHours: totalHours ? parseFloat(totalHours) : 0,
        lastFlightDate: lastFlightDate || null,
        ratings,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle as="h2">Profile</CardTitle>
      </CardHeader>
      <CardBody className="pt-0 flex flex-col gap-4">
        <Input
          label="Display name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name (optional)"
          helperText="Shown on the dashboard"
        />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700 mb-2">
            Certificates &amp; ratings
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {checkboxRatings.map(({ key, label }) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none text-sm transition-colors",
                  ratings[key]
                    ? "border-sky-400 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={ratings[key]}
                  onChange={(e) => setRatings((r) => ({ ...r, [key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sky-600"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Input
          label="Total logged flight hours"
          type="number"
          value={totalHours}
          onChange={(e) => setTotalHours(e.target.value)}
          placeholder="e.g. 150"
          error={errors.totalHours}
          min="0"
        />

        <Input
          label="Date of last flight"
          type="date"
          value={lastFlightDate}
          onChange={(e) => setLastFlightDate(e.target.value)}
          error={errors.lastFlightDate}
          helperText="Used to calculate your rust level"
          max={new Date().toISOString().split("T")[0]}
        />
      </CardBody>
      <CardFooter>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Aircraft section
// ─────────────────────────────────────────────────────────────

function AircraftSection({ profile, families, variants, onSave }: {
  profile: UserProfile;
  families: AircraftFamily[];
  variants: AircraftVariant[];
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}) {
  const [selected, setSelected] = useState(profile.defaultAircraftVariantId ?? null);
  const [saving, setSaving]     = useState(false);

  const isDirty = selected !== profile.defaultAircraftVariantId;

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await onSave({ defaultAircraftVariantId: selected });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle as="h2">Default Aircraft</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <AircraftPicker
          families={families}
          variants={variants}
          value={selected}
          onChange={setSelected}
        />
      </CardBody>
      {isDirty && (
        <CardFooter>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={() => setSelected(profile.defaultAircraftVariantId ?? null)}>
              Discard
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving || !selected}>
              {saving ? "Saving…" : "Save aircraft"}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Data export section
// ─────────────────────────────────────────────────────────────

function DataExportSection({ profile, onExport }: {
  profile: UserProfile;
  onExport: () => Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card variant="flat">
      <CardHeader>
        <CardTitle as="h2">Data Export</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Download a JSON file containing your profile, ratings, progress, and attempt history.
          This is your data — keep a backup for your records.
        </p>
        <Button variant="secondary" size="md" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing download…" : "Download my data (JSON)"}
        </Button>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Account actions section
// ─────────────────────────────────────────────────────────────

function AccountActionsSection({ onLogout }: { onLogout: () => Promise<void> }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Card variant="flat">
      <CardHeader>
        <CardTitle as="h2">Account</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Signing out will end your current session. Your data remains saved.
        </p>
        <Button variant="ghost" size="md" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { addToast } = useToast();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [families, setFamilies]       = useState<AircraftFamily[]>([]);
  const [variants, setVariants]       = useState<AircraftVariant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setDataLoading(true);
      setError(null);
      try {
        const [prof, fams, vars] = await Promise.all([
          getUserProfile(user!.uid),
          listAircraftFamilies(),
          listAircraftVariants(),
        ]);
        setProfile(prof);
        setFamilies(fams);
        setVariants(vars);
      } catch (err) {
        setError(`Failed to load settings: ${(err as Error).message}`);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleSaveProfile(updates: Partial<UserProfile>) {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, updates);
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      addToast({ type: "success", message: "Profile updated." });
    } catch (err) {
      addToast({ type: "error", message: `Save failed: ${(err as Error).message}` });
      throw err;
    }
  }

  async function handleExport() {
    if (!user || !profile) return;
    try {
      // Fetch progress data
      const progress = await queryCollection<UserModuleProgress>(
        `userProgress/${user.uid}/modules`
      );

      // Build export object
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        profile: {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          ratings: profile.ratings,
          totalHours: profile.totalHours,
          lastFlightDate: profile.lastFlightDate,
          defaultAircraftVariantId: profile.defaultAircraftVariantId,
          goals: profile.goals,
          createdAt: profile.createdAt,
        },
        progress,
      };

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rustypilot-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({ type: "success", message: "Data exported successfully." });
    } catch (err) {
      addToast({ type: "error", message: `Export failed: ${(err as Error).message}` });
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      addToast({ type: "success", message: "Signed out successfully." });
      router.replace(ROUTES.home);
    } catch (err) {
      addToast({ type: "error", message: `Sign out failed: ${(err as Error).message}` });
    }
  }

  // ── Loading ──
  if (authLoading || dataLoading) {
    return (
      <AppShell user={user ?? null}>
        <div className="max-w-2xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={5} />
          <LoadingState lines={4} />
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (error || !profile) {
    return (
      <AppShell user={user}>
        <div className="max-w-xl mx-auto pt-8">
          <div className="text-center">
            <p className="text-slate-600 text-sm mb-4">{error ?? "Profile not found."}</p>
            <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your profile, aircraft, and account preferences.
          </p>
        </div>

        {/* ── Email (read-only) ── */}
        <Card variant="flat">
          <CardBody className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <p className="text-sm text-slate-900 font-semibold">{profile.email}</p>
              </div>
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                Verified
              </span>
            </div>
          </CardBody>
        </Card>

        {/* ── Profile section ── */}
        <ProfileSection profile={profile} onSave={handleSaveProfile} />

        {/* ── Aircraft section ── */}
        <AircraftSection
          profile={profile}
          families={families}
          variants={variants}
          onSave={handleSaveProfile}
        />

        {/* ── Data export ── */}
        <DataExportSection profile={profile} onExport={handleExport} />

        {/* ── Account actions ── */}
        <AccountActionsSection onLogout={handleLogout} />

      </div>
    </AppShell>
  );
}