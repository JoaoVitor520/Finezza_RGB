"use client";

import * as React from "react";
import { animate, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  prefix?: string;
  suffix?: string;
  accent?: "teal" | "indigo";
  delay?: number;
  format?: (value: number) => string;
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  prefix,
  suffix,
  accent = "teal",
  delay = 0,
  format,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.4,
      ease: "easeOut",
      delay,
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [value, delay]);

  const rounded = Math.round(displayValue);
  const formatted = format
    ? format(rounded)
    : `${prefix ?? ""}${rounded.toLocaleString("pt-BR")}${suffix ?? ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden",
          accent === "teal"
            ? "shadow-teal-500/20"
            : "shadow-indigo-500/20"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300",
            accent === "teal"
              ? "bg-gradient-to-br from-teal-400/40 via-cyan-400/20 to-transparent"
              : "bg-gradient-to-br from-indigo-400/40 via-sky-400/20 to-transparent",
            "opacity-0 group-hover:opacity-100"
          )}
        />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {formatted}
            </p>
            {trend ? (
              <p className="mt-2 text-xs text-teal-600">{trend}</p>
            ) : null}
          </div>

          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-md ring-1 ring-white/70",
              accent === "teal" ? "text-teal-600" : "text-indigo-600"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}