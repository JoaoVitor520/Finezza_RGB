"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { AgendaWidget } from "../../components/dashboard/agenda-widget";
import { ChairOccupancy } from "../../components/dashboard/chair-occupancy";
import { ConsultationsAnalytics } from "../../components/dashboard/consultations-analytics";
import { FinanceForecast } from "../../components/dashboard/finance-forecast";
import { HeroBanner } from "../../components/dashboard/hero-banner";
import { MetricCard } from "../../components/dashboard/metric-card";
import {
  type NotificationItem,
  NotificationsList,
} from "../../components/dashboard/notifications-list";
import { PatientsAnalytics } from "../../components/dashboard/patients-analytics";
import { ProceduresDistribution } from "../../components/dashboard/procedures-distribution";
import { QuickActions } from "../../components/dashboard/quick-actions";
import { RevenuePulse } from "../../components/dashboard/revenue-pulse";
import { useGoogleCalendar } from "../../hooks/useGoogleCalendar";

const metrics = [
  {
    label: "Faturamento",
    value: 128420,
    icon: DollarSign,
    trend: "+12% vs semana passada",
    accent: "indigo" as const,
    format: (value: number) => `R$ ${value.toLocaleString("pt-BR")}`,
  },
  {
    label: "Pacientes Hoje",
    value: 24,
    icon: Users,
    trend: "+5 confirmacoes",
    accent: "teal" as const,
  },
  {
    label: "Ticket Medio",
    value: 380,
    icon: TrendingUp,
    trend: "+8% no mes",
    accent: "indigo" as const,
    format: (value: number) => `R$ ${value.toLocaleString("pt-BR")}`,
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Paciente Joao confirmou",
    description: "Consulta de estetica as 09:00",
    time: "ha 5 min",
    tone: "success",
  },
  {
    id: "notif-2",
    title: "Estoque de resina baixo",
    description: "Reabastecer ate sexta",
    time: "ha 20 min",
    tone: "warning",
  },
  {
    id: "notif-3",
    title: "Nova avaliacao 5 estrelas",
    description: "Paciente Ana deixou feedback",
    time: "ha 1 h",
    tone: "highlight",
  },
  {
    id: "notif-4",
    title: "Lembrete de retorno",
    description: "Carlos precisa reagendar",
    time: "ha 2 h",
    tone: "info",
  },
];

export default function DashboardPage() {
  const {
    isConnected,
    isConnecting,
    events,
    lastConflict,
    lastSyncAt,
    nextSyncAt,
    connect,
  } = useGoogleCalendar();
  const lastConflictRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!lastConflict || lastConflictRef.current === lastConflict.id) return;

    toast.error("Conflito de agenda detectado", {
      description: `${lastConflict.time} - ${lastConflict.title} (${lastConflict.patient})`,
    });

    lastConflictRef.current = lastConflict.id;
  }, [lastConflict]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <HeroBanner />
        <QuickActions />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} {...metric} delay={index * 0.08} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <motion.div layout className="space-y-6 lg:col-span-2">
          <AgendaWidget
            events={events}
            isConnected={isConnected}
            isConnecting={isConnecting}
            lastSyncAt={lastSyncAt}
            nextSyncAt={nextSyncAt}
            onSync={connect}
          />
          <RevenuePulse />
        </motion.div>
        <motion.div layout className="space-y-6 lg:col-span-1">
          <NotificationsList items={notifications} />
        </motion.div>
      </section>

      <section className="space-y-6">
        <PatientsAnalytics />
        <ConsultationsAnalytics />
        <div className="grid gap-6 lg:grid-cols-2">
          <FinanceForecast />
          <ProceduresDistribution />
        </div>
        <ChairOccupancy />
      </section>
    </motion.div>
  );
}
