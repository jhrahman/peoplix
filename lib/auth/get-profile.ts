import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrSetJSON } from "@/lib/cache/redis";
import type { Profile } from "@/lib/types";

// Shared by every page/route that needs "the caller's own profile row"
// (getCurrentProfile, requireRole, attendance/leave/overtime routes) - without
// this, each of those independently hits Postgres for the same row on every
// request. 60s TTL; writers invalidate `profile:{id}` on every profile change.
export async function getProfileById(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  return getOrSetJSON(`profile:${userId}`, 60, async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<Profile>();
    return data ?? null;
  });
}

// Memoized per request: the dashboard layout and the page it wraps both need
// the session user + profile, and without this they'd each hit Supabase Auth
// and Postgres separately for the exact same data on every navigation.
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const profile = await getProfileById(supabase, user.id);

  return { supabase, user, profile };
});
