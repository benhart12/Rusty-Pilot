// ============================================================
// RustyPilot Refresh — Toast Context & Hook
//
// Provides addToast() anywhere in the app via React context.
// Wrap the app (or a layout) in <ToastProvider> to enable.
//
// Usage:
//   const { addToast } = useToast();
//   addToast({ type: "success", message: "Plan saved!" });
//   addToast({ type: "error",   message: "Failed to load modules." });
//   addToast({ type: "info",    message: "Calculating readiness…" });
// ============================================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ------------------------------------------------------------
// Provider
// ------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;

let nextId = 1;
function generateId(): string {
  return `toast-${nextId++}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, message }: Omit<Toast, "id">) => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after timeout
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

/**
 * Returns addToast and removeToast from the nearest ToastProvider.
 * Throws if called outside a ToastProvider.
 *
 * @example
 *   const { addToast } = useToast();
 *   addToast({ type: "success", message: "Saved!" });
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "[useToast] must be used inside a <ToastProvider>. " +
        "Wrap your root layout or page in <ToastProvider>."
    );
  }
  return ctx;
}