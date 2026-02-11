// ============================================================
// RustyPilot Refresh — Aircraft Data Access
//
// All reads for aircraft families and variants go through here.
// Pages never call Firestore directly for aircraft data.
//
// If Firestore returns empty (common in local dev before seeding),
// a minimal hardcoded fallback is used so the app remains functional.
// See DEV_ONLY_FALLBACK section below.
// ============================================================

import { AircraftFamily, AircraftVariant } from "@/types/domain";
import {
  aircraftFamiliesCollection,
  aircraftVariantsCollection,
} from "@/types/firestorePaths";
import { getDocData, queryCollection } from "@/lib/firestore";

// ------------------------------------------------------------
// DEV_ONLY_FALLBACK — remove or gate behind env flag in production
// ------------------------------------------------------------
// These records exist solely so developers and testers can run
// the full app flow without seeding Firestore first.
// They are injected only when Firestore returns an empty collection.
// ------------------------------------------------------------

const DEV_ONLY_FALLBACK_FAMILIES: AircraftFamily[] = [
  {
    id: "cessna-172",
    name: "Cessna 172 Skyhawk",
    manufacturer: "Cessna",
    description:
      "The world's most popular training aircraft. A high-wing, single-engine, four-seat airplane known for its docile handling and reliability.",
    variantIds: ["c172n", "c172sp-g1000"],
  },
  {
    id: "piper-pa28",
    name: "Piper PA-28 Cherokee",
    manufacturer: "Piper",
    description:
      "A low-wing, single-engine trainer and personal aircraft. The Cherokee series spans from the basic 140 to the Arrow with retractable gear.",
    variantIds: ["pa28-161"],
  },
];

const DEV_ONLY_FALLBACK_VARIANTS: AircraftVariant[] = [
  {
    id: "c172n",
    familyId: "cessna-172",
    name: "172N (Steam Gauges)",
    year: 1978,
    avionicsType: "steam",
    notes: "Lycoming O-320-H2AD. No fuel injection. Classic six-pack panel.",
    moduleTagOverrides: ["carburetor-heat", "mixture"],
  },
  {
    id: "c172sp-g1000",
    familyId: "cessna-172",
    name: "172SP (G1000 Glass)",
    year: 2007,
    avionicsType: "glass",
    notes:
      "Lycoming IO-360-L2A. Fuel injected. Garmin G1000 avionics suite with GFC 700 autopilot optional.",
    moduleTagOverrides: ["g1000", "fuel-injection", "autopilot"],
  },
  {
    id: "pa28-161",
    familyId: "piper-pa28",
    name: "Warrior II (PA-28-161)",
    year: 1984,
    avionicsType: "steam",
    notes:
      "Lycoming O-320-D3G. Low-wing configuration. No carburetor heat required (carb is below throttle body).",
    moduleTagOverrides: ["low-wing", "fuel-selector"],
  },
];

// ------------------------------------------------------------
// listAircraftFamilies
// ------------------------------------------------------------

/**
 * Returns all aircraft families from Firestore.
 * Falls back to DEV_ONLY_FALLBACK_FAMILIES if the collection is empty.
 *
 * @example
 *   const families = await listAircraftFamilies();
 */
export async function listAircraftFamilies(): Promise<AircraftFamily[]> {
  const results = await queryCollection<AircraftFamily>(
    aircraftFamiliesCollection(),
    { orderBy: { field: "name", direction: "asc" } }
  );

  if (results.length > 0) return results;

  // DEV_ONLY_FALLBACK: return seed data when Firestore is empty
  console.warn(
    "[aircraft] listAircraftFamilies: Firestore returned empty — using DEV_ONLY_FALLBACK data."
  );
  return DEV_ONLY_FALLBACK_FAMILIES;
}

// ------------------------------------------------------------
// listAircraftVariants
// ------------------------------------------------------------

/**
 * Returns all aircraft variants from Firestore.
 * Falls back to DEV_ONLY_FALLBACK_VARIANTS if the collection is empty.
 *
 * @example
 *   const variants = await listAircraftVariants();
 */
export async function listAircraftVariants(): Promise<AircraftVariant[]> {
  const results = await queryCollection<AircraftVariant>(
    aircraftVariantsCollection(),
    { orderBy: { field: "name", direction: "asc" } }
  );

  if (results.length > 0) return results;

  // DEV_ONLY_FALLBACK: return seed data when Firestore is empty
  console.warn(
    "[aircraft] listAircraftVariants: Firestore returned empty — using DEV_ONLY_FALLBACK data."
  );
  return DEV_ONLY_FALLBACK_VARIANTS;
}

// ------------------------------------------------------------
// listVariantsByFamily
// ------------------------------------------------------------

/**
 * Returns all variants belonging to a specific aircraft family.
 * Falls back to filtering DEV_ONLY_FALLBACK_VARIANTS if needed.
 *
 * @example
 *   const variants = await listVariantsByFamily("cessna-172");
 */
export async function listVariantsByFamily(
  familyId: string
): Promise<AircraftVariant[]> {
  if (!familyId) throw new Error("[aircraft] listVariantsByFamily: familyId must not be empty.");

  const results = await queryCollection<AircraftVariant>(
    aircraftVariantsCollection(),
    {
      where: [{ field: "familyId", op: "==", value: familyId }],
      orderBy: { field: "name", direction: "asc" },
    }
  );

  if (results.length > 0) return results;

  // DEV_ONLY_FALLBACK: filter from seed when Firestore is empty
  const fallback = DEV_ONLY_FALLBACK_VARIANTS.filter(
    (v) => v.familyId === familyId
  );

  if (fallback.length > 0) {
    console.warn(
      `[aircraft] listVariantsByFamily("${familyId}"): Firestore returned empty — using DEV_ONLY_FALLBACK data.`
    );
  }

  return fallback;
}

// ------------------------------------------------------------
// getAircraftVariant
// ------------------------------------------------------------

/**
 * Returns a single aircraft variant by ID, or null if not found.
 * Falls back to DEV_ONLY_FALLBACK_VARIANTS if Firestore returns null.
 *
 * @example
 *   const variant = await getAircraftVariant("c172sp-g1000");
 */
export async function getAircraftVariant(
  id: string
): Promise<AircraftVariant | null> {
  if (!id) throw new Error("[aircraft] getAircraftVariant: id must not be empty.");

  const result = await getDocData<AircraftVariant>(
    `${aircraftVariantsCollection()}/${id}`
  );

  if (result) return result;

  // DEV_ONLY_FALLBACK: check seed data before returning null
  const fallback = DEV_ONLY_FALLBACK_VARIANTS.find((v) => v.id === id) ?? null;

  if (fallback) {
    console.warn(
      `[aircraft] getAircraftVariant("${id}"): Firestore returned null — using DEV_ONLY_FALLBACK data.`
    );
  }

  return fallback;
}