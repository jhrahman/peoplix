import { NextResponse } from "next/server";
import { createCookieClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { sessionPayload } from "@/lib/auth/session-payload";

// Exchanges a refresh token for a fresh access token. A long-running test run
// outlives the ~1 hour access token, so without this the only option is to log in
// again and count a fresh sign-in against Supabase's own auth rate limits.
export async function POST(request: Request) {
  let refreshToken: string | undefined;

  // Body is optional: with no `refresh_token`, the session cookie is used instead.
  try {
    const body = (await request.json()) as { refresh_token?: unknown };
    if (typeof body?.refresh_token === "string" && body.refresh_token.trim()) {
      refreshToken = body.refresh_token.trim();
    }
  } catch {
    // No body / not JSON - fall through to the cookie session.
  }

  const supabase = await createCookieClient();

  const { data, error } = await supabase.auth.refreshSession(
    refreshToken ? { refresh_token: refreshToken } : undefined,
  );

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid or expired refresh token" },
      { status: 401 },
    );
  }

  const profile = await getProfileById(supabase, data.session.user.id);

  return NextResponse.json({ data: sessionPayload(data.session, profile) });
}
