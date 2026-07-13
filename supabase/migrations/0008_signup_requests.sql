-- Public sign-up requests: a prospective employee submits their details from
-- the login page; nothing touches auth.users/profiles until an Admin approves.

create type signup_request_status as enum ('pending', 'approved', 'rejected');

create table public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  department text,
  designation text,
  mobile text,
  status signup_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only one open request per email at a time - resubmitting after a rejection is fine.
create unique index signup_requests_pending_email_unique
  on public.signup_requests (email)
  where status = 'pending';

alter table public.signup_requests enable row level security;

-- Anonymous visitors submit requests; the check pins status to 'pending' so a
-- crafted payload can't self-approve or set reviewed_by/reviewed_at.
create policy "signup_requests_insert_public"
  on public.signup_requests for insert
  with check (status = 'pending' and reviewed_by is null and reviewed_at is null);

-- Only Admin can see or act on requests - matches the "Admin creates accounts" rule.
create policy "signup_requests_select_admin"
  on public.signup_requests for select
  using (public.current_role() = 'admin');

create policy "signup_requests_update_admin"
  on public.signup_requests for update
  using (public.current_role() = 'admin');

create policy "signup_requests_delete_admin"
  on public.signup_requests for delete
  using (public.current_role() = 'admin');
