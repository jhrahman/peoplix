import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/auth/get-profile";
import type { UserRole } from "@/lib/types";

// Server-side gate for API routes: never trust a client-side role check alone.
export async function requireRole(roles: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const profile = await getProfileById(supabase, user.id);

  if (!profile || !roles.includes(profile.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { supabase, user, profile } as const;
}
