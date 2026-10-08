-- Engagement v2: multi-emoji reactions (posts + comments), photo/video
-- attachments, kudos, polls and pinned announcements.
-- Run after 0013_engagement.sql.

-- ---------------------------------------------------------------------------
-- Tags: a tagged colleague is stored as "@[Jane Doe](<profile id>)", about 40
-- characters longer than it displays. The user-facing limits (2000 for posts,
-- 500 for comments) are enforced in the API on the *displayed* length, so the
-- raw column caps get headroom for up to 5 tags per item.
-- ---------------------------------------------------------------------------

alter table public.posts drop constraint posts_content_length;
alter table public.posts
  add constraint posts_content_length check (char_length(btrim(content)) between 1 and 3000);

alter table public.post_comments drop constraint post_comments_content_length;
alter table public.post_comments
  add constraint post_comments_content_length check (char_length(btrim(content)) between 1 and 800);

-- ---------------------------------------------------------------------------
-- Reactions: Discord-style - a person can add several different emojis to the
-- same post, one row per (item, person, emoji). Replaces the old fixed set of
-- five named reactions (migrated to their emoji equivalents below). The set
-- of allowed emojis lives in lib/engagement.ts so it can grow without a
-- migration; the table only bounds the length.
-- ---------------------------------------------------------------------------

alter table public.post_reactions add column emoji text;

update public.post_reactions set emoji = case reaction
  when 'like' then '👍'
  when 'love' then '❤️'
  when 'celebrate' then '🎉'
  when 'laugh' then '😂'
  when 'clap' then '👏'
end;

alter table public.post_reactions drop constraint post_reactions_pkey;
alter table public.post_reactions drop column reaction;
alter table public.post_reactions alter column emoji set not null;
alter table public.post_reactions add primary key (post_id, user_id, emoji);
alter table public.post_reactions
  add constraint post_reactions_emoji_length check (char_length(emoji) between 1 and 16);

-- A reaction is added or removed, never edited.
drop policy "post_reactions_update_own" on public.post_reactions;

create table public.comment_reactions (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji),
  constraint comment_reactions_emoji_length check (char_length(emoji) between 1 and 16)
);

alter table public.comment_reactions enable row level security;

create policy "comment_reactions_select_all_authenticated"
  on public.comment_reactions for select
  using (auth.role() = 'authenticated');

create policy "comment_reactions_insert_own"
  on public.comment_reactions for insert
  with check (user_id = auth.uid());

create policy "comment_reactions_delete_own"
  on public.comment_reactions for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Posts: kind (update / kudos / poll), kudos fields, pinning
-- ---------------------------------------------------------------------------

alter table public.posts
  add column kind text not null default 'update',
  add column kudos_recipient_id uuid references public.profiles (id) on delete cascade,
  add column kudos_value text,
  add column is_pinned boolean not null default false;

alter table public.posts
  add constraint posts_kind_allowed check (kind in ('update', 'kudos', 'poll')),
  -- A kudos always names a colleague (never yourself) and a company value;
  -- every other kind carries neither.
  add constraint posts_kudos_shape check (
    (
      kind = 'kudos'
      and kudos_recipient_id is not null
      and kudos_value is not null
      and kudos_recipient_id <> author_id
    )
    or (kind <> 'kudos' and kudos_recipient_id is null and kudos_value is null)
  ),
  add constraint posts_kudos_value_length check (
    kudos_value is null or char_length(kudos_value) between 1 and 40
  ),
  add constraint posts_announcement_is_update check (not is_announcement or kind = 'update'),
  add constraint posts_pin_only_announcements check (not is_pinned or is_announcement);

create index posts_kind_feed_idx on public.posts (kind, created_at desc);

-- Pinning is the only edit a post ever gets, and only Admin/HR may do it.
-- Column-level privileges keep the update policy from being usable to rewrite
-- content (the row policy alone can't restrict *which* columns change).
revoke update on public.posts from authenticated, anon;
grant update (is_pinned) on public.posts to authenticated;

create policy "posts_pin_staff"
  on public.posts for update
  using (public.is_hr_or_admin())
  with check (public.is_hr_or_admin());

-- ---------------------------------------------------------------------------
-- Attachments: up to 4 photos or 1 video per post (the mix rule is enforced in
-- the API). Files live in Storage; this table is the pointer. Deleting a post
-- cascades here, and the API removes the Storage objects.
-- ---------------------------------------------------------------------------

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  kind text not null,
  path text not null unique,
  mime_type text not null,
  size_bytes integer not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, position),
  constraint post_media_kind_allowed check (kind in ('image', 'video')),
  constraint post_media_position_range check (position between 0 and 3),
  -- Same caps as the Storage buckets below (3 MB photos, 20 MB videos).
  constraint post_media_size_cap check (
    (kind = 'image' and size_bytes between 1 and 3145728)
    or (kind = 'video' and size_bytes between 1 and 20971520)
  )
);

create index post_media_post_id_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post_media_select_all_authenticated"
  on public.post_media for select
  using (auth.role() = 'authenticated');

-- Only the post's own author can attach media to it. No update/delete policy:
-- rows go away with their post (cascade), never individually.
create policy "post_media_insert_own_post"
  on public.post_media for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Polls: 2-5 options, one vote per person per poll (changeable). Votes are not
-- anonymous - any signed-in user can read who voted for what.
-- ---------------------------------------------------------------------------

create table public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  label text not null,
  position smallint not null,
  unique (post_id, position),
  -- Lets votes reference (option, post) together so a vote can never point at
  -- another poll's option.
  unique (id, post_id),
  constraint post_poll_options_label_length check (char_length(btrim(label)) between 1 and 100),
  constraint post_poll_options_position_range check (position between 0 and 4)
);

create table public.post_poll_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (option_id, post_id)
    references public.post_poll_options (id, post_id) on delete cascade
);

alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;

create policy "post_poll_options_select_all_authenticated"
  on public.post_poll_options for select
  using (auth.role() = 'authenticated');

create policy "post_poll_options_insert_own_poll"
  on public.post_poll_options for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid() and p.kind = 'poll'
    )
  );

create policy "post_poll_votes_select_all_authenticated"
  on public.post_poll_votes for select
  using (auth.role() = 'authenticated');

create policy "post_poll_votes_insert_own"
  on public.post_poll_votes for insert
  with check (user_id = auth.uid());

-- Changing your vote is an update of option_id on your own row.
create policy "post_poll_votes_update_own"
  on public.post_poll_votes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: separate buckets so the file-size cap can differ per type and be
-- enforced by Storage itself (not just by the browser). Public read, like
-- avatars - object names are random UUIDs under the uploader's id. Writes are
-- limited to your own "{auth.uid()}/" folder. Admin moderation deletes go
-- through the service-role client in the API, not through these policies.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 3145728,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post-videos', 'post-videos', true, 20971520,
    array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "post_media_objects_select_public"
  on storage.objects for select
  using (bucket_id in ('post-images', 'post-videos'));

create policy "post_media_objects_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id in ('post-images', 'post-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_media_objects_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id in ('post-images', 'post-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
