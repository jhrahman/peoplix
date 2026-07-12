-- Team Directory: profiles become readable by every authenticated user (read-only).
-- Write access (insert/update/delete) is untouched - still Admin/HR only, or the
-- owning employee, per the existing policies below. Postgres OR's multiple
-- permissive policies for the same command, so this is purely additive.

create policy "profiles_select_all_authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');
