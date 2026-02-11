// ============================================================
// RustyPilot Refresh — Login Page (/login)
//
// Two-tab auth flow: Sign In and Create Account.
// After auth:
//   - New user (no Firestore profile)  → /onboarding
//   - Returning user (profile exists)  → /dashboard
// ============================================================

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile, getUserProfile } from "@/lib/user";
import { ROUTES } from "@/lib/routes";
import Tabs from "@/components/ui/Tabs";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import Link from "next/link";

// ------------------------------------------------------------
// Firebase error code → human-readable message
// ------------------------------------------------------------

function mapFirebaseError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect. Please try again.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// ------------------------------------------------------------
// Field-level validation
// ------------------------------------------------------------

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

// ------------------------------------------------------------
// Tab definitions
// ------------------------------------------------------------

const AUTH_TABS = [
  { id: "signin", label: "Sign In" },
  { id: "signup", label: "Create Account" },
];

// ------------------------------------------------------------
// Sign-in form
// ------------------------------------------------------------

function SignInForm() {
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passError, setPassError]   = useState<string | null>(null);
  const [formError, setFormError]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPassError(pErr);
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(cred.user.uid);
      router.replace(profile ? ROUTES.dashboard : ROUTES.onboarding);
    } catch (err) {
      const code = (err as AuthError).code ?? "";
      setFormError(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 leading-snug">
          {formError}
        </p>
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
        placeholder="you@example.com"
        error={emailError ?? undefined}
        required
        autoComplete="email"
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setPassError(null); }}
        placeholder="••••••••"
        error={passError ?? undefined}
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading}
        className="mt-2 w-full"
      >
        {loading ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------
// Sign-up form
// ------------------------------------------------------------

function SignUpForm() {
  const router = useRouter();
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [emailError, setEmailError]   = useState<string | null>(null);
  const [passError, setPassError]     = useState<string | null>(null);
  const [confirmError, setConfirmErr] = useState<string | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = confirm !== password ? "Passwords do not match." : null;
    setEmailError(eErr);
    setPassError(pErr);
    setConfirmErr(cErr);
    if (eErr || pErr || cErr) return;

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Create Firestore profile — ensureUserProfile handles the write
      await ensureUserProfile(cred.user.uid, email);

      // New user always goes to onboarding
      router.replace(ROUTES.onboarding);
    } catch (err) {
      const code = (err as AuthError).code ?? "";
      setFormError(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 leading-snug">
          {formError}
        </p>
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
        placeholder="you@example.com"
        error={emailError ?? undefined}
        required
        autoComplete="email"
        autoFocus
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setPassError(null); }}
        placeholder="At least 8 characters"
        error={passError ?? undefined}
        helperText="Minimum 8 characters"
        required
        autoComplete="new-password"
      />

      <Input
        label="Confirm Password"
        type="password"
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); setConfirmErr(null); }}
        placeholder="••••••••"
        error={confirmError ?? undefined}
        required
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading}
        className="mt-2 w-full"
      >
        {loading ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo link */}
      <Link
        href={ROUTES.home}
        className={cn(
          "flex items-center gap-2 mb-8",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
        )}
        aria-label="RustyPilot Refresh home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-6 h-6 text-sky-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <span className="text-slate-900 font-bold text-base tracking-tight">
          RustyPilot<span className="text-sky-600 font-semibold"> Refresh</span>
        </span>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Tabs */}
        <Tabs
          tabs={AUTH_TABS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as "signin" | "signup")}
          className="px-2 pt-2"
        />

        {/* Form area */}
        <div className="px-6 py-6">
          {activeTab === "signin" ? <SignInForm /> : <SignUpForm />}
        </div>

        {/* Tab switcher nudge */}
        <div className="border-t border-slate-100 px-6 py-4 text-center">
          {activeTab === "signin" ? (
            <p className="text-xs text-slate-500">
              No account?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className="text-sky-600 font-medium hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
              >
                Create one free
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className="text-sky-600 font-medium hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Demo nudge */}
      <p className="mt-6 text-xs text-slate-400 text-center">
        Not ready to commit?{" "}
        <Link href="/scenario?demo=1" className="text-sky-600 hover:underline font-medium">
          Try a demo plan without an account
        </Link>
      </p>
    </div>
  );
}