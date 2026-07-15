-- Audit log: who did what, for staff visibility and troubleshooting.
-- Retention (10 days) is enforced by a scheduled cleanup job hitting
-- /api/cron/audit-log-cleanup, not by RLS - this keeps the free-tier
-- Supabase DB from filling up with history nobody needs to keep longer.

create type audit_action as enum ('create', 'update', 'delete', 'cancel', 'approve', 'reject');
create type audit_entity as enum (
  'leave_request',
  'overtime_request',
  'attendance',
  'employee',
  'signup_request',
  'profile',
  'password',
  'account'
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  -- Snapshotted at write time so a log entry still reads correctly even
  -- after the actor's profile is later edited, or the account is deleted.
  actor_name text not null,
  actor_email text not null,
  action audit_action not null,
  entity audit_entity not null,
  comment text not null,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Employees (and HR) see only their own history; only Admin sees everyone's -
-- matches the app's "Admin only" rule for cross-employee audit visibility.
create policy "audit_logs_select_own_or_admin"
  on public.audit_logs for select
  using (actor_id = auth.uid() or public.current_role() = 'admin');

-- No insert/update/delete policy: every write goes through the service-role
-- client (lib/audit.ts, and the retention cleanup cron), never a user session.
