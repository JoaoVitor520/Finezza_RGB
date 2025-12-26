"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type SegmentOption = {
  id: string;
  label: string;
};

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-white/70",
        className
      )}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onValueChange(option.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
