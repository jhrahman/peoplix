-- Notify a post's author when someone comments on it.
-- Run after 0015_notifications.sql.
--
-- For this type, "context" describes the post that was commented on
-- (post / announcement / poll / kudos) and comment_id points at the comment.

alter table public.notifications drop constraint notifications_type_allowed;
alter table public.notifications
  add constraint notifications_type_allowed check (type in ('mention', 'kudos', 'comment'));
