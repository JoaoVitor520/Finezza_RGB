"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Coins } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

const revenueSeries = [12, 18, 16, 24, 22, 28, 26, 32, 30];

const summaryItems = [
  { label: "Receita recorrente", value: "62%" },
  { label: "Conversao premium", value: "18%" },
  { label: "Ticket medio", value: "R$ 380" },
];

export function RevenuePulse() {
  const width = 180;
  const height = 60;
  const padding = 6;
  const max = Math.max(...revenueSeries);
  const min = Math.min(...revenueSeries);
  const range = max - min || 1;

  const points = revenueSeries.map((value, index) => {
    const x = (index / (revenueSeries.length - 1)) * width;
    const y =
      height -
      ((value - min) / range) * (height - padding * 2) -
      padding;
    return { x, y };
  });

  const linePath = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      whileHover={{ y: -2 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Pulso financeiro
                </p>
                <p className="text-xs text-slate-500">
                  Receita dos ultimos 9 dias
                </p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              +14%
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Receita estimada
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                R$ 28.4k
              </p>
              <p className="mt-2 text-xs text-slate-500">
                +R$ 3.2k vs semana passada
              </p>
            </div>

            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(20,184,166,0.35)" />
                  <stop offset="100%" stopColor="rgba(20,184,166,0)" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#pulseFill)" />
              <path
                d={linePath}
                fill="none"
                stroke="rgba(15,118,110,0.8)"
                strokeWidth="2"
              />
              {lastPoint ? (
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="3"
                  fill="rgba(15,118,110,0.9)"
                />
              ) : null}
            </svg>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-500 shadow-sm shadow-indigo-500/10"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
