-- Reaction notifications, private birthdays, and birthday / work-anniversary wishes.
-- Run after 0016_notification_comment_type.sql.

-- ---------------------------------------------------------------------------
-- Notifications: new kinds ("reaction", "wish") and the extra columns they need
-- ---------------------------------------------------------------------------

alter table public.notifications alter column post_id drop not null;
alter table public.notifications add column emoji text;
-- For wishes: the day being celebrated (there is no post to point at).
alter table public.notifications add column occasion_date date;

alter table public.notifications drop constraint notifications_type_allowed;
alter table public.notifications
  add constraint notifications_type_allowed
  check (type in ('mention', 'kudos', 'comment', 'reaction', 'wish'));

alter table public.notifications drop constraint notifications_context_allowed;
alter table public.notifications
  add constraint notifications_context_allowed
  check (context in ('post', 'announcement', 'poll', 'kudos', 'comment', 'birthday', 'milestone'));

-- Every notification points at a post, except wishes, which point at a day.
alter table public.notifications
  add constraint notifications_target_shape check (
    (type = 'wish' and occasion_date is not null and post_id is null)
    or (type <> 'wish' and post_id is not null)
  );

alter table public.notifications
  add constraint notifications_emoji_length check (emoji is null or char_length(emoji) between 1 and 16);

-- ---------------------------------------------------------------------------
-- Birthdays: private by design. This is a separate table, NOT a column on
-- profiles, because profiles is readable by every signed-in user (the Team
-- Directory needs that) - a date_of_birth column there would let anyone read
-- everyone's birthday straight from the API. Here, only the owner can read or
-- write their row. Teammates only ever see the day and month (never the year),
-- computed server-side with the service-role client, and only for people who
-- have left "share_with_team" on.
-- ---------------------------------------------------------------------------

create table public.employee_birthdays (
  employee_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date not null,
  share_with_team boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint employee_birthdays_plausible check (date_of_birth >= date '1900-01-01')
);

alter table public.employee_birthdays enable row level security;

create policy "employee_birthdays_select_own"
  on public.employee_birthdays for select
  using (employee_id = auth.uid());

create policy "employee_birthdays_insert_own"
  on public.employee_birthdays for insert
  with check (employee_id = auth.uid());

create policy "employee_birthdays_update_own"
  on public.employee_birthdays for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

create policy "employee_birthdays_delete_own"
  on public.employee_birthdays for delete
  using (employee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Wishes: a shared "card" per celebration that teammates sign once each.
-- Birthdays and work-anniversary milestones (3, 5, 10, then every 5 years).
-- ---------------------------------------------------------------------------

create table public.celebration_wishes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  occasion text not null,
  -- The day being celebrated that year (the birthday, or the anniversary date).
  occasion_date date not null,
  -- Milestones only: how many years.
  years smallint,
  message text not null,
  created_at timestamptz not null default now(),
  -- One wish per person per celebration, so a card can't be spammed.
  unique (sender_id, recipient_id, occasion, occasion_date),
  constraint celebration_wishes_not_self check (sender_id <> recipient_id),
  constraint celebration_wishes_occasion_allowed check (occasion in ('birthday', 'milestone')),
  constraint celebration_wishes_years_shape check ((occasion = 'milestone') = (years is not null)),
  constraint celebration_wishes_message_length check (char_length(btrim(message)) between 1 and 200)
);

create index celebration_wishes_card_idx
  on public.celebration_wishes (recipient_id, occasion, occasion_date);

alter table public.celebration_wishes enable row level security;

-- The card is visible to the whole team, like signing a card in the office.
create policy "celebration_wishes_select_all_authenticated"
  on public.celebration_wishes for select
  using (auth.role() = 'authenticated');

-- Take back your own wish; Admin can remove any (moderation).
create policy "celebration_wishes_delete_own_or_admin"
  on public.celebration_wishes for delete
  using (sender_id = auth.uid() or public.current_role() = 'admin');

-- No insert/update policy: wishes are created through the API with the
-- service-role client, because checking that "today really is their birthday"
-- needs to read the private birthday table, which a user session can't.

-- Audit log: Admin removing someone else's wish is recorded.
alter type audit_entity add value 'wish';
