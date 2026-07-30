import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bearerTokenFrom } from "@/lib/auth/bearer";

// Reachable without a session.
const PUBLIC_PATHS = ["/login", "/signup", "/reset-password"];
// Of those, only these bounce an already-signed-in user back to "/" -
// /reset-password stays reachable even if a stale session cookie is
// still around, since a fresh recovery link needs to load and call
// setSession() itself before that session is actually the right one.
const REDIRECT_IF_AUTHED_PATHS = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // A caller presenting an access token (see POST /api/auth/login) has no session
  // cookie to refresh, so there's nothing for this middleware to do - pass it
  // through and let the page's own createClient()/getCurrentProfile() validate the
  // token, which is where a bad one turns into a redirect anyway. Checking it here
  // too would add a second Supabase round-trip to every page request.
  if (bearerTokenFrom(request.headers.get("authorization"))) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isApiPath = pathname.startsWith("/api/");

  // API routes enforce their own auth (requireRole) and must return JSON,
  // not an HTML redirect to /login - only the page-rendering paths redirect.
  if (isApiPath) {
    return response;
  }

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && REDIRECT_IF_AUTHED_PATHS.includes(pathname)) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
