// ============================================================
// RustyPilot Refresh — AppShell Component
//
// Shared layout wrapper: sticky header with nav + page container.
// Does NOT fetch auth — the parent page passes in user.
// Compose with useRequireAuth at the page level and pass user down.
//
// Usage:
//   <AppShell user={user}>
//     <PageContent />
//   </AppShell>
// ============================================================

"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "firebase/auth";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface AppShellProps {
  children: ReactNode;
  /** Authenticated Firebase user or null — controls nav visibility */
  user?: User | null;
}

// ------------------------------------------------------------
// Nav link config
// ------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
}

const authedNavItems: NavItem[] = [
  { href: ROUTES.dashboard,  label: "Dashboard" },
  { href: ROUTES.scenario,   label: "Scenario" },
  { href: ROUTES.modules,    label: "Modules" },
  { href: ROUTES.progress,   label: "Progress" },
  { href: ROUTES.settings,   label: "Settings" },
];

// ------------------------------------------------------------
// Logo
// ------------------------------------------------------------

function Logo() {
  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "flex items-center gap-2 select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
      )}
      aria-label="RustyPilot Refresh — go to home"
    >
      {/* Plane icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden="true"
        className="w-6 h-6 text-sky-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
        />
      </svg>
      <span className="font-bold text-slate-900 text-base tracking-tight leading-none">
        RustyPilot
        <span className="text-sky-600 font-semibold"> Refresh</span>
      </span>
    </Link>
  );
}

// ------------------------------------------------------------
// Desktop nav link
// ------------------------------------------------------------

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium px-2 py-1 rounded-md transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
        isActive
          ? "text-sky-700 bg-sky-50"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

// ------------------------------------------------------------
// Mobile menu icon
// ------------------------------------------------------------

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
      className="w-5 h-5"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      )}
    </svg>
  );
}

// ------------------------------------------------------------
// Mobile nav drawer
// ------------------------------------------------------------

interface MobileNavProps {
  items: NavItem[];
  onClose: () => void;
}

function MobileNav({ items, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      id="mobile-menu"
      aria-label="Mobile navigation"
      className={cn(
        "md:hidden border-t border-slate-200 bg-white",
        "px-4 py-3 flex flex-col gap-1"
      )}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-100",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              isActive
                ? "text-sky-700 bg-sky-50"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ------------------------------------------------------------
// AppShell
// ------------------------------------------------------------

export default function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthed = !!user;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Logo />

          {/* Desktop nav */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1"
          >
            {isAuthed ? (
              authedNavItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))
            ) : (
              <Link
                href={ROUTES.login}
                className={cn(
                  "text-sm font-medium px-3 py-1.5 rounded-md",
                  "bg-sky-600 text-white hover:bg-sky-700",
                  "transition-colors duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                )}
              >
                Log in
              </Link>
            )}
          </nav>

          {/* Mobile: hamburger (only shown when authed) */}
          {isAuthed && (
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              className={cn(
                "md:hidden p-2 rounded-md text-slate-600",
                "hover:bg-slate-100 hover:text-slate-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                "transition-colors duration-100"
              )}
            >
              <MenuIcon open={mobileOpen} />
            </button>
          )}

          {/* Mobile: login button (unauthenticated) */}
          {!isAuthed && (
            <Link
              href={ROUTES.login}
              className={cn(
                "md:hidden text-sm font-medium px-3 py-1.5 rounded-md",
                "bg-sky-600 text-white hover:bg-sky-700",
                "transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              )}
            >
              Log in
            </Link>
          )}

        </div>

        {/* Mobile nav drawer */}
        {isAuthed && mobileOpen && (
          <MobileNav
            items={authedNavItems}
            onClose={() => setMobileOpen(false)}
          />
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

    </div>
  );
}