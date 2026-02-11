// ============================================================
// RustyPilot Refresh — Landing Page (/)
//
// No Firebase, no auth, no data fetching.
// Static server component — renders at build time.
// ============================================================

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Static data
// ------------------------------------------------------------

const benefits = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 2a10 10 0 110 20A10 10 0 0112 2z" />
      </svg>
    ),
    title: "Built around your last flight",
    description:
      "Tell us when you flew last, what aircraft, and where you're going. RustyPilot Refresh builds a study plan in seconds — focused on what actually degrades.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.3 24.3 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.575 1.399M5 14.5l-1.399 1.575M5 14.5H3m16.8.5h-2" />
      </svg>
    ),
    title: "Drill the stuff that matters tonight",
    description:
      "Flashcards, flow steps, MCQs, and branching scenarios — all authored specifically for VFR single-engine ops, not generic aviation trivia.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Track mastery over time",
    description:
      "Every drill session scores your performance and feeds a mastery curve per module. See exactly where your knowledge is solid and where it's fading.",
  },
];

const featureCards = [
  {
    tag: "Scenario Builder",
    heading: "Start with your actual flight",
    body: "Towered or non-towered? Night or day? Passengers or solo? The wizard takes 60 seconds and builds a plan around your real conditions.",
    accent: "border-sky-400",
    tagClasses: "bg-sky-950/60 text-sky-300",
  },
  {
    tag: "Module Library",
    heading: "Procedures, systems, emergencies",
    body: "Organized by the four categories that matter most: normal procedures, aircraft systems, airport ops, and emergency quick hits.",
    accent: "border-amber-400",
    tagClasses: "bg-amber-950/60 text-amber-300",
  },
  {
    tag: "Progress Tracking",
    heading: "Your rust level, quantified",
    body: "A readiness score built from days since your last flight, landing currency, and self-reported confidence. Honest. Explainable. Actionable.",
    accent: "border-emerald-400",
    tagClasses: "bg-emerald-950/60 text-emerald-300",
  },
];

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function LandingNav() {
  return (
    <nav
      aria-label="Site navigation"
      className="absolute top-0 left-0 right-0 z-10 px-6 sm:px-10 py-5 flex items-center justify-between"
    >
      {/* Logo */}
      <Link
        href={ROUTES.home}
        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        aria-label="RustyPilot Refresh home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-5 h-5 text-sky-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <span className="text-white font-semibold text-sm tracking-tight">
          RustyPilot<span className="text-sky-400"> Refresh</span>
        </span>
      </Link>

      {/* Auth link */}
      <Link
        href={ROUTES.login}
        className={cn(
          "text-sm font-medium text-slate-300 hover:text-white",
          "transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded px-1"
        )}
      >
        Log in →
      </Link>
    </nav>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className={cn(
          "relative overflow-hidden",
          "bg-slate-900",
          "hero-grain",
          "min-h-[92vh] flex flex-col justify-center"
        )}
        aria-labelledby="hero-heading"
      >
        {/* Atmospheric radial gradient — cockpit glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(14,116,144,0.18) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(15,23,42,0.6) 0%, transparent 80%)",
          }}
        />

        {/* Subtle horizon line */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-700/40 to-transparent"
        />

        <LandingNav />

        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-28 pb-20 text-center">

          {/* Eyebrow */}
          <p className="font-mono-data text-xs uppercase tracking-widest text-sky-400 mb-6 opacity-90">
            A preflight briefing for your brain
          </p>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-tight mb-6"
          >
            Clear the rust.<br />
            <span className="italic text-sky-300">Fly with confidence.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-slate-300 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            RustyPilot Refresh builds a personalized study plan for your next flight — covering the procedures, systems, and emergencies that degrade fastest between flights.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={ROUTES.login}
              className={cn(
                "inline-flex items-center justify-center gap-2",
                "bg-sky-500 hover:bg-sky-400 text-white",
                "font-semibold text-sm rounded-xl",
                "px-8 py-3.5 min-w-[160px]",
                "transition-colors duration-150 shadow-lg shadow-sky-900/40",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              )}
            >
              Get started
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <Link
              href="/scenario?demo=1"
              className={cn(
                "inline-flex items-center justify-center",
                "bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white",
                "border border-white/15 hover:border-white/30",
                "font-medium text-sm rounded-xl",
                "px-8 py-3.5 min-w-[160px]",
                "transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              )}
            >
              Try a demo plan
            </Link>
          </div>

          {/* Trust nudge */}
          <p className="mt-8 text-xs text-slate-500 font-mono-data">
            No credit card · No CFI endorsement required · Just a browser
          </p>
        </div>

        {/* Benefits row */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pb-16 w-full">
          <ul className="grid sm:grid-cols-3 gap-6" role="list">
            {benefits.map((b) => (
              <li
                key={b.title}
                className={cn(
                  "rounded-xl border border-white/8 bg-white/4",
                  "backdrop-blur-sm px-5 py-4"
                )}
              >
                <div className="text-sky-400 mb-3">{b.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-1.5">{b.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{b.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section
        className="bg-white py-20 px-6 sm:px-10"
        aria-labelledby="features-heading"
      >
        <div className="max-w-4xl mx-auto">
          <p className="font-mono-data text-xs uppercase tracking-widest text-slate-400 text-center mb-3">
            How it works
          </p>
          <h2
            id="features-heading"
            className="font-display text-4xl sm:text-5xl text-slate-900 text-center mb-14"
          >
            From rusty to ready,<br />
            <span className="italic text-sky-600">in one session.</span>
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <div
                key={card.tag}
                className={cn(
                  "rounded-2xl border-l-4 bg-slate-900 px-6 py-6",
                  card.accent
                )}
              >
                <span
                  className={cn(
                    "inline-block px-2.5 py-0.5 rounded-full text-xs font-mono-data font-semibold mb-4",
                    card.tagClasses
                  )}
                >
                  {card.tag}
                </span>
                <h3 className="text-white font-semibold text-base mb-2 leading-snug">
                  {card.heading}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section
        className="bg-sky-600 py-16 px-6 sm:px-10 text-center"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-xl mx-auto">
          <h2
            id="cta-heading"
            className="font-display text-3xl sm:text-4xl text-white mb-4"
          >
            Ready to brief up?
          </h2>
          <p className="text-sky-100 text-base mb-8 leading-relaxed">
            It takes 60 seconds to build your plan. No subscription, no commitment.
          </p>
          <Link
            href={ROUTES.login}
            className={cn(
              "inline-flex items-center justify-center",
              "bg-white text-sky-700 hover:bg-sky-50",
              "font-semibold text-sm rounded-xl",
              "px-8 py-3.5",
              "transition-colors duration-150 shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-600"
            )}
          >
            Create a free account
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-slate-900 px-6 sm:px-10 py-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" className="w-4 h-4 text-sky-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span className="text-slate-400 text-sm font-medium">
              RustyPilot Refresh
            </span>
          </div>

          {/* Disclaimer */}
          <p className="text-slate-600 text-xs text-center leading-relaxed max-w-md">
            For study purposes only. Not a substitute for FAA-approved training, a certified flight instructor, or the aircraft&apos;s Pilot Operating Handbook.
          </p>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex gap-4">
            <Link href={ROUTES.login} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
              Log in
            </Link>
            <Link href="/scenario?demo=1" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
              Demo
            </Link>
          </nav>
        </div>
      </footer>

    </div>
  );
}