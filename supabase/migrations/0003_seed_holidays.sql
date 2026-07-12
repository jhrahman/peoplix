-- Default Bangladesh public holidays (fixed-date, recurring annually).
-- Lunar-calendar holidays (Eid-ul-Fitr, Eid-ul-Adha, etc.) shift each year and
-- are intentionally left out — Admin/HR add those manually per year.

insert into public.holidays (name, date, is_recurring) values
  ('International Mother Language Day', '2026-02-21', true),
  ('Bengali New Year (Pohela Boishakh)', '2026-04-14', true),
  ('May Day', '2026-05-01', true),
  ('Independence Day', '2026-03-26', true),
  ('National Mourning Day', '2026-08-15', true),
  ('Victory Day', '2026-12-16', true),
  ('Christmas Day', '2026-12-25', true);
