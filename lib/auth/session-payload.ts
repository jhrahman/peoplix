import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

// The JSON body returned by POST /api/auth/login and POST /api/auth/refresh.
// The tokens are handed back in the body *as well as* being set as session
// cookies: a browser just uses the cookie and ignores this, while an API client
// (k6, Postman, CI) can send `Authorization: Bearer <access_token>` on every
// subsequent call instead of reconstructing Supabase's cookie encoding by hand.
export function sessionPayload(session: Session, profile: Profile | null) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type,
    // Seconds until the access token expires, and the absolute unix time it
    // does - a refresh loop needs one or the other.
    expires_in: session.expires_in,
    expires_at: session.expires_at ?? null,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      full_name: profile?.full_name ?? null,
      role: profile?.role ?? null,
    },
  };
}
