import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";

// "Is this credential good, and who does it belong to?" - the check a test run
// makes once after logging in, before asserting anything role-specific. Accepts
// either an `Authorization: Bearer <access_token>` header or the session cookie.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfileById(supabase, user.id);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      user: { id: user.id, email: user.email ?? null },
      profile,
    },
  });
}
