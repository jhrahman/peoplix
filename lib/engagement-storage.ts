import { createAdminClient } from "@/lib/supabase/admin";
import { COMMENT_MEDIA_RULES } from "@/lib/comment-media";
import { MEDIA_RULES } from "@/lib/engagement";
import type { MediaKind } from "@/lib/types";

// Deleting a row never deletes its Storage object, and free-tier Storage is
// only 1 GB, so every place that removes posts must clean up files too.
// Service-role client: an Admin removing someone else's post (or the Danger
// Zone wipe) isn't the uploader, so the per-user Storage delete policy would
// silently match nothing. Failures are logged, never thrown - a leftover file
// must not turn a successful delete into an error.
export async function removeMediaObjects(items: { kind: MediaKind; path: string }[]) {
  if (items.length === 0) return;

  const admin = createAdminClient();

  for (const kind of ["image", "video"] as const) {
    const paths = items.filter((i) => i.kind === kind).map((i) => i.path);
    if (paths.length === 0) continue;

    const { error } = await admin.storage.from(MEDIA_RULES[kind].bucket).remove(paths);
    if (error) {
      console.error(`Failed to remove ${kind} files from Storage:`, error.message);
    }
  }
}

// Comment attachments are Storage files too (GIFs are just links, so there is
// nothing to delete for those). Same reasoning as above: deleting the row never
// deletes the file.
export async function removeCommentMediaObjects(
  items: { media_kind: string | null; media_path: string | null }[],
) {
  const admin = createAdminClient();

  for (const kind of ["image", "video"] as const) {
    const paths = items
      .filter((i) => i.media_kind === kind && i.media_path)
      .map((i) => i.media_path as string);
    if (paths.length === 0) continue;

    const { error } = await admin.storage.from(COMMENT_MEDIA_RULES[kind].bucket).remove(paths);
    if (error) {
      console.error(`Failed to remove comment ${kind} files from Storage:`, error.message);
    }
  }
}

// Everything one user ever uploaded - for account deletion, where the posts
// cascade away with the profile.
export async function removeAllUserMedia(userId: string) {
  const admin = createAdminClient();
  const buckets = [
    MEDIA_RULES.image.bucket,
    MEDIA_RULES.video.bucket,
    COMMENT_MEDIA_RULES.image.bucket,
    COMMENT_MEDIA_RULES.video.bucket,
  ];

  for (const name of buckets) {
    const bucket = admin.storage.from(name);
    const { data, error } = await bucket.list(userId, { limit: 1000 });
    if (error) {
      console.error(`Failed to list ${name} files for cleanup:`, error.message);
      continue;
    }
    if (data && data.length > 0) {
      const { error: removeError } = await bucket.remove(data.map((f) => `${userId}/${f.name}`));
      if (removeError) {
        console.error(`Failed to remove ${name} files from Storage:`, removeError.message);
      }
    }
  }
}
