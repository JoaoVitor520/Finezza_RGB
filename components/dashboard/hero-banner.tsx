"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Sparkles, Timer, Users } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

const chips = [
  { label: "12 consultas hoje", tone: "bg-teal-500/15 text-teal-700" },
  { label: "2 encaixes em espera", tone: "bg-cyan-500/15 text-cyan-700" },
  { label: "78% ocupacao", tone: "bg-indigo-500/15 text-indigo-700" },
];

const highlights = [
  {
    label: "Satisfacao media",
    value: "4.9/5",
    icon: Sparkles,
    tone: "bg-indigo-500/10 text-indigo-600",
  },
  {
    label: "Pontualidade",
    value: "92%",
    icon: Timer,
    tone: "bg-teal-500/10 text-teal-600",
  },
  {
    label: "Retornos confirmados",
    value: "18",
    icon: Users,
    tone: "bg-cyan-500/10 text-cyan-600",
  },
];

export function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <div className="relative h-full overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl shadow-indigo-500/15 backdrop-blur-2xl">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-[140px]" />

        <div className="relative flex h-full flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="info" className="px-3 py-1">
              Sistema online
            </Badge>
            <span className="text-xs text-slate-400">Atualizado agora</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Cockpit premium
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Bom dia, Dr. Rafael.
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sua clinica esta em ritmo alto. Foque em experiencias sem
                atraso e finalizacoes impecaveis.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip.label}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${chip.tone}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="glow">
                  <CalendarCheck className="h-4 w-4" />
                  Nova consulta
                </Button>
                <Button variant="secondary">Ver agenda</Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="text-base font-semibold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Meta do dia
                  </p>
                  <span className="text-xs font-medium text-teal-600">
                    78% concluido
                  </span>
                </div>
                <Progress value={78} className="mt-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
