import type { AppNotification, NotificationContext, PostAuthor } from "@/lib/types";

export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

const CONTEXT_PHRASE: Record<NotificationContext, string> = {
  post: "tagged you in a post",
  announcement: "tagged you in an announcement",
  poll: "tagged you in a poll",
  kudos: "tagged you in a kudos message",
  comment: "tagged you in a comment",
  birthday: "tagged you on a birthday card",
  milestone: "tagged you on an anniversary card",
  anniversary: "tagged you on an anniversary card",
  new_joiner: "tagged you on a welcome card",
};

// For "comment" and "reaction" notifications, context is the kind of post that
// was commented on / reacted to (or "comment", for a reaction on a comment).
const CONTEXT_NOUN: Record<NotificationContext, string> = {
  post: "post",
  announcement: "announcement",
  poll: "poll",
  kudos: "kudos post",
  comment: "post",
  birthday: "birthday card",
  milestone: "anniversary card",
  anniversary: "anniversary card",
  new_joiner: "welcome card",
};

type Describable = Pick<AppNotification, "type" | "context" | "emoji">;

function reactionTarget(context: NotificationContext) {
  return context === "comment" ? "comment" : CONTEXT_NOUN[context];
}

// The sentence after the actor's name: "<Jane> tagged you in a poll".
export function describeNotification(n: Describable) {
  switch (n.type) {
    case "kudos":
      return "gave you kudos 🎉";
    case "comment":
      return `commented on your ${CONTEXT_NOUN[n.context]}`;
    case "reaction":
      return `reacted ${n.emoji ?? ""} to your ${reactionTarget(n.context)}`.replace("  ", " ");
    case "wish":
      if (n.context === "birthday") return "wished you a happy birthday 🎂";
      if (n.context === "new_joiner") return "welcomed you to the team 👋";
      return "congratulated you on your work anniversary 🏆";
    default:
      return CONTEXT_PHRASE[n.context];
  }
}

// Opens only what was tagged: a post (with its comments open and the relevant
// comment highlighted), or, for wishes, the celebration card for that day.
export function notificationHref(
  n: Pick<
    AppNotification,
    "context" | "post_id" | "comment_id" | "occasion_date" | "occasion_owner_id"
  >,
) {
  // A celebration card (wish, or a tag / comment / reaction on someone's card).
  if (n.occasion_date) {
    return `/engagement?wishes=${n.occasion_date}&occasion=${n.context}&for=${n.occasion_owner_id}`;
  }
  const base = `/engagement/posts/${n.post_id}`;
  return n.comment_id ? `${base}?comment=${n.comment_id}` : base;
}

export type NotificationGroup = {
  // Stable across renders: the newest notification's id.
  key: string;
  latest: AppNotification;
  items: AppNotification[];
  // Distinct people, newest first.
  actors: (PostAuthor | null)[];
};

// What makes unread notifications "the same story": comments on one post,
// reactions to one post (or one comment), wishes on one celebration.
function groupKey(n: AppNotification): string | null {
  if (n.read_at !== null) return null;
  // A post, or a person's card on a day.
  const thing = n.post_id ?? `${n.occasion_owner_id}:${n.occasion_date}`;
  if (n.type === "comment") return `comment:${thing}`;
  if (n.type === "reaction") return `reaction:${thing}:${n.comment_id ?? ""}`;
  if (n.type === "wish") return `wish:${n.context}:${n.occasion_date}`;
  return null;
}

// Unread notifications about the same story collapse into one row ("Jane,
// Rahim and 2 others reacted to your post"), like a social feed does.
// Everything else, and anything already read, stays one row each. `list` is
// newest first, and a group sits where its newest item is.
export function groupNotifications(list: AppNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const byKey = new Map<string, NotificationGroup>();

  for (const n of list) {
    const key = groupKey(n);
    const existing = key ? byKey.get(key) : undefined;

    if (existing) {
      existing.items.push(n);
      if (!existing.actors.some((a) => a?.id === n.actor?.id)) existing.actors.push(n.actor);
      continue;
    }

    const group: NotificationGroup = { key: n.id, latest: n, items: [n], actors: [n.actor] };
    groups.push(group);
    if (key) byKey.set(key, group);
  }

  return groups;
}

// A single reaction names its emoji ("reacted 👍 to your post"); several
// people with different emojis just "reacted to your post".
export function describeGroup(group: NotificationGroup) {
  const n = group.latest;
  if (n.type === "reaction" && group.items.length > 1) {
    return `reacted to your ${reactionTarget(n.context)}`;
  }
  return describeNotification(n);
}

// "Jane", "Jane and Rahim", "Jane, Rahim and 2 others".
export function actorNames(actors: (PostAuthor | null)[]) {
  const names = actors.map((a) => a?.full_name ?? "Someone");
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""}`;
}
