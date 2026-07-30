import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { bearerTokenFrom } from "@/lib/auth/bearer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The browser's client: reads and writes the Supabase session cookie.
// The /api/auth/* routes use this directly, since signing in, refreshing and
// signing out are exactly the operations that need to write those cookies.
export async function createCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll is called from a Server Component; safe to ignore
          // because middleware.ts refreshes the session on every request.
        }
      },
    },
  });
}

// A stateless client authenticated by an access token instead of a cookie.
// No cookie jar to read or write: the token *is* the credential, and an API
// client has nothing to persist it into.
function createBearerClient(accessToken: string) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function createClient() {
  // API clients (k6, Postman, CI) send the `access_token` from POST /api/auth/login
  // as `Authorization: Bearer <token>` instead of carrying the browser's session
  // cookie. Handling it here rather than per-route means every existing endpoint
  // accepts either credential with no change of its own. It's not a weaker check:
  // Supabase still verifies the JWT on `auth.getUser()`, and PostgREST applies the
  // exact same RLS policies as it does for a cookie session.
  const headerStore = await headers();
  const bearerToken = bearerTokenFrom(headerStore.get("authorization"));

  return bearerToken ? createBearerClient(bearerToken) : createCookieClient();
}
