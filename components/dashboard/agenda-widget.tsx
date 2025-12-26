"use client";

import { Calendar, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import type { CalendarEvent } from "../../hooks/useGoogleCalendar";
import { cn } from "../../lib/utils";

type AgendaWidgetProps = {
  events: CalendarEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  onSync: () => void | Promise<void>;
};

const statusConfig = {
  confirmed: { label: "Confirmado", variant: "success" as const },
  pending: { label: "Pendente", variant: "warning" as const },
  conflict: { label: "Conflito", variant: "danger" as const },
};

export function AgendaWidget({
  events,
  isConnected,
  isConnecting,
  lastSyncAt,
  nextSyncAt,
  onSync,
}: AgendaWidgetProps) {
  const formatTime = (value: Date | null) => {
    if (!value) return "nunca";

    return value.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const connectionLabel = isConnecting
    ? "Sincronizando"
    : isConnected
    ? "Conectado"
    : "Nao conectado";

  const connectionVariant = isConnecting
    ? "info"
    : isConnected
    ? "success"
    : "warning";

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-transparent text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Proximas consultas
              </p>
              <p className="text-xs text-slate-500">
                Google Calendar integrado
              </p>
            </div>
          </div>

          <Badge variant={connectionVariant}>{connectionLabel}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200/80 bg-white/60 px-4 py-5 text-sm text-slate-500">
              Nenhuma consulta carregada ainda. Sincronize para ver sua agenda.
            </div>
          ) : (
            events.map((event) => {
              const config = statusConfig[event.status];
              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm",
                    event.status === "conflict"
                      ? "shadow-rose-500/10"
                      : "shadow-indigo-500/10"
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.time} - {event.patient}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="glow" onClick={onSync} disabled={isConnecting}>
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isConnecting
              ? "Sincronizando..."
              : isConnected
              ? "Atualizar Google Agenda"
              : "Sincronizar Google Agenda"}
          </Button>

          <div className="text-right text-xs text-slate-500">
            <p>Ultima atualizacao: {formatTime(lastSyncAt)}</p>
            <p className="text-slate-400">
              Proxima: {formatTime(nextSyncAt)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
