"use client";

import * as React from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  patient: string;
  status: "confirmed" | "pending" | "conflict";
};

type UseGoogleCalendarResult = {
  isConnecting: boolean;
  isConnected: boolean;
  events: CalendarEvent[];
  lastConflict: CalendarEvent | null;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  connect: () => Promise<void>;
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

  const connect = React.useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    try {
      // TODO: Replace with real OAuth2 flow + token storage (Google API / Supabase).
      await new Promise((resolve) => setTimeout(resolve, 900));

      setIsConnected(true);
      const now = new Date();
      setLastSyncAt(now);
      setNextSyncAt(new Date(now.getTime() + 1000 * 60 * 30));

      // TODO: Replace with Google Calendar API fetch.
      const mockEvents: CalendarEvent[] = [
        {
          id: "evt-1",
          title: "Lentes de contato",
          time: "09:00",
          patient: "Mariana Costa",
          status: "confirmed",
        },
        {
          id: "evt-2",
          title: "Consulta estetica",
          time: "10:30",
          patient: "Joao Pereira",
          status: "pending",
        },
        {
          id: "evt-3",
          title: "Revisao ortodontica",
          time: "11:30",
          patient: "Carla Souza",
          status: "conflict",
        },
      ];

      setEvents(mockEvents);
      setLastConflict(
        mockEvents.find((event) => event.status === "conflict") ?? null
      );
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

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
    reset,
  };
}
