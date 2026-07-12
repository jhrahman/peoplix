-- Overtime tracking: employees log overtime manually; only Admin reviews it.

create type overtime_status as enum ('pending', 'approved', 'rejected');

create table public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  hours numeric(4,1) not null,
  reason text,
  status overtime_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employee_id, date),
  constraint overtime_requests_hours_range check (hours >= 0.5 and hours <= 12),
  constraint overtime_requests_hours_half_hour_step check ((hours * 2) = trunc(hours * 2)),
  constraint overtime_requests_not_future check (date <= current_date)
);

alter table public.overtime_requests enable row level security;

-- Everyone can view their own entries; HR/Admin can view everyone's (read-only
-- for HR - only Admin can approve/reject, enforced by the update policy below).
create policy "overtime_requests_select_own_or_staff"
  on public.overtime_requests for select
  using (employee_id = auth.uid() or public.is_hr_or_admin());

-- Self-entry only - this is a personal manual log, not a staff-on-behalf-of action.
create policy "overtime_requests_insert_own"
  on public.overtime_requests for insert
  with check (employee_id = auth.uid());

create policy "overtime_requests_update_own_pending_or_admin"
  on public.overtime_requests for update
  using (
    (employee_id = auth.uid() and status = 'pending')
    or public.current_role() = 'admin'
  );

create policy "overtime_requests_delete_own_pending_or_admin"
  on public.overtime_requests for delete
  using (
    (employee_id = auth.uid() and status = 'pending')
    or public.current_role() = 'admin'
  );
