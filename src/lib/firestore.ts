// ============================================================
// RustyPilot Refresh — Firestore Helpers
//
// Typed wrappers around the Firebase v9 modular SDK.
// All pages and data-access files import from here instead of
// calling Firestore SDK functions directly.
//
// Supports:
//   - Single document reads / writes
//   - Collection adds (auto-ID)
//   - Collection queries with up to 2 where clauses and 1 orderBy
// ============================================================

import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    DocumentReference,
    DocumentData,
    WhereFilterOp,
    OrderByDirection,
  } from "firebase/firestore";
  
  import { db } from "@/lib/firebase";
  
  // ------------------------------------------------------------
  // Types
  // ------------------------------------------------------------
  
  export interface WhereClause {
    field: string;
    op: WhereFilterOp;           // "==" | "<" | "<=" | ">" | ">=" | "array-contains" | "in" | "not-in" | etc.
    value: unknown;
  }
  
  export interface OrderByClause {
    field: string;
    direction?: OrderByDirection; // "asc" | "desc" — defaults to "asc"
  }
  
  export interface QueryOptions {
    where?: [WhereClause] | [WhereClause, WhereClause]; // 0–2 clauses
    orderBy?: OrderByClause;
    limit?: number;
  }
  
  // ------------------------------------------------------------
  // docRef
  // ------------------------------------------------------------
  
  /**
   * Returns a typed Firestore DocumentReference for the given slash-separated path.
   *
   * @example
   *   docRef("users/uid123")
   *   docRef("studyPlans/uid123/plan456")
   */
  export function docRef(path: string): DocumentReference<DocumentData> {
    const segments = path.split("/").filter(Boolean);
  
    if (segments.length === 0) {
      throw new Error(`[firestore] docRef: path is empty.`);
    }
    if (segments.length % 2 !== 0) {
      throw new Error(
        `[firestore] docRef: path "${path}" has an odd number of segments. ` +
          `Document paths must have an even number (collection/doc/collection/doc/…).`
      );
    }
  
    // Build nested collection/doc references from segments
    // doc(db, "col", "docId", "subCol", "subDocId") accepts rest args
    const [first, second, ...rest] = segments;
    return doc(db, first, second, ...rest);
  }
  
  // ------------------------------------------------------------
  // getDocData<T>
  // ------------------------------------------------------------
  
  /**
   * Fetches a single Firestore document and returns its data cast to T,
   * or null if the document does not exist.
   *
   * @example
   *   const profile = await getDocData<UserProfile>("users/uid123");
   */
  export async function getDocData<T>(path: string): Promise<T | null> {
    try {
      const ref = docRef(path);
      const snap = await getDoc(ref);
  
      if (!snap.exists()) {
        return null;
      }
  
      return snap.data() as T;
    } catch (err) {
      throw new Error(
        `[firestore] getDocData failed for path "${path}": ${(err as Error).message}`
      );
    }
  }
  
  // ------------------------------------------------------------
  // setDocData<T>
  // ------------------------------------------------------------
  
  /**
   * Writes data to a Firestore document at the given path.
   * If merge is true (default: false), existing fields not present in data are preserved.
   *
   * @example
   *   await setDocData("users/uid123", profileData);
   *   await setDocData("users/uid123", { displayName: "Alex" }, true); // merge
   */
  export async function setDocData<T extends DocumentData>(
    path: string,
    data: T,
    merge = false
  ): Promise<void> {
    try {
      const ref = docRef(path);
      await setDoc(ref, data, { merge });
    } catch (err) {
      throw new Error(
        `[firestore] setDocData failed for path "${path}": ${(err as Error).message}`
      );
    }
  }
  
  // ------------------------------------------------------------
  // addDocData<T>
  // ------------------------------------------------------------
  
  /**
   * Adds a new document to a collection with an auto-generated Firestore ID.
   * Returns the new document's ID string.
   *
   * @example
   *   const planId = await addDocData("studyPlans/uid123", planData);
   */
  export async function addDocData<T extends DocumentData>(
    collectionPath: string,
    data: T
  ): Promise<string> {
    try {
      const colRef = collection(db, ...collectionPath.split("/").filter(Boolean));
      const docSnap = await addDoc(colRef, data);
      return docSnap.id;
    } catch (err) {
      throw new Error(
        `[firestore] addDocData failed for collection "${collectionPath}": ${(err as Error).message}`
      );
    }
  }
  
  // ------------------------------------------------------------
  // queryCollection<T>
  // ------------------------------------------------------------
  
  /**
   * Queries a Firestore collection with optional where clauses, ordering, and limit.
   * Supports 0–2 where clauses and 0–1 orderBy clause.
   * Returns an array of documents cast to T (empty array if no results).
   *
   * @example
   *   // All modules tagged "engine"
   *   await queryCollection<ContentModule>("modules", {
   *     where: [{ field: "tags", op: "array-contains", value: "engine" }],
   *     orderBy: { field: "title", direction: "asc" },
   *     limit: 20,
   *   });
   *
   *   // User's study plans, newest first
   *   await queryCollection<StudyPlan>("studyPlans/uid123", {
   *     orderBy: { field: "createdAt", direction: "desc" },
   *     limit: 10,
   *   });
   */
  export async function queryCollection<T>(
    collectionPath: string,
    opts?: QueryOptions
  ): Promise<T[]> {
    try {
      const colRef = collection(db, ...collectionPath.split("/").filter(Boolean));
  
      // Assemble query constraints in order: where → orderBy → limit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = [];
  
      if (opts?.where) {
        for (const clause of opts.where) {
          constraints.push(where(clause.field, clause.op, clause.value));
        }
      }
  
      if (opts?.orderBy) {
        constraints.push(
          orderBy(opts.orderBy.field, opts.orderBy.direction ?? "asc")
        );
      }
  
      if (opts?.limit !== undefined && opts.limit > 0) {
        constraints.push(firestoreLimit(opts.limit));
      }
  
      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);
  
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
    } catch (err) {
      throw new Error(
        `[firestore] queryCollection failed for path "${collectionPath}": ${(err as Error).message}`
      );
    }
  }