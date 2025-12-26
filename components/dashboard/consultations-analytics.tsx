"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CalendarClock, CalendarX2, TrendingUp } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { SegmentedControl } from "../ui/segmented-control";
import { cn } from "../../lib/utils";

type RangeKey = "6m" | "12m";
type SegmentKey = "todos" | "premium" | "particular";

const rangeOptions = [
  { id: "6m", label: "Ultimos 6 meses" },
  { id: "12m", label: "Ultimos 12 meses" },
];

const segmentOptions = [
  { id: "todos", label: "Todos" },
  { id: "premium", label: "Premium" },
  { id: "particular", label: "Particular" },
];

const segmentScale: Record<SegmentKey, number> = {
  todos: 1,
  premium: 0.72,
  particular: 0.54,
};

// TODO: Replace with backend analytics data (Supabase).
const chartData: Record<
  RangeKey,
  { labels: string[]; realizadas: number[]; agendadas: number[]; faltas: number[] }
> = {
  "6m": {
    labels: ["Mai", "Jun", "Jul", "Ago", "Set", "Out"],
    realizadas: [112, 118, 124, 132, 140, 148],
    agendadas: [120, 126, 134, 148, 158, 164],
    faltas: [6, 5, 7, 8, 6, 7],
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
    realizadas: [84, 90, 96, 100, 108, 112, 118, 124, 132, 140, 144, 148],
    agendadas: [96, 102, 108, 114, 118, 120, 126, 134, 148, 158, 160, 164],
    faltas: [7, 6, 8, 7, 6, 6, 5, 7, 8, 6, 7, 7],
  },
};

type ConsultationsAnalyticsData = {
  chartData: typeof chartData;
};

export function ConsultationsAnalytics({
  data,
}: {
  data?: ConsultationsAnalyticsData;
}) {
  const [range, setRange] = React.useState<RangeKey>("6m");
  const [segment, setSegment] = React.useState<SegmentKey>("todos");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const selected = (data?.chartData ?? chartData)[range];
  const scale = segmentScale[segment];
  const realizadas = selected.realizadas.map((value) => Math.round(value * scale));
  const agendadas = selected.agendadas.map((value) => Math.round(value * scale));
  const faltas = selected.faltas.map((value) => Math.max(1, Math.round(value * scale)));

  const width = 560;
  const height = 200;
  const padding = 24;
  const groupWidth = (width - padding * 2) / selected.labels.length;
  const barWidth = groupWidth * 0.28;
  const maxValue = Math.max(...agendadas, ...realizadas) * 1.2;

  const linePoints = agendadas.map((value, index) => {
    const x = padding + index * groupWidth + groupWidth / 2;
    const y =
      height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y, value };
  });

  const linePath = linePoints
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const hoverPoint =
    activeIndex !== null ? linePoints[activeIndex] : null;

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    const index = Math.round(ratio * (selected.labels.length - 1));
    setActiveIndex(index);
  };

  const totalRealizadas = realizadas.reduce((sum, value) => sum + value, 0);
  const totalAgendadas = agendadas.reduce((sum, value) => sum + value, 0);
  const totalFaltas = faltas.reduce((sum, value) => sum + value, 0);
  const comparecimento = Math.round(
    (totalRealizadas / Math.max(totalAgendadas, 1)) * 100
  );

  const statCards = [
    {
      label: "Realizadas",
      value: totalRealizadas.toLocaleString("pt-BR"),
      icon: CalendarCheck,
      tone: "text-teal-600",
      bg: "bg-teal-500/10",
    },
    {
      label: "Agendadas",
      value: totalAgendadas.toLocaleString("pt-BR"),
      icon: CalendarClock,
      tone: "text-indigo-600",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Faltas",
      value: totalFaltas.toLocaleString("pt-BR"),
      icon: CalendarX2,
      tone: "text-rose-600",
      bg: "bg-rose-500/10",
    },
    {
      label: "Media mensal",
      value: Math.round(totalRealizadas / selected.labels.length).toString(),
      icon: TrendingUp,
      tone: "text-cyan-600",
      bg: "bg-cyan-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.05 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Consultas</p>
              <p className="text-xs text-slate-500">
                Ritmo de agenda e ausencias
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={segmentOptions}
                value={segment}
                onValueChange={(value) => setSegment(value as SegmentKey)}
              />
              <SegmentedControl
                options={rangeOptions}
                value={range}
                onValueChange={(value) => setRange(value as RangeKey)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-indigo-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    Realizadas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Agendadas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Faltas
                  </span>
                </div>
                <Badge variant="success">{comparecimento}% presenca</Badge>
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

                  {selected.labels.map((_, index) => {
                    const baseX = padding + index * groupWidth;
                    const realizedHeight =
                      (realizadas[index] / maxValue) * (height - padding * 2);
                    const missesHeight =
                      (faltas[index] / maxValue) * (height - padding * 2);

                    return (
                      <g key={index}>
                        <rect
                          x={baseX + groupWidth * 0.22}
                          y={height - padding - realizedHeight}
                          width={barWidth}
                          height={realizedHeight}
                          rx={6}
                          fill="rgba(20,184,166,0.75)"
                        />
                        <rect
                          x={baseX + groupWidth * 0.55}
                          y={height - padding - missesHeight}
                          width={barWidth}
                          height={missesHeight}
                          rx={6}
                          fill="rgba(244,63,94,0.7)"
                        />
                      </g>
                    );
                  })}

                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgba(79,70,229,0.9)"
                    strokeWidth="2"
                  />

                  {linePoints.map((point, index) => (
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
                      {hoverPoint.value.toLocaleString("pt-BR")} agendadas
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

            <div className="grid gap-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            card.bg,
                            card.tone
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs text-slate-500">{card.label}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {card.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-500 shadow-sm shadow-indigo-500/10">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Meta de pontualidade
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  94% de consultas no horario
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
