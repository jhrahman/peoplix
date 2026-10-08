import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileById } from "@/lib/auth/get-profile";
import { logAudit } from "@/lib/audit";
import { splitMentions } from "@/lib/mentions";
import type { AuditAction, AuditEntity, PostKind } from "@/lib/types";

// What was written, as a reader sees it ("@Jane Doe", not the stored tag
// token), shortened and wrapped in quotes for an Audit Log message.
export function quoted(content: string, max = 70) {
  const text = splitMentions(content)
    .map((s) => (s.type === "mention" ? `@${s.label}` : s.text))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return `“${text.length > max ? `${text.slice(0, max - 1)}…` : text}”`;
}

// A comment as it reads in the Audit Log: its text, plus a marker if it carries
// an attachment - and just the marker when it is only a GIF, photo or video.
export function commentSummary(content: string, media: { kind: "image" | "video" | "gif" } | null) {
  const tag = media ? (media.kind === "gif" ? "[GIF]" : media.kind === "video" ? "[video]" : "[photo]") : "";
  return content.trim() ? `${quoted(content)}${tag ? ` ${tag}` : ""}` : tag || '""';
}

// "post", "announcement", "poll" or "kudos post" - how a post is named in messages.
export function postNoun(post: { kind: PostKind; is_announcement: boolean }) {
  if (post.is_announcement) return "announcement";
  if (post.kind === "kudos") return "kudos post";
  return post.kind === "poll" ? "poll" : "post";
}

// "their own" or "Jane Doe's", for "...on <whose> post".
export function whose(authorId: string | null, authorName: string | null | undefined, userId: string) {
  return authorId === userId ? "their own" : `${authorName ?? "an employee"}'s`;
}

// One line in the Audit Log for an engagement action. Everything on the
// engagement page goes through this, so the Audit Log is a complete record of
// who did what there. Like logAudit it never throws - a logging problem must
// never fail the action it describes.
export async function auditEngagement(
  supabase: SupabaseClient,
  userId: string,
  input: { action: AuditAction; entity: AuditEntity; comment: string },
) {
  const profile = await getProfileById(supabase, userId);
  if (!profile) return;

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    actorEmail: profile.email,
    ...input,
  });
}
