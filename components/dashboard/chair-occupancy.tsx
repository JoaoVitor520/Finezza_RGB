"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, Clock3, Sofa } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SegmentedControl } from "../ui/segmented-control";

type RangeKey = "6m" | "12m";
type ShiftKey = "dia" | "manha" | "tarde" | "noite";

const rangeOptions = [
  { id: "6m", label: "Ultimos 6 meses" },
  { id: "12m", label: "Ultimos 12 meses" },
];

const shiftOptions = [
  { id: "dia", label: "Dia todo" },
  { id: "manha", label: "Manha" },
  { id: "tarde", label: "Tarde" },
  { id: "noite", label: "Noite" },
];

// TODO: Replace with backend analytics data (Supabase).
const chartData: Record<
  RangeKey,
  { labels: string[]; dia: number[]; manha: number[]; tarde: number[]; noite: number[] }
> = {
  "6m": {
    labels: ["Mai", "Jun", "Jul", "Ago", "Set", "Out"],
    dia: [68, 72, 76, 78, 82, 84],
    manha: [64, 66, 70, 73, 75, 78],
    tarde: [70, 74, 78, 80, 83, 86],
    noite: [52, 56, 58, 60, 62, 65],
  },
  "12m": {
    labels: [
      "Nov",
      "Dez",
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
    ],
    dia: [58, 60, 62, 64, 66, 68, 72, 76, 78, 82, 83, 84],
    manha: [54, 56, 58, 60, 62, 64, 66, 70, 72, 74, 76, 78],
    tarde: [60, 62, 64, 66, 68, 70, 74, 78, 80, 82, 84, 86],
    noite: [46, 48, 50, 52, 54, 55, 58, 60, 61, 62, 64, 65],
  },
};

type ChairOccupancyData = {
  chartData: typeof chartData;
  stats: {
    activeDays: number;
    hoursTotal: number;
    chairs: number;
  };
};

export function ChairOccupancy({ data }: { data?: ChairOccupancyData }) {
  const [range, setRange] = React.useState<RangeKey>("6m");
  const [shift, setShift] = React.useState<ShiftKey>("dia");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const selected = (data?.chartData ?? chartData)[range];
  const values = selected[shift];
  const width = 560;
  const height = 200;
  const padding = 24;
  const maxValue = 100;

  const points = values.map((value, index) => {
    const x =
      padding + (index / (values.length - 1)) * (width - padding * 2);
    const y =
      height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const hoverPoint = activeIndex !== null ? points[activeIndex] : null;

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    const index = Math.round(ratio * (values.length - 1));
    setActiveIndex(index);
  };

  const statCards = [
    {
      label: "Dias ativos",
      value: data?.stats ? data.stats.activeDays.toString() : "22",
      icon: Clock3,
    },
    {
      label: "Horas totais",
      value: data?.stats ? data.stats.hoursTotal.toString() : "168",
      icon: Activity,
    },
    {
      label: "Cadeiras",
      value: data?.stats ? data.stats.chairs.toString() : "4",
      icon: Sofa,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Taxa de ocupacao de cadeiras
              </p>
              <p className="text-xs text-slate-500">
                Capacidade usada por turno e periodo
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={shiftOptions}
                value={shift}
                onValueChange={(value) => setShift(value as ShiftKey)}
              />
              <SegmentedControl
                options={rangeOptions}
                value={range}
                onValueChange={(value) => setRange(value as RangeKey)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="space-y-3">
              {statCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-500 shadow-sm shadow-indigo-500/10">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Meta recomendada
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  80% de ocupacao diaria
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-indigo-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Taxa de ocupacao (%)
                </div>
                <Badge variant="info">Media {Math.round(
                  values.reduce((sum, value) => sum + value, 0) / values.length
                )}%</Badge>
              </div>

              <div
                className="relative mt-4 h-52 w-full"
                onMouseMove={handleMove}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="occupancyArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
                      <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3].map((line) => (
                    <line
                      key={line}
                      x1={padding}
                      x2={width - padding}
                      y1={padding + line * ((height - padding * 2) / 3)}
                      y2={padding + line * ((height - padding * 2) / 3)}
                      stroke="rgba(148,163,184,0.3)"
                      strokeDasharray="4 6"
                    />
                  ))}
                  <path d={areaPath} fill="url(#occupancyArea)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgba(79,70,229,0.9)"
                    strokeWidth="2.4"
                  />
                  {points.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={activeIndex === index ? 4 : 2.5}
                      fill={
                        activeIndex === index
                          ? "rgba(79,70,229,0.9)"
                          : "rgba(129,140,248,0.7)"
                      }
                    />
                  ))}
                </svg>

                {hoverPoint ? (
                  <div
                    className="absolute -top-2 flex -translate-y-full flex-col gap-1 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-lg shadow-indigo-500/10 backdrop-blur"
                    style={{
                      left: `${(hoverPoint.x / width) * 100}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {selected.labels[activeIndex ?? 0]}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {hoverPoint.value}% ocupacao
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
                {selected.labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
