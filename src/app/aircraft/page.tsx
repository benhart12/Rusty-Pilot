// ============================================================
// RustyPilot Refresh — Aircraft Selection Page (/aircraft)
//
// Lets the pilot view and change their default aircraft variant.
// Layout:
//   Desktop: Left rail (family list) + Right pane (variant cards)
//   Mobile:  Stacked (family chips → variants below)
//
// Firestore reads:  aircraftFamilies, aircraftVariants, user profile
// Firestore write:  /users/{uid}.defaultAircraftVariantId
// ============================================================

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listAircraftFamilies, listAircraftVariants } from "@/data/aircraft";
import { getUserProfile, updateUserProfile } from "@/lib/user";
import { useToast } from "@/hooks/useToast";
import { AircraftFamily, AircraftVariant, UserProfile } from "@/types/domain";
import AppShell from "@/components/AppShell";
import AircraftPicker from "@/components/AircraftPicker";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function AircraftPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { addToast } = useToast();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [families, setFamilies]       = useState<AircraftFamily[]>([]);
  const [variants, setVariants]       = useState<AircraftVariant[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);

  // Local selection state — starts from profile, tracks unsaved changes
  const [selected, setSelected]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);

  // Whether there's an unsaved change
  const isDirty = selected !== profile?.defaultAircraftVariantId;

  // Load data
  useEffect(() => {
    if (!user) return;
    async function load() {
      setDataLoading(true);
      setLoadError(null);
      try {
        const [prof, fams, vars] = await Promise.all([
          getUserProfile(user!.uid),
          listAircraftFamilies(),
          listAircraftVariants(),
        ]);
        setProfile(prof);
        setFamilies(fams);
        setVariants(vars);
        setSelected(prof?.defaultAircraftVariantId ?? null);
      } catch (err) {
        setLoadError(`Failed to load aircraft data: ${(err as Error).message}`);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [user]);

  // Save selection
  async function handleSave() {
    if (!user || !selected) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { defaultAircraftVariantId: selected });
      setProfile((prev) => prev ? { ...prev, defaultAircraftVariantId: selected } : prev);
      addToast({ type: "success", message: "Default aircraft updated." });
    } catch (err) {
      addToast({ type: "error", message: `Save failed: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  // Discard unsaved change
  function handleDiscard() {
    setSelected(profile?.defaultAircraftVariantId ?? null);
  }

  // ── Currently selected variant details (for info strip) ──
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selected) ?? null,
    [variants, selected]
  );
  const selectedFamily = useMemo(
    () => families.find((f) => f.id === selectedVariant?.familyId) ?? null,
    [families, selectedVariant]
  );

  // ── Loading ──
  if (authLoading || dataLoading) {
    return (
      <AppShell user={user}>
        <div className="max-w-4xl mx-auto pt-6 flex flex-col gap-4">
          <LoadingState lines={2} />
          <LoadingState lines={5} />
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (loadError) {
    return (
      <AppShell user={user}>
        <div className="max-w-2xl mx-auto pt-8">
          <EmptyState
            title="Couldn't load aircraft data"
            description={loadError}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-slate-900 font-bold text-2xl">Aircraft</h1>
            <p className="text-slate-500 text-sm mt-1">
              Select your default aircraft. This pre-fills your study plans and filters drill content.
            </p>
          </div>

          {/* Save / Discard controls — shown only when selection changed */}
          {isDirty && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || !selected}
              >
                {saving ? "Saving…" : "Save aircraft"}
              </Button>
            </div>
          )}
        </div>

        {/* Currently selected info strip */}
        {selectedVariant && (
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl",
              "border border-sky-200 bg-sky-50"
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-4 h-4 text-sky-500 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-sky-800">
              <span className="font-medium">{selectedVariant.name}</span>
              {selectedFamily && (
                <span className="text-sky-600"> — {selectedFamily.manufacturer} {selectedFamily.name}</span>
              )}
              {isDirty && (
                <span className="ml-2 text-xs text-amber-600 font-medium">(unsaved)</span>
              )}
            </p>
          </div>
        )}

        {/* Picker */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <AircraftPicker
            families={families}
            variants={variants}
            value={selected}
            onChange={(id) => setSelected(id)}
          />
        </div>

        {/* Sticky save bar on mobile (appears when dirty) */}
        {isDirty && (
          <div className={cn(
            "sm:hidden fixed bottom-0 left-0 right-0 z-30",
            "bg-white border-t border-slate-200 shadow-lg",
            "px-4 py-3 flex items-center justify-between gap-3"
          )}>
            <p className="text-sm text-slate-600 truncate">
              {selectedVariant ? `Selected: ${selectedVariant.name}` : "No aircraft selected"}
            </p>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !selected}>
                {saving ? "…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Bottom padding to clear sticky bar on mobile */}
        {isDirty && <div className="sm:hidden h-16" aria-hidden="true" />}

      </div>
    </AppShell>
  );
}