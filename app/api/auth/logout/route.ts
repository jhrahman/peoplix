import { NextResponse } from "next/server";
import { createClient, createCookieClient } from "@/lib/supabase/server";
import { bearerTokenFrom } from "@/lib/auth/bearer";

// Revokes the caller's session, whichever way they authenticated.
export async function POST(request: Request) {
  const bearerToken = bearerTokenFrom(request.headers.get("authorization"));

  if (bearerToken) {
    // `auth.admin` here is only a namespace - no service-role key is involved.
    // admin.signOut(jwt) is the one call that revokes a specific access token
    // server-side, which is what a cookie-less API client needs: auth.signOut()
    // would find no local session and quietly report success without revoking
    // anything.
    const supabase = await createClient();
    const { error } = await supabase.auth.admin.signOut(bearerToken);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ data: { signed_out: true } });
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { signed_out: true } });
}
