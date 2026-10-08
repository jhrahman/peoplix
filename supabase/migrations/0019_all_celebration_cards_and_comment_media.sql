-- 1) Every celebration gets a card (any work anniversary and new joiners, not
--    only birthdays and 3/5/10-year milestones), and 2) comments can carry one
--    small photo, short video, or GIF.
-- Run after 0018_celebration_cards_and_role_guard.sql.

-- ---------------------------------------------------------------------------
-- 1) Occasions: birthday, milestone (3, 5, 10, then every 5 years), anniversary
--    (any other year) and new_joiner. They share one card design.
-- ---------------------------------------------------------------------------

alter table public.celebration_wishes drop constraint celebration_wishes_occasion_allowed;
alter table public.celebration_wishes
  add constraint celebration_wishes_occasion_allowed
  check (occasion in ('birthday', 'milestone', 'anniversary', 'new_joiner'));

-- Years are recorded for work anniversaries of any kind, never for birthdays or new joiners.
alter table public.celebration_wishes drop constraint celebration_wishes_years_shape;
alter table public.celebration_wishes
  add constraint celebration_wishes_years_shape
  check ((occasion in ('milestone', 'anniversary')) = (years is not null));

alter table public.celebration_comments drop constraint celebration_comments_occasion_allowed;
alter table public.celebration_comments
  add constraint celebration_comments_occasion_allowed
  check (occasion in ('birthday', 'milestone', 'anniversary', 'new_joiner'));

alter table public.celebration_reactions drop constraint celebration_reactions_occasion_allowed;
alter table public.celebration_reactions
  add constraint celebration_reactions_occasion_allowed
  check (occasion in ('birthday', 'milestone', 'anniversary', 'new_joiner'));

alter table public.notifications drop constraint notifications_context_allowed;
alter table public.notifications
  add constraint notifications_context_allowed
  check (context in (
    'post', 'announcement', 'poll', 'kudos', 'comment',
    'birthday', 'milestone', 'anniversary', 'new_joiner'
  ));

alter table public.notifications drop constraint notifications_target_shape;
alter table public.notifications
  add constraint notifications_target_shape check (
    (post_id is not null and occasion_date is null and occasion_owner_id is null)
    or (
      post_id is null
      and occasion_date is not null
      and occasion_owner_id is not null
      and context in ('birthday', 'milestone', 'anniversary', 'new_joiner')
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Comment attachments: one per comment, kept deliberately small.
--    image  -> a Storage file, up to 1 MB
--    video  -> a Storage file, up to 5 MB (a short clip)
--    gif    -> a link to a GIF from the GIF search provider (nothing is stored)
-- Columns on the comment rows rather than a separate table: one attachment
-- per comment needs no join and no extra policies.
-- ---------------------------------------------------------------------------

alter table public.post_comments
  add column media_kind text,
  add column media_path text,
  add column media_url text,
  add column media_mime text,
  add column media_size integer;

alter table public.celebration_comments
  add column media_kind text,
  add column media_path text,
  add column media_url text,
  add column media_mime text,
  add column media_size integer;

alter table public.post_comments
  add constraint post_comments_media_shape check (
    (media_kind is null and media_path is null and media_url is null and media_mime is null and media_size is null)
    or (
      media_kind in ('image', 'video')
      and media_path is not null and media_url is null
      and media_mime is not null and media_size is not null
      and (
        (media_kind = 'image' and media_size between 1 and 1048576)
        or (media_kind = 'video' and media_size between 1 and 5242880)
      )
    )
    or (
      media_kind = 'gif'
      and media_url is not null and char_length(media_url) <= 500 and media_url like 'https://%'
      and media_path is null and media_mime is null and media_size is null
    )
  );

alter table public.celebration_comments
  add constraint celebration_comments_media_shape check (
    (media_kind is null and media_path is null and media_url is null and media_mime is null and media_size is null)
    or (
      media_kind in ('image', 'video')
      and media_path is not null and media_url is null
      and media_mime is not null and media_size is not null
      and (
        (media_kind = 'image' and media_size between 1 and 1048576)
        or (media_kind = 'video' and media_size between 1 and 5242880)
      )
    )
    or (
      media_kind = 'gif'
      and media_url is not null and char_length(media_url) <= 500 and media_url like 'https://%'
      and media_path is null and media_mime is null and media_size is null
    )
  );

-- A comment may now be only an attachment (for example just a GIF), so text is
-- required only when there is no attachment.
alter table public.post_comments drop constraint post_comments_content_length;
alter table public.post_comments
  add constraint post_comments_content_length check (
    char_length(btrim(content)) <= 800
    and (char_length(btrim(content)) >= 1 or media_kind is not null)
  );

alter table public.celebration_comments drop constraint celebration_comments_content_length;
alter table public.celebration_comments
  add constraint celebration_comments_content_length check (
    char_length(btrim(content)) <= 800
    and (char_length(btrim(content)) >= 1 or media_kind is not null)
  );

-- ---------------------------------------------------------------------------
-- Storage for comment photos and clips: their own buckets, so the (much
-- smaller) size caps are enforced by Storage itself, not just by the browser.
-- Public read, writes only inside your own "{user-id}/" folder - same model
-- as post attachments (0014).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('comment-images', 'comment-images', true, 1048576,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('comment-videos', 'comment-videos', true, 5242880,
    array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "comment_media_objects_select_public"
  on storage.objects for select
  using (bucket_id in ('comment-images', 'comment-videos'));

create policy "comment_media_objects_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id in ('comment-images', 'comment-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comment_media_objects_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id in ('comment-images', 'comment-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
