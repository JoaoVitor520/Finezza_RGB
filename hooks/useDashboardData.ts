"use client";

import * as React from "react";

export type DashboardAgendaEvent = {
  id: string;
  title: string;
  time: string;
  patient: string;
  status: "confirmed" | "pending" | "conflict";
};

export type DashboardNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: "success" | "warning" | "info" | "highlight";
};

type RangeKey = "6m" | "12m";

type PatientsChartData = Record<
  RangeKey,
  { labels: string[]; total: number[]; new: number[]; return: number[] }
>;

type ConsultationsChartData = Record<
  RangeKey,
  { labels: string[]; realizadas: number[]; agendadas: number[]; faltas: number[] }
>;

type FinanceChartData = Record<
  RangeKey,
  { labels: string[]; receitas: number[]; despesas: number[]; saldo: number[] }
>;

type OccupancyChartData = Record<
  RangeKey,
  { labels: string[]; dia: number[]; manha: number[]; tarde: number[]; noite: number[] }
>;

type ProcedureCategory = "todos" | "estetica" | "clinica" | "orto";

export type DashboardData = {
  metrics: {
    revenue: { value: number; trend: string };
    patientsToday: { value: number; trend: string };
    ticketMedio: { value: number; trend: string };
  };
  agenda: {
    events: DashboardAgendaEvent[];
    connected: boolean;
    lastSyncAt: string | null;
    nextSyncAt: string | null;
    lastConflict: DashboardAgendaEvent | null;
  };
  notifications: DashboardNotification[];
  analytics: {
    patients: {
      chartData: PatientsChartData;
      metrics: {
        total: { value: number; delta: string };
        new: { value: number; delta: string };
        returnRate: { value: number; delta: string };
      };
      distributions: {
        age: { label: string; value: number }[];
        gender: { label: string; value: number }[];
      };
      updatedAtLabel: string;
    };
    consultations: {
      chartData: ConsultationsChartData;
    };
    finance: {
      chartData: FinanceChartData;
    };
    procedures: {
      data: Record<ProcedureCategory, { label: string; value: number; color: string }[]>;
      note: string;
    };
    occupancy: {
      chartData: OccupancyChartData;
      stats: {
        activeDays: number;
        hoursTotal: number;
        chairs: number;
      };
    };
  };
};

type UseDashboardDataResult = {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDashboardData(
  clinicSlug?: string,
  accessToken?: string
): UseDashboardDataResult {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (!accessToken) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      const url = clinicSlug
        ? `/api/dashboard?clinic=${encodeURIComponent(clinicSlug)}`
        : "/api/dashboard";
      const response = await fetch(url, {
        cache: "no-store",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load dashboard data.");
      }
      const payload = (await response.json()) as DashboardData;
      setData(payload);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data.";
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clinicSlug]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}
