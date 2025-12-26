"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { SegmentedControl } from "../ui/segmented-control";

type PeriodKey = "mes" | "trimestre" | "ano";
type CategoryKey = "todos" | "estetica" | "clinica" | "orto";

const periodOptions = [
  { id: "mes", label: "Mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "ano", label: "Ano" },
];

const categoryOptions = [
  { id: "todos", label: "Todos" },
  { id: "estetica", label: "Estetica" },
  { id: "clinica", label: "Clinica" },
  { id: "orto", label: "Ortodontia" },
];

const periodScale: Record<PeriodKey, number> = {
  mes: 1,
  trimestre: 2.4,
  ano: 5.2,
};

// TODO: Replace with backend analytics data (Supabase).
const procedureData: Record<
  CategoryKey,
  { label: string; value: number; color: string }[]
> = {
  todos: [
    { label: "Lentes de contato", value: 42, color: "stroke-indigo-500" },
    { label: "Clareamento", value: 34, color: "stroke-cyan-500" },
    { label: "Ortodontia fixa", value: 28, color: "stroke-teal-500" },
    { label: "Implantes", value: 22, color: "stroke-amber-500" },
    { label: "Prevencao", value: 18, color: "stroke-rose-500" },
  ],
  estetica: [
    { label: "Lentes de contato", value: 38, color: "stroke-indigo-500" },
    { label: "Clareamento", value: 28, color: "stroke-cyan-500" },
    { label: "Facetas", value: 22, color: "stroke-teal-500" },
    { label: "Harmonizacao", value: 16, color: "stroke-amber-500" },
  ],
  clinica: [
    { label: "Prevencao", value: 30, color: "stroke-rose-500" },
    { label: "Restauracao", value: 26, color: "stroke-indigo-500" },
    { label: "Canal", value: 18, color: "stroke-cyan-500" },
    { label: "Cirurgia", value: 14, color: "stroke-teal-500" },
  ],
  orto: [
    { label: "Orto fixa", value: 28, color: "stroke-indigo-500" },
    { label: "Alinhadores", value: 24, color: "stroke-cyan-500" },
    { label: "Manutencao", value: 18, color: "stroke-teal-500" },
    { label: "Retencao", value: 12, color: "stroke-amber-500" },
  ],
};

type ProceduresDistributionData = {
  data: typeof procedureData;
  note: string;
};

export function ProceduresDistribution({
  data,
}: {
  data?: ProceduresDistributionData;
}) {
  const [period, setPeriod] = React.useState<PeriodKey>("mes");
  const [category, setCategory] = React.useState<CategoryKey>("todos");

  const scale = periodScale[period];
  const source = data?.data ?? procedureData;
  const items = source[category].map((item) => ({
    ...item,
    value: Math.round(item.value * scale),
  }));
  const note = data?.note ?? "Estetica cresce 18% vs periodo anterior";

  const total = Math.max(
    items.reduce((sum, item) => sum + item.value, 0),
    1
  );
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Procedimentos realizados
              </p>
              <p className="text-xs text-slate-500">
                Mix e participacao por especialidade
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                options={categoryOptions}
                value={category}
                onValueChange={(value) => setCategory(value as CategoryKey)}
              />
              <SegmentedControl
                options={periodOptions}
                value={period}
                onValueChange={(value) => setPeriod(value as PeriodKey)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm shadow-indigo-500/10">
              <div className="flex items-center justify-between">
                <Badge variant="info">Top procedimentos</Badge>
                <span className="text-xs text-slate-400">
                  {items.length} categorias
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <g transform="rotate(-90 100 100)">
                    {items.map((item) => {
                      const length = (item.value / total) * circumference;
                      const dasharray = `${length} ${circumference - length}`;
                      const dashoffset = -offset;
                      offset += length;
                      return (
                        <circle
                          key={item.label}
                          cx="100"
                          cy="100"
                          r={radius}
                          fill="transparent"
                          strokeWidth="16"
                          strokeLinecap="round"
                          className={item.color}
                          strokeDasharray={dasharray}
                          strokeDashoffset={dashoffset}
                        />
                      );
                    })}
                  </g>
                  <circle
                    cx="100"
                    cy="100"
                    r="52"
                    fill="white"
                    opacity="0.9"
                  />
                  <text
                    x="100"
                    y="96"
                    textAnchor="middle"
                    className="fill-slate-900 text-lg font-semibold"
                  >
                    {total}
                  </text>
                  <text
                    x="100"
                    y="118"
                    textAnchor="middle"
                    className="fill-slate-500 text-xs"
                  >
                    procedimentos
                  </text>
                </svg>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{item.label}</span>
                    <span className="text-slate-600">
                      {Math.round((item.value / total) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(item.value / total) * 100}
                    className="mt-2"
                    indicatorClassName={item.color.replace("stroke", "bg")}
                  />
                </div>
              ))}
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-500 shadow-sm shadow-indigo-500/10">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Observacao
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {note}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
