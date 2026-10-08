import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTHOR_COLUMNS } from "@/lib/engagement";
import { splitMentions } from "@/lib/mentions";
import type {
  AppNotification,
  NotificationContext,
  NotificationType,
  PostKind,
} from "@/lib/types";

export const NOTIFICATIONS_PAGE_SIZE = 20;

// Which kind of post a notification is about (drives its wording).
export function postContext(post: { kind: PostKind; is_announcement: boolean }): NotificationContext {
  if (post.is_announcement) return "announcement";
  return post.kind === "update" ? "post" : post.kind;
}

const PREVIEW_LENGTH = 120;

// What the author wrote as the reader sees it ("@Jane Doe", not the stored
// "@[Jane Doe](id)" token), shortened for a one-line hint.
export function previewOf(content: string) {
  const text = splitMentions(content)
    .map((s) => (s.type === "mention" ? `@${s.label}` : s.text))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

export function mentionedIds(content: string) {
  return [
    ...new Set(splitMentions(content).flatMap((s) => (s.type === "mention" ? [s.id] : []))),
  ];
}

type NewNotification = {
  recipientId: string;
  type: NotificationType;
  context: NotificationContext;
  // Reactions only: which emoji.
  emoji?: string;
};

// Writes one notification per recipient. Service-role client because
// notifications has no insert policy (a user session can't forge one) - the
// caller has already validated who is being notified about what. Like
// logAudit, this never throws: a failed notification must not fail the post,
// comment or reaction it's about.
export async function notify(input: {
  actorId: string;
  // Absent only for celebration cards, which point at a day (occasionDate)
  // and whose card it is (occasionOwnerId) instead.
  postId?: string;
  commentId?: string;
  occasionDate?: string;
  occasionOwnerId?: string;
  content: string;
  recipients: NewNotification[];
}) {
  const rows = input.recipients
    .filter((r) => r.recipientId !== input.actorId)
    .map((r) => ({
      recipient_id: r.recipientId,
      actor_id: input.actorId,
      type: r.type,
      context: r.context,
      post_id: input.postId ?? null,
      comment_id: input.commentId ?? null,
      occasion_date: input.occasionDate ?? null,
      occasion_owner_id: input.occasionOwnerId ?? null,
      emoji: r.emoji ?? null,
      preview: previewOf(input.content),
    }));

  if (rows.length === 0) return;

  try {
    const admin = createAdminClient();

    // Someone replying or reacting five times in a row shouldn't put five
    // alerts in the author's bell: while this person's earlier alert of the
    // same kind on the same thing is still unread, further ones add nothing.
    // (A reaction alert is per target: the post, or one specific comment.)
    for (const type of ["comment", "reaction"] as const) {
      const recipientIds = rows.filter((r) => r.type === type).map((r) => r.recipient_id);
      if (recipientIds.length === 0 || (!input.postId && !input.occasionDate)) continue;

      let query = admin
        .from("notifications")
        .select("recipient_id")
        .eq("actor_id", input.actorId)
        .eq("type", type)
        .is("read_at", null)
        .in("recipient_id", recipientIds);
      // "The same thing" is the post, or - for a celebration card - that
      // person's card on that day.
      query = input.postId
        ? query.eq("post_id", input.postId)
        : query.eq("occasion_date", input.occasionDate!).eq("occasion_owner_id", input.occasionOwnerId ?? "");
      if (type === "reaction" && input.postId) {
        query = input.commentId ? query.eq("comment_id", input.commentId) : query.is("comment_id", null);
      }

      const { data: pending } = await query;
      const alreadyPending = new Set((pending ?? []).map((p) => p.recipient_id));
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].type === type && alreadyPending.has(rows[i].recipient_id)) rows.splice(i, 1);
      }
    }

    if (rows.length === 0) return;

    const { error } = await admin.from("notifications").insert(rows);
    if (error) console.error("Failed to write notifications:", error.message);
  } catch (err) {
    console.error("Failed to write notifications:", err);
  }
}

// Taking a reaction back withdraws the alert it caused, if nobody has seen it
// yet - otherwise tapping 👍 by mistake would leave a stray "reacted to your
// post" behind. Only when the person has no other reaction left on that thing.
export async function retractReactionNotification(input: {
  actorId: string;
  postId?: string;
  commentId?: string;
  // Reactions on a celebration card instead of a post.
  occasionDate?: string;
  occasionOwnerId?: string;
}) {
  try {
    let query = createAdminClient()
      .from("notifications")
      .delete()
      .eq("actor_id", input.actorId)
      .eq("type", "reaction")
      .is("read_at", null);

    if (input.occasionDate) {
      query = query
        .eq("occasion_date", input.occasionDate)
        .eq("occasion_owner_id", input.occasionOwnerId ?? "");
    } else if (input.commentId) {
      query = query.eq("comment_id", input.commentId);
    } else {
      query = query.eq("post_id", input.postId ?? "").is("comment_id", null);
    }

    const { error } = await query;
    if (error) console.error("Failed to withdraw reaction notification:", error.message);
  } catch (err) {
    console.error("Failed to withdraw reaction notification:", err);
  }
}

type NotificationRow = Omit<AppNotification, "actor"> & { actor: AppNotification["actor"] };

// Runs as the caller (RLS limits it to their own rows).
export async function fetchNotifications(
  supabase: SupabaseClient,
  {
    before,
    limit = NOTIFICATIONS_PAGE_SIZE,
    unreadOnly = false,
  }: { before?: string | null; limit?: number; unreadOnly?: boolean } = {},
): Promise<{ notifications: AppNotification[]; hasMore: boolean; error: string | null }> {
  let query = supabase
    .from("notifications")
    .select(
      `id, type, context, post_id, comment_id, emoji, occasion_date, occasion_owner_id, preview, read_at, created_at,
       actor:profiles!notifications_actor_id_fkey(${AUTHOR_COLUMNS})`,
    )
    .order("created_at", { ascending: false })
    // One extra row tells us whether there's another page.
    .limit(limit + 1);

  if (before) query = query.lt("created_at", before);
  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query.returns<NotificationRow[]>();

  if (error) return { notifications: [], hasMore: false, error: error.message };

  const rows = data ?? [];
  return { notifications: rows.slice(0, limit), hasMore: rows.length > limit, error: null };
}
