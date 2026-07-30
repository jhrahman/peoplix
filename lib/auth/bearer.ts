// Shared by lib/supabase/server.ts and lib/supabase/middleware.ts, which read the
// header from different places (next/headers vs. NextRequest) but must agree on
// what counts as a bearer credential.
export function bearerTokenFrom(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) return null;

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match ? match[1] : null;
}
