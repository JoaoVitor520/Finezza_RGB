"use client";

import { Activity, Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";

const chairs = [
  { label: "Sala 01", value: 82, status: "Alta", tone: "text-teal-600" },
  { label: "Sala 02", value: 64, status: "Estavel", tone: "text-cyan-600" },
  { label: "Sala 03", value: 91, status: "Critica", tone: "text-rose-600" },
];

export function ChairUtilization() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.12),transparent_55%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ocupacao das salas
              </p>
              <p className="text-xs text-slate-500">
                Distribuicao em tempo real
              </p>
            </div>
          </div>
          <Badge variant="info">Hoje</Badge>
        </div>

        <div className="mt-5 space-y-4">
          {chairs.map((chair) => (
            <div key={chair.label}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {chair.label}
                </span>
                <span className={chair.tone}>{chair.status}</span>
              </div>
              <Progress value={chair.value} className="mt-2" />
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-500 shadow-sm shadow-indigo-500/10">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Tempo medio por consulta
          </span>
          <span className="text-sm font-semibold text-slate-900">42 min</span>
        </div>
      </div>
    </Card>
  );
}
