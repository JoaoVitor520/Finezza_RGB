"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  indicatorClassName?: string;
};

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const safeMax = max <= 0 ? 100 : max;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200/70",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 transition-[width] duration-700",
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
