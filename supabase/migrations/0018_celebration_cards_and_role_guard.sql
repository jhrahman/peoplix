-- Birthday / work-anniversary cards become a small conversation (comments with
-- @tags, and reactions), plus one defensive fix for profile roles.
-- Run after 0017_reactions_birthdays_wishes.sql.

-- ---------------------------------------------------------------------------
-- Notifications about a card need to know whose card it is: when you're tagged
-- in a comment on SOMEONE ELSE's card, "the recipient" (you) isn't the
-- celebrant, so the link has to carry the celebrant's id.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column occasion_owner_id uuid references public.profiles (id) on delete cascade;

-- Wishes created before this column existed were always about the recipient's own card.
update public.notifications
  set occasion_owner_id = recipient_id
  where occasion_date is not null and occasion_owner_id is null;

alter table public.notifications drop constraint notifications_target_shape;
alter table public.notifications
  add constraint notifications_target_shape check (
    -- a post / comment notification...
    (post_id is not null and occasion_date is null and occasion_owner_id is null)
    -- ...or a celebration-card one (wish, tag, comment, reaction on a card)
    or (
      post_id is null
      and occasion_date is not null
      and occasion_owner_id is not null
      and context in ('birthday', 'milestone')
    )
  );

-- ---------------------------------------------------------------------------
-- Card comments and reactions. A card has no row of its own (it is simply
-- "this person's birthday / anniversary on this day"), so these are keyed by
-- (recipient, occasion, day). Like wishes, they are created through the API
-- with the service-role client after it verifies the celebration is real and
-- still open, so there is no insert policy.
-- ---------------------------------------------------------------------------

create table public.celebration_comments (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  occasion text not null,
  occasion_date date not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Raw cap leaves headroom for @[Name](id) tag tokens; the API enforces 500 displayed characters.
  content text not null,
  created_at timestamptz not null default now(),
  constraint celebration_comments_occasion_allowed check (occasion in ('birthday', 'milestone')),
  constraint celebration_comments_content_length check (char_length(btrim(content)) between 1 and 800)
);

create index celebration_comments_card_idx
  on public.celebration_comments (recipient_id, occasion, occasion_date, created_at);

alter table public.celebration_comments enable row level security;

create policy "celebration_comments_select_all_authenticated"
  on public.celebration_comments for select
  using (auth.role() = 'authenticated');

create policy "celebration_comments_delete_own_or_admin"
  on public.celebration_comments for delete
  using (author_id = auth.uid() or public.current_role() = 'admin');

create table public.celebration_reactions (
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  occasion text not null,
  occasion_date date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (recipient_id, occasion, occasion_date, user_id, emoji),
  constraint celebration_reactions_occasion_allowed check (occasion in ('birthday', 'milestone')),
  constraint celebration_reactions_emoji_length check (char_length(emoji) between 1 and 16)
);

alter table public.celebration_reactions enable row level security;

create policy "celebration_reactions_select_all_authenticated"
  on public.celebration_reactions for select
  using (auth.role() = 'authenticated');

create policy "celebration_reactions_delete_own"
  on public.celebration_reactions for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- DEFENSIVE FIX (not part of the feature above): profiles can be updated by
-- their owner with no column restriction (0002), so an Employee could send
-- `PATCH /rest/v1/profiles` with { "role": "admin" } for their own row and
-- promote themselves - every server-side role check reads this column. This
-- trigger stops anyone who is not HR/Admin from changing a role. Server-side
-- jobs and the SQL editor (no signed-in user) are unaffected, as are the
-- Employees page flows, which run as HR/Admin. Remove this block if you
-- prefer to handle it differently.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not coalesce(public.is_hr_or_admin(), false) then
    raise exception 'Only HR or Admin can change a role' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_change on public.profiles;
create trigger profiles_prevent_role_self_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();
