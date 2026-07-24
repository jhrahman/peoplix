-- Repair any balances that already overshot before these constraints existed
-- (approval had no ceiling check, so *_used could exceed *_total).
update public.leave_balances set casual_used = casual_total where casual_used > casual_total;
update public.leave_balances set sick_used = sick_total where sick_used > sick_total;
update public.leave_balances set annual_used = annual_total where annual_used > annual_total;

alter table public.leave_balances
  add constraint leave_balances_casual_used_nonneg check (casual_used >= 0),
  add constraint leave_balances_sick_used_nonneg check (sick_used >= 0),
  add constraint leave_balances_annual_used_nonneg check (annual_used >= 0),
  add constraint leave_balances_casual_used_capped check (casual_used <= casual_total),
  add constraint leave_balances_sick_used_capped check (sick_used <= sick_total),
  add constraint leave_balances_annual_used_capped check (annual_used <= annual_total);
