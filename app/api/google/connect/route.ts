import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_CLINIC_SLUG =
  process.env.NEXT_PUBLIC_CLINIC_SLUG ?? "finezza-rb";

export async function POST(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!clientId || !redirectUri || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing OAuth environment variables." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const clinicSlug = url.searchParams.get("clinic") ?? DEFAULT_CLINIC_SLUG;
  const state = randomUUID();
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

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: "Invalid user session." },
      { status: 401 }
    );
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, slug, owner_id")
    .eq("slug", clinicSlug)
    .maybeSingle();

  if (!clinic) {
    return NextResponse.json(
      { error: "Clinic not found." },
      { status: 404 }
    );
  }

  if (clinic.owner_id !== authData.user.id) {
    return NextResponse.json(
      { error: "Only the clinic owner can connect Google Calendar." },
      { status: 403 }
    );
  }

  const cookieStore = cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });
  cookieStore.set("google_oauth_clinic", clinicSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });
  cookieStore.set("google_oauth_user", authData.user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/calendar.readonly"
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.json({ url: authUrl.toString() });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
