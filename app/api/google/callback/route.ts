import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_CLINIC_SLUG =
  process.env.NEXT_PUBLIC_CLINIC_SLUG ?? "finezza-rb";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase service role key." },
      { status: 500 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Missing Google OAuth environment variables." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(new URL("/?google=error", request.url));
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing OAuth code." },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const clinicSlug =
    cookieStore.get("google_oauth_clinic")?.value ?? DEFAULT_CLINIC_SLUG;
  const oauthUserId = cookieStore.get("google_oauth_user")?.value ?? null;

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "Invalid OAuth state." },
      { status: 400 }
    );
  }

  cookieStore.set("google_oauth_state", "", { maxAge: 0 });
  cookieStore.set("google_oauth_clinic", "", { maxAge: 0 });
  cookieStore.set("google_oauth_user", "", { maxAge: 0 });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: "Failed to exchange OAuth code." },
      { status: 400 }
    );
  }

  const tokenData = (await tokenResponse.json()) as TokenResponse;

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from("clinics")
    .select("id, owner_id")
    .eq("slug", clinicSlug)
    .maybeSingle();

  if (clinicError || !clinic) {
    return NextResponse.json(
      { error: "Clinic not found." },
      { status: 404 }
    );
  }

  const { data: existingToken } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("refresh_token")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  const refreshToken = tokenData.refresh_token ?? existingToken?.refresh_token;
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await supabaseAdmin.from("google_calendar_tokens").upsert(
    {
      clinic_id: clinic.id,
      user_id: oauthUserId ?? clinic.owner_id,
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      scope: tokenData.scope ?? null,
      token_type: tokenData.token_type ?? null,
      expires_at: expiresAt,
    },
    { onConflict: "clinic_id" }
  );

  return NextResponse.redirect(new URL("/?google=connected", request.url));
}
