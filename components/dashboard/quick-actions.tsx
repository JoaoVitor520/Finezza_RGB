"use client";

import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  CalendarPlus,
  FilePlus2,
  Receipt,
  UserCheck,
} from "lucide-react";

const actions = [
  {
    label: "Check-in rapido",
    description: "Registrar chegada",
    icon: UserCheck,
  },
  {
    label: "Nova avaliacao",
    description: "Abrir prontuario",
    icon: FilePlus2,
  },
  {
    label: "Nova consulta",
    description: "Agendar encaixe",
    icon: CalendarPlus,
  },
  {
    label: "Emitir recibo",
    description: "Financeiro",
    icon: Receipt,
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="relative h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_55%)]" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Atalhos inteligentes
              </p>
              <p className="text-xs text-slate-500">
                Acoes mais usadas na clinica
              </p>
            </div>
            <Badge variant="default">Hoje</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="secondary"
                  className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left whitespace-normal"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {action.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {action.description}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">Abrir</span>
                </Button>
              );
            })}
          </div>

          <div className="mt-auto pt-5 text-xs text-slate-500">
            <p>Tempo medio de check-in: 3 min</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
