import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveAccountStatus, isStale, type AccountStatus } from "@/lib/account-status";
import type { AuthEvent } from "@/lib/auth-events";
import type { UserRole } from "@/lib/types";

export type AccountRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  status: AccountStatus;
  // Waiting on an invite for over a week.
  stale: boolean;
  createdAt: string;
  invitedAt: string | null;
  passwordSetAt: string | null;
  lastSignInAt: string | null;
  recoverySentAt: string | null;
};

export type AccountActivity = {
  people: AccountRow[];
  pendingRequests: number;
  events: AuthEvent[];
  hasMoreEvents: boolean;
};

export const EVENTS_PAGE_SIZE = 25;
const USERS_PER_PAGE = 1000;
const MAX_USER_PAGES = 10;

// Supabase returns auth users a page at a time. A company this size fits in one,
// but looping keeps it correct if the app ever grows.
async function listAuthUsers(): Promise<User[]> {
  const admin = createAdminClient();
  const users: User[] = [];

  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < USERS_PER_PAGE) break;
  }
  return users;
}

// Service-role on purpose: reading other people's sign-in times lives in
// auth.users, which only the service role can see, and the page that calls this
// has already confirmed the caller is an Admin. Returns metadata only - never a
// password, token or link.
export async function loadAccountActivity(): Promise<AccountActivity> {
  const admin = createAdminClient();

  const [authUsers, profilesResult, requestsResult, eventsResult] = await Promise.all([
    listAuthUsers(),
    admin
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, password_set_at")
      .order("full_name")
      .returns<
        {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          avatar_url: string | null;
          password_set_at: string | null;
        }[]
      >(),
    admin.from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin
      .from("auth_events")
      .select("id, event, user_id, email, actor_id, detail, ip, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(EVENTS_PAGE_SIZE + 1)
      .returns<AuthEvent[]>(),
  ]);

  const byId = new Map(authUsers.map((u) => [u.id, u]));
  const now = Date.now();

  const people = (profilesResult.data ?? []).flatMap((profile): AccountRow[] => {
    const user = byId.get(profile.id);
    if (!user) return [];

    const input = {
      passwordSetAt: profile.password_set_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      recoverySentAt: user.recovery_sent_at ?? null,
      invitedAt: user.invited_at ?? null,
      createdAt: user.created_at,
    };
    const status = deriveAccountStatus(input);

    return [
      {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
        status,
        stale: isStale(status, input, now),
        createdAt: user.created_at,
        invitedAt: input.invitedAt,
        passwordSetAt: profile.password_set_at,
        lastSignInAt: input.lastSignInAt,
        recoverySentAt: input.recoverySentAt,
      },
    ];
  });

  const events = eventsResult.data ?? [];

  return {
    people,
    pendingRequests: requestsResult.count ?? 0,
    events: events.slice(0, EVENTS_PAGE_SIZE),
    hasMoreEvents: events.length > EVENTS_PAGE_SIZE,
  };
}
