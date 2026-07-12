import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only: uses the service role key, bypasses RLS entirely.
// Never import this from a Client Component or expose the key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
