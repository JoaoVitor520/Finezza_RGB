import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CLINIC_SLUG =
  process.env.NEXT_PUBLIC_CLINIC_SLUG ?? "finezza-rb";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  organizer?: { displayName?: string };
};

type TokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

const formatTime = (value: Date | null) =>
  value
    ? value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Dia todo";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing environment variables." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing authorization token." },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const url = new URL(request.url);
  const clinicSlug = url.searchParams.get("clinic") ?? DEFAULT_CLINIC_SLUG;

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", clinicSlug)
    .maybeSingle();

  if (clinicError || !clinic) {
    return NextResponse.json(
      { error: "Clinic not found." },
      { status: 404 }
    );
  }

  const { data: tokenRowRaw } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  const tokenRow = tokenRowRaw as TokenRow | null;

  if (!tokenRow?.access_token) {
    return NextResponse.json({
      connected: false,
      events: [],
      lastConflict: null,
      lastSyncAt: null,
      nextSyncAt: null,
    });
  }

  let accessToken = tokenRow.access_token;
  const now = Date.now();
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
  const isExpired = expiresAt > 0 && expiresAt <= now + 5 * 60 * 1000;

  if (isExpired && !tokenRow.refresh_token) {
    return NextResponse.json(
      { error: "Google token expired. Reconnect required." },
      { status: 401 }
    );
  }

  if (isExpired && tokenRow.refresh_token) {
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRow.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      return NextResponse.json(
        { error: "Failed to refresh Google token." },
        { status: 401 }
      );
    }

    const refreshed = (await refreshResponse.json()) as {
      access_token: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    };

    accessToken = refreshed.access_token;
    const refreshedExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : null;

    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: refreshedExpiresAt,
        scope: refreshed.scope ?? null,
        token_type: refreshed.token_type ?? null,
      })
      .eq("clinic_id", clinic.id);
  }

  const timeMin = new Date();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const eventsUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  );
  eventsUrl.searchParams.set("timeMin", timeMin.toISOString());
  eventsUrl.searchParams.set("timeMax", timeMax.toISOString());
  eventsUrl.searchParams.set("maxResults", "6");
  eventsUrl.searchParams.set("singleEvents", "true");
  eventsUrl.searchParams.set("orderBy", "startTime");

  const eventsResponse = await fetch(eventsUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!eventsResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Google Calendar events." },
      { status: 400 }
    );
  }

  const eventsPayload = (await eventsResponse.json()) as {
    items?: GoogleCalendarEvent[];
  };

  const rawEvents = eventsPayload.items ?? [];
  const mappedEvents = rawEvents
    .filter((item) => item.status !== "cancelled")
    .map((item) => {
      const startValue = item.start?.dateTime ?? item.start?.date ?? null;
      const startDate = startValue ? new Date(startValue) : null;
      return {
        id: item.id,
        title: item.summary ?? "Consulta",
        time: formatTime(startDate),
        patient: item.organizer?.displayName ?? "Paciente",
        status: item.status === "confirmed" ? "confirmed" : "pending",
        startKey: startDate ? startDate.toISOString() : item.id,
      };
    });

  const conflictCounts = new Map<string, number>();
  mappedEvents.forEach((event) => {
    conflictCounts.set(event.startKey, (conflictCounts.get(event.startKey) ?? 0) + 1);
  });

  const events = mappedEvents.map((event) => ({
    id: event.id,
    title: event.title,
    time: event.time,
    patient: event.patient,
    status: conflictCounts.get(event.startKey) && conflictCounts.get(event.startKey)! > 1
      ? "conflict"
      : event.status,
  }));

  const lastConflict = events.find((event) => event.status === "conflict") ?? null;

  return NextResponse.json({
    connected: true,
    events,
    lastConflict,
    lastSyncAt: new Date().toISOString(),
    nextSyncAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}
