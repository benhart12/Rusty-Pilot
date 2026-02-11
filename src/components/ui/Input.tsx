// ============================================================
// RustyPilot Refresh — Input Component
//
// Styled text input with label, helper text, and error state.
// Accessible: associates label via htmlFor, error via aria-describedby.
//
// Usage:
//   <Input
//     label="Last Flight Date"
//     type="date"
//     value={date}
//     onChange={(e) => setDate(e.target.value)}
//     required
//   />
//
//   <Input
//     label="Total Hours"
//     type="number"
//     value={hours}
//     onChange={(e) => setHours(e.target.value)}
//     error="Please enter a valid number"
//     helperText="Your total logged flight hours"
//   />
// ============================================================

"use client";

import { InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** Visible label above the input */
  label?: string;
  /** Current controlled value */
  value?: string | number;
  /** Change handler — receives the full event for flexibility */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Validation error message. Shown in red below the input. */
  error?: string;
  /** Supplementary help text shown below the input (hidden when error is present) */
  helperText?: string;
  /** Marks the field as required and appends an asterisk to the label */
  required?: boolean;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  helperText,
  required = false,
  disabled = false,
  id: externalId,
  className,
  ...rest
}: InputProps) {
  // Generate a stable, unique id if none is provided — required to link
  // the <label> htmlFor with the input id and the error message aria-describedby.
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  // Build the aria-describedby value from whichever support text is visible
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className="flex flex-col gap-1 w-full">

      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-700 select-none"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          // Base
          "w-full rounded-lg border px-3 py-2 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "bg-white",
          // Transition
          "transition-colors duration-150",
          // Default border + focus
          !error && [
            "border-slate-300",
            "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
          ],
          // Error border + focus
          error && [
            "border-red-400",
            "focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400",
          ],
          // Disabled
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
          className
        )}
        {...rest}
      />

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-600 leading-snug"
        >
          {error}
        </p>
      )}

      {/* Helper text — hidden when error is showing */}
      {!error && helperText && (
        <p
          id={helperId}
          className="text-xs text-slate-500 leading-snug"
        >
          {helperText}
        </p>
      )}

    </div>
  );
}