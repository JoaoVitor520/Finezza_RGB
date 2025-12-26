"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SegmentedControl } from "../ui/segmented-control";
import { cn } from "../../lib/utils";

type RangeKey = "6m" | "12m";
type ModeKey = "previsto" | "real";

const rangeOptions = [
  { id: "6m", label: "Ultimos 6 meses" },
  { id: "12m", label: "Ultimos 12 meses" },
];

const modeOptions = [
  { id: "previsto", label: "Previsto" },
  { id: "real", label: "Realizado" },
];

const modeScale: Record<ModeKey, number> = {
  previsto: 1,
  real: 0.92,
};

// TODO: Replace with backend analytics data (Supabase).
const chartData: Record<
  RangeKey,
  { labels: string[]; receitas: number[]; despesas: number[]; saldo: number[] }
> = {
  "6m": {
    labels: ["Mai", "Jun", "Jul", "Ago", "Set", "Out"],
    receitas: [24000, 25200, 26800, 28400, 29600, 31400],
    despesas: [14200, 14800, 15400, 16200, 16800, 17200],
    saldo: [9800, 10400, 11400, 12200, 12800, 14200],
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
    receitas: [
      18200, 19600, 20800, 21800, 23200, 24000, 25200, 26800, 28400, 29600,
      30600, 31400,
    ],
    despesas: [
      11800, 12400, 13200, 13800, 14200, 14200, 14800, 15400, 16200, 16800,
      17000, 17200,
    ],
    saldo: [
      6400, 7200, 7600, 8000, 9000, 9800, 10400, 11400, 12200, 12800, 13600,
      14200,
    ],
  },
};

const seriesConfig = [
  {
    id: "receitas",
    label: "Receitas",
    stroke: "rgba(20,184,166,0.9)",
    dot: "bg-teal-500",
  },
  {
    id: "despesas",
    label: "Despesas",
    stroke: "rgba(248,113,113,0.9)",
    dot: "bg-rose-500",
  },
  {
    id: "saldo",
    label: "Saldo",
    stroke: "rgba(79,70,229,0.9)",
    dot: "bg-indigo-500",
  },
];

export function FinanceForecast() {
  const [range, setRange] = React.useState<RangeKey>("6m");
  const [mode, setMode] = React.useState<ModeKey>("previsto");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const selected = chartData[range];
  const scale = modeScale[mode];
  const receitas = selected.receitas.map((value) => Math.round(value * scale));
  const despesas = selected.despesas.map((value) => Math.round(value * scale));
  const saldo = selected.saldo.map((value) => Math.round(value * scale));

  const width = 560;
  const height = 220;
  const padding = 28;
  const maxValue = Math.max(...receitas, ...despesas, ...saldo) * 1.1;

  const buildPoints = (values: number[]) =>
    values.map((value, index) => {
      const x =
        padding + (index / (values.length - 1)) * (width - padding * 2);
      const y =
        height - padding - (value / maxValue) * (height - padding * 2);
      return { x, y, value };
    });

  const receitasPoints = buildPoints(receitas);
  const despesasPoints = buildPoints(despesas);
  const saldoPoints = buildPoints(saldo);

  const buildPath = (points: { x: number; y: number }[]) =>
    points
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");

  const saldoPath = buildPath(saldoPoints);
  const saldoArea = `${saldoPath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const hoverIndex = activeIndex ?? selected.labels.length - 1;

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    const index = Math.round(ratio * (selected.labels.length - 1));
    setActiveIndex(index);
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Previsao financeira
              </p>
              <p className="text-xs text-slate-500">
                Receitas, despesas e saldo projetado
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={modeOptions}
                value={mode}
                onValueChange={(value) => setMode(value as ModeKey)}
              />
              <SegmentedControl
                options={rangeOptions}
                value={range}
                onValueChange={(value) => setRange(value as RangeKey)}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-indigo-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {seriesConfig.map((series) => (
                  <span
                    key={series.id}
                    className="flex items-center gap-2"
                  >
                    <span className={cn("h-2 w-2 rounded-full", series.dot)} />
                    {series.label}
                  </span>
                ))}
              </div>
              <Badge variant="success" className="flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +9% vs ciclo anterior
              </Badge>
            </div>

            <div
              className="relative mt-4 h-56 w-full"
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
                    id="saldoArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="rgba(79,70,229,0.25)" />
                    <stop offset="100%" stopColor="rgba(79,70,229,0)" />
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
                <path d={saldoArea} fill="url(#saldoArea)" />
                <path
                  d={buildPath(receitasPoints)}
                  fill="none"
                  stroke={seriesConfig[0].stroke}
                  strokeWidth="2.2"
                />
                <path
                  d={buildPath(despesasPoints)}
                  fill="none"
                  stroke={seriesConfig[1].stroke}
                  strokeWidth="2.2"
                />
                <path
                  d={saldoPath}
                  fill="none"
                  stroke={seriesConfig[2].stroke}
                  strokeWidth="2.4"
                />
                {saldoPoints.map((point, index) => (
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

              <div
                className="absolute top-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-lg shadow-indigo-500/10 backdrop-blur"
                style={{
                  left: `${(hoverIndex / (selected.labels.length - 1)) * 100}%`,
                  transform: "translate(-50%, 0)",
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {selected.labels[hoverIndex]}
                </p>
                <div className="mt-2 space-y-1">
                  <p>
                    Receitas:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(receitas[hoverIndex])}
                    </span>
                  </p>
                  <p>
                    Despesas:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(despesas[hoverIndex])}
                    </span>
                  </p>
                  <p>
                    Saldo:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(saldo[hoverIndex])}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {selected.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
