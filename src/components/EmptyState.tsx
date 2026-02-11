// ============================================================
// RustyPilot Refresh — EmptyState Component
//
// Centered empty state with a title, description, and optional
// call-to-action button. Used when lists or pages have no content.
//
// Usage:
//   <EmptyState
//     title="No study plans yet"
//     description="Build your first plan by answering a few questions about your upcoming flight."
//     actionLabel="Create a Plan"
//     onAction={() => router.push(ROUTES.scenario)}
//   />
// ============================================================

import { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface EmptyStateProps {
  /** Short heading — what is missing */
  title: string;
  /** One or two sentences explaining the empty state and what to do */
  description: string;
  /** Label for the optional CTA button */
  actionLabel?: string;
  /** Called when the CTA button is clicked */
  onAction?: () => void;
  /** Optional decorative icon/illustration rendered above the title */
  icon?: ReactNode;
  /** Additional classes on the outer wrapper */
  className?: string;
}

// ------------------------------------------------------------
// Default icon — inbox/document outline
// ------------------------------------------------------------

function DefaultIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 48 48"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-12 h-12 text-slate-300"
    >
      {/* Document with fold */}
      <path d="M12 6h16l8 8v28H12V6z" />
      <path d="M28 6v8h8" />
      {/* Horizontal lines suggesting content */}
      <line x1="18" y1="22" x2="30" y2="22" />
      <line x1="18" y1="28" x2="30" y2="28" />
      <line x1="18" y1="34" x2="24" y2="34" />
    </svg>
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Card
      variant="flat"
      className={cn("w-full", className)}
    >
      <CardBody
        className={cn(
          "flex flex-col items-center justify-center text-center",
          "py-12 px-6 gap-4"
        )}
      >
        {/* Icon */}
        <div className="flex items-center justify-center">
          {icon ?? <DefaultIcon />}
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5 max-w-xs">
          <h3 className="text-slate-800 font-semibold text-base">
            {title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* CTA */}
        {actionLabel && onAction && (
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            className="mt-1"
          >
            {actionLabel}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}