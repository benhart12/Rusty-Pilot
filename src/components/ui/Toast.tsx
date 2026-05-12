// ============================================================
// RustyPilot Refresh — Toast Renderer
//
// Renders active toasts in a fixed overlay.
// Position: top-right on md+ screens, top-center on mobile.
//
// Add <ToastContainer /> once inside your layout (alongside
// where you put <ToastProvider>) — it reads from the same context.
//
// Usage (layout.tsx):
//   <ToastProvider>
//     <ToastContainer />
//     {children}
//   </ToastProvider>
// ============================================================

"use client";

import React, { useEffect, useRef } from "react";
import { useToast, Toast, ToastType } from "@/hooks/useToast";
import { cn } from "@/lib/cn";

// Re-export ToastProvider so the layout can import everything from one place
export { ToastProvider } from "@/hooks/useToast";

// ------------------------------------------------------------
// Per-type style config
// ------------------------------------------------------------

interface ToastStyle {
  container: string;
  icon: string;
  iconPath: React.ReactElement;
}

const toastStyles: Record<ToastType, ToastStyle> = {
  success: {
    container: "bg-white border border-emerald-200 shadow-md",
    icon: "text-emerald-500",
    iconPath: (
      // Checkmark
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    ),
  },
  error: {
    container: "bg-white border border-red-200 shadow-md",
    icon: "text-red-500",
    iconPath: (
      // X mark
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    ),
  },
  info: {
    container: "bg-white border border-sky-200 shadow-md",
    icon: "text-sky-500",
    iconPath: (
      // Info circle — vertical line
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16.5v-4.5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8.25h.008v.008H12V8.25z"
          strokeWidth={2.5}
        />
      </>
    ),
  },
};

// ------------------------------------------------------------
// Individual toast item
// ------------------------------------------------------------

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const style = toastStyles[toast.type];

  // Announce to screen readers via role="status" (non-urgent) or
  // role="alert" (urgent, for errors).
  const role = toast.type === "error" ? "alert" : "status";

  // Ref used to trigger entry animation on mount
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Small rAF delay ensures the initial opacity-0 class is applied first
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, []);

  return (
    <div
      ref={ref}
      role={role}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      style={{
        opacity: 0,
        transform: "translateY(-8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
      }}
      className={cn(
        "flex items-start gap-3 w-full max-w-sm",
        "rounded-xl px-4 py-3 pointer-events-auto",
        style.container
      )}
    >
      {/* Type icon */}
      <span className={cn("mt-0.5 shrink-0", style.icon)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          {style.iconPath}
        </svg>
      </span>

      {/* Message */}
      <p className="flex-1 text-sm text-slate-700 leading-snug pt-0.5">
        {toast.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          "shrink-0 mt-0.5 rounded p-0.5",
          "text-slate-400 hover:text-slate-600",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
          "transition-colors duration-100"
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// ToastContainer — mount once in layout
// ------------------------------------------------------------

/**
 * Renders the active toast stack in a fixed overlay.
 * Place this inside <ToastProvider> in your root layout.
 *
 * @example
 *   // app/layout.tsx
 *   <ToastProvider>
 *     <ToastContainer />
 *     {children}
 *   </ToastProvider>
 */
export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={cn(
        // Fixed overlay — above everything
        "fixed z-50 pointer-events-none",
        "flex flex-col gap-2",
        // Mobile: top-center
        "top-4 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm",
        // Desktop: top-right (overrides the centering at md+)
        "md:left-auto md:right-4 md:translate-x-0 md:w-auto"
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}