-- Backfill a current-year leave_balances row for any profile created before
-- employee creation started auto-seeding one (idempotent).

insert into public.leave_balances (employee_id, year)
select p.id, extract(year from current_date)::int
from public.profiles p
where not exists (
  select 1 from public.leave_balances lb
  where lb.employee_id = p.id
    and lb.year = extract(year from current_date)::int
);
