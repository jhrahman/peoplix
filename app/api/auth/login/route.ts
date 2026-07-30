import { NextResponse } from "next/server";
import { createCookieClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import { sessionPayload } from "@/lib/auth/session-payload";
import {
  clearLoginFailures,
  isLoginLockedOut,
  recordLoginFailure,
} from "@/lib/cache/ratelimit";

// Email + password sign-in for API clients. The web app's login form talks to
// Supabase Auth directly from the browser and doesn't need this route - it exists
// so scripted callers (Postman, k6, CI) have one documented HTTP endpoint that
// both sets the session cookie and returns the tokens in the response body.
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (await isLoginLockedOut(email)) {
    return NextResponse.json(
      { error: "Too many failed login attempts for this email. Try again in a few seconds." },
      { status: 429 },
    );
  }

  // The cookie-bound client, not createClient(): signing in is exactly the case
  // that needs to write the session cookie, so a browser or a cookie-jar-based
  // client keeps working with no extra step.
  const supabase = await createCookieClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    await recordLoginFailure(email);
    // Supabase reports bad credentials as a 400; 401 is the more useful answer
    // here and matches every other route in this app ("no valid session").
    return NextResponse.json(
      { error: error?.message ?? "Invalid email or password" },
      { status: 401 },
    );
  }

  await clearLoginFailures(email);

  const profile = await getProfileById(supabase, data.session.user.id);

  return NextResponse.json({ data: sessionPayload(data.session, profile) });
}
