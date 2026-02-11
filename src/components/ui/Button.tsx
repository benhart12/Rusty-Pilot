// ============================================================
// RustyPilot Refresh — Button Component
//
// Reusable button with four variants, three sizes, icon support,
// and full accessibility attributes.
//
// Usage:
//   <Button variant="primary" size="md" onClick={handlePress}>
//     Start Drill
//   </Button>
//
//   <Button variant="danger" leftIcon={<TrashIcon />}>
//     Delete Plan
//   </Button>
// ============================================================

"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button */
  variant?: ButtonVariant;
  /** Size preset controlling padding and text size */
  size?: ButtonSize;
  /** Icon rendered before the label */
  leftIcon?: ReactNode;
  /** Icon rendered after the label */
  rightIcon?: ReactNode;
  /** Disables interaction and applies muted styling */
  disabled?: boolean;
}

// ------------------------------------------------------------
// Style maps
// ------------------------------------------------------------

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-sky-600 text-white",
    "hover:bg-sky-700 active:bg-sky-800",
    "focus-visible:ring-sky-500",
    "disabled:bg-sky-300 disabled:text-sky-100",
  ].join(" "),

  secondary: [
    "bg-white text-slate-800 border border-slate-300",
    "hover:bg-slate-50 active:bg-slate-100",
    "focus-visible:ring-slate-400",
    "disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
  ].join(" "),

  ghost: [
    "bg-transparent text-slate-700",
    "hover:bg-slate-100 active:bg-slate-200",
    "focus-visible:ring-slate-400",
    "disabled:text-slate-300 disabled:hover:bg-transparent",
  ].join(" "),

  danger: [
    "bg-red-600 text-white",
    "hover:bg-red-700 active:bg-red-800",
    "focus-visible:ring-red-500",
    "disabled:bg-red-300 disabled:text-red-100",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  disabled = false,
  children,
  className,
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        // Base layout and transitions
        "inline-flex items-center justify-center",
        "rounded-lg font-medium",
        "transition-colors duration-150 ease-in-out",
        "select-none whitespace-nowrap",
        // Focus ring — visible only on keyboard navigation
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        // Cursor
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        // Variant and size
        variantStyles[variant],
        sizeStyles[size],
        // Caller overrides
        className
      )}
      {...rest}
    >
      {leftIcon && (
        <span
          className={cn("shrink-0", iconSizeStyles[size])}
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}

      {children && <span>{children}</span>}

      {rightIcon && (
        <span
          className={cn("shrink-0", iconSizeStyles[size])}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
}