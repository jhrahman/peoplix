-- Row Level Security for all Peoplix tables.
-- Helper: current user's role, bypassing RLS on profiles to avoid recursive policy checks.

create or replace function public.current_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_hr_or_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.current_role() in ('admin', 'hr');
$$;

-- profiles

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (id = auth.uid() or public.is_hr_or_admin());

create policy "profiles_update_own_or_staff"
  on public.profiles for update
  using (id = auth.uid() or public.is_hr_or_admin());

create policy "profiles_insert_staff"
  on public.profiles for insert
  with check (public.is_hr_or_admin());

create policy "profiles_delete_staff"
  on public.profiles for delete
  using (public.is_hr_or_admin());

-- leave_requests

alter table public.leave_requests enable row level security;

create policy "leave_requests_select_own_or_staff"
  on public.leave_requests for select
  using (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "leave_requests_insert_own_or_staff"
  on public.leave_requests for insert
  with check (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "leave_requests_update_own_pending_or_staff"
  on public.leave_requests for update
  using (
    (employee_id = auth.uid() and status = 'pending')
    or public.is_hr_or_admin()
  );

create policy "leave_requests_delete_own_pending_or_staff"
  on public.leave_requests for delete
  using (
    (employee_id = auth.uid() and status = 'pending')
    or public.is_hr_or_admin()
  );

-- leave_balances

alter table public.leave_balances enable row level security;

create policy "leave_balances_select_own_or_staff"
  on public.leave_balances for select
  using (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "leave_balances_write_staff"
  on public.leave_balances for insert
  with check (public.is_hr_or_admin());

create policy "leave_balances_update_staff"
  on public.leave_balances for update
  using (public.is_hr_or_admin());

create policy "leave_balances_delete_staff"
  on public.leave_balances for delete
  using (public.is_hr_or_admin());

-- holidays (readable by all authenticated users, writable by HR/Admin)

alter table public.holidays enable row level security;

create policy "holidays_select_all_authenticated"
  on public.holidays for select
  using (auth.role() = 'authenticated');

create policy "holidays_insert_staff"
  on public.holidays for insert
  with check (public.is_hr_or_admin());

create policy "holidays_update_staff"
  on public.holidays for update
  using (public.is_hr_or_admin());

create policy "holidays_delete_staff"
  on public.holidays for delete
  using (public.is_hr_or_admin());

-- attendance

alter table public.attendance enable row level security;

create policy "attendance_select_own_or_staff"
  on public.attendance for select
  using (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "attendance_insert_own_or_staff"
  on public.attendance for insert
  with check (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "attendance_update_own_or_staff"
  on public.attendance for update
  using (employee_id = auth.uid() or public.is_hr_or_admin());

create policy "attendance_delete_staff"
  on public.attendance for delete
  using (public.is_hr_or_admin());
