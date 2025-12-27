"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { HeartPulse, Users, UserPlus } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { SegmentedControl } from "../ui/segmented-control";
import { cn } from "../../lib/utils";
import { useQueryState } from "../../hooks/useQueryState";

type RangeKey = "6m" | "12m";
type MetricKey = "total" | "new" | "return";
type SegmentKey = "geral" | "premium" | "corporativo";

const rangeOptions = [
  { id: "6m", label: "Ultimos 6 meses" },
  { id: "12m", label: "Ultimos 12 meses" },
];

const segmentOptions = [
  { id: "geral", label: "Geral" },
  { id: "premium", label: "Premium" },
  { id: "corporativo", label: "Corporativo" },
];

const segmentScale: Record<SegmentKey, number> = {
  geral: 1,
  premium: 0.68,
  corporativo: 0.52,
};

// TODO: Replace with backend analytics data (Supabase).
const chartData: Record<
  RangeKey,
  { labels: string[]; total: number[]; new: number[]; return: number[] }
> = {
  "6m": {
    labels: ["Mai", "Jun", "Jul", "Ago", "Set", "Out"],
    total: [960, 1012, 1084, 1140, 1208, 1284],
    new: [72, 84, 76, 92, 88, 96],
    return: [62, 64, 68, 66, 70, 71],
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
    total: [740, 780, 820, 860, 910, 960, 1012, 1084, 1140, 1208, 1248, 1284],
    new: [58, 62, 68, 70, 76, 72, 84, 76, 92, 88, 90, 96],
    return: [54, 57, 59, 61, 64, 62, 64, 68, 66, 70, 69, 71],
  },
};

const metricConfig = [
  {
    id: "total" as const,
    label: "Total de pacientes",
    value: "1.284",
    delta: "+4.2%",
    icon: Users,
    accent: "text-indigo-600",
    bg: "bg-indigo-500/10",
  },
  {
    id: "new" as const,
    label: "Novos no mes",
    value: "96",
    delta: "+12%",
    icon: UserPlus,
    accent: "text-teal-600",
    bg: "bg-teal-500/10",
  },
  {
    id: "return" as const,
    label: "Retorno ativo",
    value: "71%",
    delta: "+6%",
    icon: HeartPulse,
    accent: "text-cyan-600",
    bg: "bg-cyan-500/10",
  },
];

const distributions = {
  age: [
    { label: "18-30 anos", value: 28 },
    { label: "31-45 anos", value: 42 },
    { label: "46-60 anos", value: 22 },
    { label: "60+ anos", value: 8 },
  ],
  gender: [
    { label: "Feminino", value: 62 },
    { label: "Masculino", value: 34 },
    { label: "Outro", value: 4 },
  ],
};

type PatientsAnalyticsData = {
  chartData: typeof chartData;
  metrics: {
    total: { value: number; delta: string };
    new: { value: number; delta: string };
    returnRate: { value: number; delta: string };
  };
  distributions: typeof distributions;
  updatedAtLabel: string;
};

export function PatientsAnalytics({ data }: { data?: PatientsAnalyticsData }) {
  const [range, setRange] = useQueryState<RangeKey>(
    "patientsRange",
    "6m",
    ["6m", "12m"]
  );
  const [metric, setMetric] = useQueryState<MetricKey>(
    "patientsMetric",
    "total",
    ["total", "new", "return"]
  );
  const [segment, setSegment] = useQueryState<SegmentKey>(
    "patientsSegment",
    "geral",
    ["geral", "premium", "corporativo"]
  );
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const selected = (data?.chartData ?? chartData)[range];
  const scaledValues = selected[metric].map((value) =>
    Math.round(value * segmentScale[segment])
  );
  const metrics = metricConfig.map((item) => {
    if (!data?.metrics) return item;
    if (item.id === "total") {
      return {
        ...item,
        value: data.metrics.total.value.toLocaleString("pt-BR"),
        delta: data.metrics.total.delta,
      };
    }
    if (item.id === "new") {
      return {
        ...item,
        value: data.metrics.new.value.toLocaleString("pt-BR"),
        delta: data.metrics.new.delta,
      };
    }
    return {
      ...item,
      value: `${data.metrics.returnRate.value}%`,
      delta: data.metrics.returnRate.delta,
    };
  });
  const distributionsData = data?.distributions ?? distributions;
  const updatedLabel = data?.updatedAtLabel ?? "Atualizado agora";

  const max = Math.max(...scaledValues) * 1.1;
  const min = Math.min(...scaledValues) * 0.9;
  const width = 560;
  const height = 200;
  const padding = 24;

  const points = scaledValues.map((value, index) => {
    const x =
      padding + (index / (scaledValues.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((value - min) / (max - min)) * (height - padding * 2);
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
    const index = Math.round(ratio * (scaledValues.length - 1));
    setActiveIndex(index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Pacientes</p>
              <p className="text-xs text-slate-500">
                Evolucao e comportamento do funil
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={rangeOptions}
                value={range}
                onValueChange={(value) => setRange(value as RangeKey)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="space-y-3">
              {metrics.map((item) => {
                const Icon = item.icon;
                const active = metric === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMetric(item.id)}
                    className={cn(
                      "w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left shadow-sm shadow-indigo-500/10 transition",
                      active
                        ? "ring-2 ring-indigo-500/30"
                        : "hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            item.bg,
                            item.accent
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs text-slate-500">
                            {item.label}
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            {item.value}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-teal-600">
                        {item.delta}
                      </span>
                    </div>
                  </button>
                );
              })}

              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-500 shadow-sm shadow-indigo-500/10">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Segmento ativo
                </p>
                <SegmentedControl
                  options={segmentOptions}
                  value={segment}
                  onValueChange={(value) => setSegment(value as SegmentKey)}
                  className="mt-3"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-indigo-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span>Volume selecionado</span>
                </div>
                <Badge variant="info">{updatedLabel}</Badge>
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
                      id="patientsArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="rgba(99,102,241,0.35)" />
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
                  <path d={areaPath} fill="url(#patientsArea)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgba(79,70,229,0.9)"
                    strokeWidth="2.5"
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
                      {hoverPoint.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Distribuicao por idade
                  </p>
                  {distributionsData.age.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{item.label}</span>
                        <span className="text-slate-600">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="mt-2" />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Distribuicao por genero
                  </p>
                  {distributionsData.gender.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{item.label}</span>
                        <span className="text-slate-600">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
