"use client";

import * as React from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  patient: string;
  status: "confirmed" | "pending" | "conflict";
};

type GoogleEventsResponse = {
  connected: boolean;
  events: CalendarEvent[];
  lastConflict: CalendarEvent | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
};

type UseGoogleCalendarResult = {
  isConnecting: boolean;
  isConnected: boolean;
  events: CalendarEvent[];
  lastConflict: CalendarEvent | null;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
};

export function useGoogleCalendar(): UseGoogleCalendarResult {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [lastConflict, setLastConflict] = React.useState<CalendarEvent | null>(
    null
  );
  const [lastSyncAt, setLastSyncAt] = React.useState<Date | null>(null);
  const [nextSyncAt, setNextSyncAt] = React.useState<Date | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch("/api/google/events", { cache: "no-store" });
      if (!response.ok) {
        setIsConnected(false);
        setEvents([]);
        setLastConflict(null);
        setLastSyncAt(null);
        setNextSyncAt(null);
        return;
      }

      const payload = (await response.json()) as GoogleEventsResponse;
      setIsConnected(payload.connected);
      setEvents(payload.events ?? []);
      setLastConflict(payload.lastConflict ?? null);
      setLastSyncAt(payload.lastSyncAt ? new Date(payload.lastSyncAt) : null);
      setNextSyncAt(payload.nextSyncAt ? new Date(payload.nextSyncAt) : null);
    } catch {
      setIsConnected(false);
      setEvents([]);
      setLastConflict(null);
      setLastSyncAt(null);
      setNextSyncAt(null);
    }
  }, []);

  const connect = React.useCallback(async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    if (typeof window !== "undefined") {
      window.location.href = "/api/google/connect";
    }
  }, [isConnecting]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("google")) return;

    params.delete("google");
    const nextUrl = `${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    window.history.replaceState({}, "", nextUrl);
    void refresh();
  }, [refresh]);

  const reset = React.useCallback(() => {
    setIsConnected(false);
    setEvents([]);
    setLastConflict(null);
    setLastSyncAt(null);
    setNextSyncAt(null);
  }, []);

  return {
    isConnecting,
    isConnected,
    events,
    lastConflict,
    lastSyncAt,
    nextSyncAt,
    connect,
    refresh,
    reset,
  };
}
