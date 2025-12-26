"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: "success" | "warning" | "info" | "highlight";
};

const toneConfig: Record<NotificationItem["tone"], {
  icon: LucideIcon;
  iconClass: string;
  badgeClass: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    badgeClass: "bg-emerald-500/10",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    badgeClass: "bg-amber-500/10",
  },
  info: {
    icon: Info,
    iconClass: "text-cyan-600",
    badgeClass: "bg-cyan-500/10",
  },
  highlight: {
    icon: Sparkles,
    iconClass: "text-indigo-600",
    badgeClass: "bg-indigo-500/10",
  },
};

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Notificacoes recentes
          </p>
          <p className="text-xs text-slate-500">Alertas importantes do dia</p>
        </div>
        <span className="text-xs text-slate-400">Hoje</span>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200/80 bg-white/60 px-4 py-5 text-sm text-slate-500">
            Nenhum alerta recente. Tudo sob controle por aqui.
          </div>
        ) : (
          items.map((item) => {
            const config = toneConfig[item.tone];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm shadow-indigo-500/10"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    config.badgeClass
                  )}
                >
                  <Icon className={cn("h-5 w-5", config.iconClass)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <span className="text-xs text-slate-400">{item.time}</span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
