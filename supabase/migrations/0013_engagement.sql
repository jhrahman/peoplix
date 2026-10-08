-- Employee engagement: a company feed (posts, comments, reactions) plus
-- announcements. Deliberately text-only - no image/file attachments - so the
-- whole feature costs a few KB per post against the free-tier 500MB cap and
-- needs no extra Storage bucket.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  -- Announcements are just posts flagged by Admin/HR; they share comments and
  -- reactions with ordinary posts instead of living in a second table.
  is_announcement boolean not null default false,
  created_at timestamptz not null default now(),
  constraint posts_content_length check (char_length(btrim(content)) between 1 and 2000)
);

create index posts_feed_idx on public.posts (is_announcement, created_at desc);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_content_length check (char_length(btrim(content)) between 1 and 500)
);

create index post_comments_post_id_idx on public.post_comments (post_id, created_at);

-- One reaction per employee per post (the primary key enforces it) - picking a
-- different one replaces the old one rather than stacking.
create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint post_reactions_reaction_allowed
    check (reaction in ('like', 'love', 'celebrate', 'laugh', 'clap'))
);

-- posts

alter table public.posts enable row level security;

create policy "posts_select_all_authenticated"
  on public.posts for select
  using (auth.role() = 'authenticated');

-- Anyone can post as themselves; only Admin/HR can flag a post as an announcement.
create policy "posts_insert_own"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and (not is_announcement or public.is_hr_or_admin())
  );

-- Own posts, or any post for Admin (moderation). Not HR - same "Admin only"
-- shape as overtime approvals. No update policy: posts can't be edited.
create policy "posts_delete_own_or_admin"
  on public.posts for delete
  using (author_id = auth.uid() or public.current_role() = 'admin');

-- post_comments

alter table public.post_comments enable row level security;

create policy "post_comments_select_all_authenticated"
  on public.post_comments for select
  using (auth.role() = 'authenticated');

create policy "post_comments_insert_own"
  on public.post_comments for insert
  with check (author_id = auth.uid());

create policy "post_comments_delete_own_or_admin"
  on public.post_comments for delete
  using (author_id = auth.uid() or public.current_role() = 'admin');

-- post_reactions (strictly self-service - not even Admin edits someone else's)

alter table public.post_reactions enable row level security;

create policy "post_reactions_select_all_authenticated"
  on public.post_reactions for select
  using (auth.role() = 'authenticated');

create policy "post_reactions_insert_own"
  on public.post_reactions for insert
  with check (user_id = auth.uid());

create policy "post_reactions_update_own"
  on public.post_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "post_reactions_delete_own"
  on public.post_reactions for delete
  using (user_id = auth.uid());

-- Audit log: announcements and Admin moderation deletes are recorded.
alter type audit_entity add value 'post';
alter type audit_entity add value 'comment';
