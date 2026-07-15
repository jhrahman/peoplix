-- Tracks when an employee sets their password for the first time (completing
-- the invite/access-approval flow), so it can be logged as a distinct
-- "joined" audit action rather than looking like an ordinary password reset.

alter type audit_action add value 'joined';

alter table public.profiles add column password_set_at timestamptz;

-- Backfill: every profile that already exists has necessarily already set a
-- password (there was no other way to have an active account before this
-- migration), so only employees created from here on start with a null
-- password_set_at - that's what marks them as "not yet joined".
update public.profiles set password_set_at = now() where password_set_at is null;
