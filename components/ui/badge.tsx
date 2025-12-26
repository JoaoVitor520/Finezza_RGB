"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-900/10 text-slate-700",
  success: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/15 text-amber-700",
  danger: "bg-rose-500/15 text-rose-700",
  info: "bg-cyan-500/15 text-cyan-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}