-- Account security events: the history behind the Admin-only Account Activity
-- page (sign-up requests, invites, password set / forgot / reset / change).
-- Run after 0019_all_celebration_cards_and_comment_media.sql.
--
-- Deliberately separate from audit_logs:
--   * audit_logs is the business record of who did what to HR data, visible to
--     everyone for their own actions, kept 10 days.
--   * auth_events is a security trail about accounts and credentials, visible to
--     Admin only, kept 90 days (a stale invite or a pattern of reset requests
--     needs a longer memory than 10 days).
-- It never holds a password, token or reset link - only that something happened.

create table public.auth_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  -- The account this is about. Null when there isn't one (a sign-up request, or
  -- a forgot-password attempt for an address nobody registered), and set to
  -- null if the account is later deleted so the history survives it.
  user_id uuid references public.profiles (id) on delete set null,
  -- Snapshot, so an event still reads correctly after the account is gone.
  email text not null,
  -- Who did it, when it wasn't the account holder (an Admin sending an invite,
  -- approving a request...).
  actor_id uuid references public.profiles (id) on delete set null,
  detail text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint auth_events_event_allowed check (event in (
    'signup_requested',
    'signup_approved',
    'signup_rejected',
    'invite_sent',
    'invite_resent',
    'password_set',
    'password_reset_requested',
    'password_reset_unknown_email',
    'password_reset_completed',
    'password_changed'
  )),
  constraint auth_events_email_length check (char_length(email) between 1 and 320),
  constraint auth_events_detail_length check (detail is null or char_length(detail) <= 200),
  constraint auth_events_ip_length check (ip is null or char_length(ip) <= 64),
  constraint auth_events_user_agent_length check (user_agent is null or char_length(user_agent) <= 200)
);

create index auth_events_created_at_idx on public.auth_events (created_at desc);
create index auth_events_user_id_idx on public.auth_events (user_id, created_at desc);
create index auth_events_email_idx on public.auth_events (lower(email), created_at desc);

alter table public.auth_events enable row level security;

-- Admin only - not HR, not the person the event is about. (Same boundary as
-- the Danger Zone and Audit Log cleanup.)
create policy "auth_events_select_admin"
  on public.auth_events for select
  using (public.current_role() = 'admin');

-- No insert / update / delete policy: events are written by the API with the
-- service-role client (lib/auth-events.ts), so no user session can forge,
-- edit or erase one - including an Admin. The daily cron prunes old rows.
