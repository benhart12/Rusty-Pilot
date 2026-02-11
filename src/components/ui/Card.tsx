// ============================================================
// RustyPilot Refresh — Card Component
//
// Composable card primitives for content containers.
//
// Usage:
//   <Card>
//     <CardHeader>
//       <CardTitle>Fuel System Overview</CardTitle>
//     </CardHeader>
//     <CardBody>
//       Content goes here.
//     </CardBody>
//     <CardFooter>
//       <Button>Start Drill</Button>
//     </CardFooter>
//   </Card>
//
//   <Card variant="flat" className="max-w-sm">...</Card>
// ============================================================

import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// ------------------------------------------------------------
// Card variants
// ------------------------------------------------------------

type CardVariant =
  | "default"   // white bg, subtle border, soft shadow
  | "flat"      // white bg, border only, no shadow
  | "ghost";    // no bg, no border — just padding and layout

const cardVariantStyles: Record<CardVariant, string> = {
  default: "bg-white border border-slate-200 shadow-sm",
  flat:    "bg-white border border-slate-200",
  ghost:   "bg-transparent",
};

// ------------------------------------------------------------
// Card
// ------------------------------------------------------------

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual style of the card */
  variant?: CardVariant;
  children: ReactNode;
}

export function Card({
  variant = "default",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        cardVariantStyles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// CardHeader
// ------------------------------------------------------------

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ className, children, ...rest }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-5 pt-5 pb-3 flex flex-col gap-1",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// CardTitle
// ------------------------------------------------------------

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  /** Renders as a different heading level while keeping the same visual style */
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({
  as: Tag = "h3",
  className,
  children,
  ...rest
}: CardTitleProps) {
  return (
    <Tag
      className={cn(
        "text-slate-900 font-semibold text-base leading-snug",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ------------------------------------------------------------
// CardBody
// ------------------------------------------------------------

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardBody({ className, children, ...rest }: CardBodyProps) {
  return (
    <div
      className={cn(
        "px-5 py-3 text-slate-600 text-sm leading-relaxed",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------
// CardFooter
// ------------------------------------------------------------

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ className, children, ...rest }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-5 pb-5 pt-3 flex items-center gap-3",
        "border-t border-slate-100",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}