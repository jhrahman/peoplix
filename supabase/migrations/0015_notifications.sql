-- In-app notifications: today, "someone tagged you" (in a post, announcement,
-- poll, kudos message or comment) and "someone gave you kudos".
-- Run after 0014_engagement_v2.sql.
--
-- Retention is handled by the existing daily cleanup cron
-- (/api/cron/audit-log-cleanup), which also deletes notifications older than
-- 30 days, so this table can't quietly eat into the free-tier 500 MB cap.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  -- Where the tag happened; drives the wording ("tagged you in a poll").
  context text not null,
  -- Deleting the post (or comment) takes its notifications with it, so a
  -- notification never links to something that's gone.
  post_id uuid not null references public.posts (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  -- A short plain-text snippet of what was written, for the dropdown.
  preview text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_allowed check (type in ('mention', 'kudos')),
  constraint notifications_context_allowed
    check (context in ('post', 'announcement', 'poll', 'kudos', 'comment')),
  constraint notifications_preview_length check (char_length(preview) <= 200),
  constraint notifications_not_self check (recipient_id <> actor_id)
);

create index notifications_recipient_feed_idx
  on public.notifications (recipient_id, created_at desc);

-- The unread badge counts only unread rows, so index just those.
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- Your own notifications only - not even Admin reads someone else's.
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- No insert policy: notifications are written by the API through the
-- service-role client (like audit_logs), so a user session can never forge
-- one - e.g. a fake "X tagged you" pointing at an arbitrary post.

-- Marking read is the only edit a notification ever gets.
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;
