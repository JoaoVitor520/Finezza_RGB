"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { useActiveClinic } from "../../hooks/useActiveClinic";
import { cn } from "../../lib/utils";

export function ClinicSwitcher({ className }: { className?: string }) {
  const { clinics, activeClinic, setActiveSlug, isLoading } =
    useActiveClinic();

  if (isLoading || clinics.length === 0 || !activeClinic) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm shadow-indigo-500/10 backdrop-blur",
        className
      )}
    >
      <Building2 className="h-4 w-4 text-indigo-500" />
      <select
        value={activeClinic.slug}
        onChange={(event) => setActiveSlug(event.target.value)}
        className="flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none"
      >
        {clinics.map((clinic) => (
          <option key={clinic.id} value={clinic.slug}>
            {clinic.name}
          </option>
        ))}
      </select>
    </div>
  );
}
