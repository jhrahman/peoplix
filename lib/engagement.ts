import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaFromColumns, type MediaColumns } from "@/lib/comment-media";
import { formatBytes, mimeOf } from "@/lib/file-utils";

// Existing importers keep using these from here.
export { formatBytes, mimeOf };
import type {
  FeedPost,
  MediaKind,
  PostAuthor,
  PostComment,
  PostKind,
  ReactionSummary,
} from "@/lib/types";

// Keep these limits in sync with the CHECK constraints in
// supabase/migrations/0013_engagement.sql and 0014_engagement_v2.sql.
export const POST_MAX_LENGTH = 2000;
export const COMMENT_MAX_LENGTH = 500;
export const FEED_PAGE_SIZE = 10;
export const MAX_PINNED_ANNOUNCEMENTS = 3;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 5;
export const POLL_OPTION_MAX_LENGTH = 100;

export const POST_KINDS: PostKind[] = ["update", "kudos", "poll"];

export function isPostKind(value: unknown): value is PostKind {
  return POST_KINDS.includes(value as PostKind);
}

export const AUTHOR_COLUMNS = "id, full_name, designation, avatar_url";

// ---------------------------------------------------------------------------
// Emoji reactions
// ---------------------------------------------------------------------------

// `tone: true` marks hands and people that can take a skin tone (see applyTone).
type EmojiEntry = { emoji: string; label: string; keywords?: string; tone?: boolean };

export const EMOJI_CATEGORIES: { id: string; label: string; emojis: EmojiEntry[] }[] = [
  {
    id: "appreciation",
    label: "Appreciation",
    emojis: [
      { emoji: "👍", label: "Thumbs up", keywords: "like agree yes ok", tone: true },
      { emoji: "❤️", label: "Love", keywords: "heart" },
      { emoji: "👏", label: "Applause", keywords: "clap well done bravo", tone: true },
      { emoji: "🙌", label: "Great job", keywords: "praise hooray raised hands", tone: true },
      { emoji: "🙏", label: "Thank you", keywords: "thanks grateful please", tone: true },
      { emoji: "💯", label: "Perfect", keywords: "hundred 100 spot on" },
      { emoji: "🔥", label: "Fire", keywords: "hot amazing lit" },
      { emoji: "⭐", label: "Star", keywords: "favorite" },
      { emoji: "🏆", label: "Trophy", keywords: "win award champion" },
      { emoji: "💪", label: "Strong", keywords: "power effort muscle", tone: true },
      { emoji: "🎉", label: "Celebrate", keywords: "party congrats tada" },
      { emoji: "🥳", label: "Party", keywords: "celebrate birthday" },
      { emoji: "👋", label: "Welcome", keywords: "hello hi wave greet", tone: true },
      { emoji: "🎁", label: "Gift", keywords: "present reward" },
    ],
  },
  {
    id: "feelings",
    label: "Feelings",
    emojis: [
      { emoji: "😀", label: "Happy", keywords: "smile grin" },
      { emoji: "😂", label: "Haha", keywords: "laugh lol funny" },
      { emoji: "😍", label: "Love it", keywords: "heart eyes adore" },
      { emoji: "🥰", label: "Adore", keywords: "love hearts affection" },
      { emoji: "🤩", label: "Starstruck", keywords: "wow excited amazing" },
      { emoji: "🥹", label: "Touched", keywords: "moved proud emotional" },
      { emoji: "🥲", label: "Grateful", keywords: "tear proud bittersweet relieved" },
      { emoji: "😮", label: "Wow", keywords: "surprised shock" },
      { emoji: "🤯", label: "Mind blown", keywords: "amazed wow" },
      { emoji: "🤔", label: "Thinking", keywords: "hmm question curious" },
      { emoji: "🧐", label: "Curious", keywords: "monocle inspect look closely" },
      { emoji: "😅", label: "Phew", keywords: "relief nervous sweat" },
      { emoji: "😬", label: "Awkward", keywords: "grimace yikes" },
      { emoji: "🫠", label: "Melting", keywords: "overwhelmed awkward hot" },
      { emoji: "🫣", label: "Peeking", keywords: "shy nervous curious" },
      { emoji: "😢", label: "Sad", keywords: "cry sorry" },
      { emoji: "😭", label: "Sobbing", keywords: "cry tears emotional" },
      { emoji: "😎", label: "Cool", keywords: "sunglasses awesome" },
      { emoji: "😇", label: "Angel", keywords: "blessed innocent halo" },
      { emoji: "😌", label: "Relieved", keywords: "calm peaceful content" },
      { emoji: "🙃", label: "Upside down", keywords: "silly sarcasm" },
      { emoji: "😉", label: "Wink", keywords: "joke playful" },
      { emoji: "🤓", label: "Nerd", keywords: "geek smart" },
      { emoji: "😴", label: "Sleepy", keywords: "tired zzz" },
      { emoji: "🥱", label: "Yawn", keywords: "tired bored" },
      { emoji: "😤", label: "Determined", keywords: "triumph huff driven" },
      { emoji: "🫡", label: "Salute", keywords: "respect on it" },
      { emoji: "🤗", label: "Hug", keywords: "support care" },
    ],
  },
  {
    id: "people",
    label: "People & gestures",
    emojis: [
      { emoji: "🫶", label: "Heart hands", keywords: "love support care", tone: true },
      { emoji: "🤌", label: "Chef's kiss", keywords: "pinched fingers perfect italian", tone: true },
      { emoji: "👌", label: "Okay", keywords: "ok perfect fine", tone: true },
      { emoji: "🤞", label: "Fingers crossed", keywords: "luck hope", tone: true },
      { emoji: "🤲", label: "Open hands", keywords: "palms up offer welcome", tone: true },
      { emoji: "🫰", label: "Finger heart", keywords: "love korean snap", tone: true },
      { emoji: "🫵", label: "You", keywords: "point at you your turn", tone: true },
      { emoji: "✋", label: "High five", keywords: "stop hand raised", tone: true },
      { emoji: "👊", label: "Fist bump", keywords: "punch bro cheers", tone: true },
      { emoji: "🙇", label: "Bow", keywords: "respect sorry thanks humble", tone: true },
      { emoji: "🤷", label: "Shrug", keywords: "dunno unsure whatever", tone: true },
      { emoji: "🤦", label: "Facepalm", keywords: "oops mistake", tone: true },
      { emoji: "🦸", label: "Superhero", keywords: "hero super saved the day", tone: true },
      { emoji: "🫂", label: "Group hug", keywords: "support comfort hugging" },
      { emoji: "🧑‍💻", label: "Developer", keywords: "technologist coder laptop engineer" },
      { emoji: "🧑‍🏫", label: "Mentor", keywords: "teacher coach guide" },
      { emoji: "🧑‍🚀", label: "Moonshot", keywords: "astronaut space ambitious" },
      { emoji: "🧑‍🤝‍🧑", label: "Together", keywords: "friends partners holding hands" },
    ],
  },
  {
    id: "work",
    label: "Work",
    emojis: [
      { emoji: "✅", label: "Done", keywords: "complete finished check approved" },
      { emoji: "🚀", label: "Launch", keywords: "ship release rocket" },
      { emoji: "💡", label: "Idea", keywords: "bulb insight suggestion" },
      { emoji: "🎯", label: "On target", keywords: "goal bullseye focus" },
      { emoji: "📈", label: "Growth", keywords: "increase progress chart" },
      { emoji: "🤝", label: "Teamwork", keywords: "handshake deal partnership" },
      { emoji: "👀", label: "Looking", keywords: "eyes watching review" },
      { emoji: "🙋", label: "I can help", keywords: "volunteer raise hand me", tone: true },
      { emoji: "📌", label: "Noted", keywords: "pin important" },
      { emoji: "⏰", label: "Deadline", keywords: "alarm time urgent" },
      { emoji: "🧠", label: "Smart", keywords: "brain clever genius" },
      { emoji: "💼", label: "Business", keywords: "briefcase career" },
    ],
  },
  {
    id: "team-life",
    label: "Team life",
    emojis: [
      { emoji: "☕", label: "Coffee", keywords: "tea break chai" },
      { emoji: "🍕", label: "Pizza", keywords: "lunch food snack" },
      { emoji: "🎂", label: "Birthday", keywords: "cake anniversary" },
      { emoji: "🏖️", label: "Time off", keywords: "vacation holiday leave beach" },
      { emoji: "🏠", label: "Remote", keywords: "home wfh" },
      { emoji: "🏏", label: "Cricket", keywords: "sport match" },
      { emoji: "🎮", label: "Gaming", keywords: "game play" },
      { emoji: "🌙", label: "Eid Mubarak", keywords: "eid ramadan ramzan festival" },
    ],
  },
];

// Skin tones, as the Unicode modifier that follows a toneable emoji. 0 = the
// default (yellow) one. A reaction stores the final character, e.g. "👍🏽".
export const SKIN_TONES = [
  { id: 0, label: "Default", modifier: "" },
  { id: 1, label: "Light", modifier: "\u{1F3FB}" },
  { id: 2, label: "Medium-light", modifier: "\u{1F3FC}" },
  { id: 3, label: "Medium", modifier: "\u{1F3FD}" },
  { id: 4, label: "Medium-dark", modifier: "\u{1F3FE}" },
  { id: 5, label: "Dark", modifier: "\u{1F3FF}" },
] as const;

export function applyTone(entry: { emoji: string; tone?: boolean }, toneId: number) {
  const tone = SKIN_TONES.find((t) => t.id === toneId);
  return entry.tone && tone ? `${entry.emoji}${tone.modifier}` : entry.emoji;
}

// Every emoji a person can pick - including each skin-tone variant - so the API
// accepts exactly what the picker can produce, and nothing else.
const ALLOWED_EMOJIS = new Set(
  EMOJI_CATEGORIES.flatMap((c) =>
    c.emojis.flatMap((e) => SKIN_TONES.map((t) => applyTone(e, t.id))),
  ),
);

export function isAllowedEmoji(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_EMOJIS.has(value);
}

// ---------------------------------------------------------------------------
// Kudos
// ---------------------------------------------------------------------------

export const KUDOS_VALUES = [
  { id: "teamwork", label: "Teamwork", emoji: "🤝" },
  { id: "ownership", label: "Ownership", emoji: "🎯" },
  { id: "innovation", label: "Innovation", emoji: "💡" },
  { id: "extra_mile", label: "Went the extra mile", emoji: "🚀" },
  { id: "helpfulness", label: "Helpfulness", emoji: "🙌" },
  { id: "customer_focus", label: "Customer focus", emoji: "🌟" },
  { id: "learning", label: "Always learning", emoji: "📚" },
] as const;

export function kudosValueById(id: string) {
  return KUDOS_VALUES.find((v) => v.id === id);
}

// ---------------------------------------------------------------------------
// Attachments: up to 4 photos or 1 video per post
// ---------------------------------------------------------------------------

export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGES_PER_POST = 4;

// The bucket caps in 0014_engagement_v2.sql mirror maxBytes here, so even a
// client that skips this validation is stopped by Storage itself.
export const MEDIA_RULES: Record<
  MediaKind,
  { bucket: string; maxBytes: number; types: Record<string, string> }
> = {
  image: {
    bucket: "post-images",
    maxBytes: IMAGE_MAX_BYTES,
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" },
  },
  video: {
    bucket: "post-videos",
    maxBytes: VIDEO_MAX_BYTES,
    types: { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" },
  },
};

export const MEDIA_ACCEPT = [
  ...Object.keys(MEDIA_RULES.image.types),
  ...Object.keys(MEDIA_RULES.video.types),
].join(",");

export function mediaKindOf(mime: string): MediaKind | null {
  if (mime in MEDIA_RULES.image.types) return "image";
  if (mime in MEDIA_RULES.video.types) return "video";
  return null;
}

// Validates files the user just picked against the ones already attached.
// Returns what can be added plus a plain-language message for each rejection.
export function checkAttachments(current: File[], incoming: File[]) {
  const running = [...current];
  const errors: string[] = [];

  for (const file of incoming) {
    const kind = mediaKindOf(mimeOf(file));
    const hasVideo = running.some((f) => mediaKindOf(mimeOf(f)) === "video");

    if (!kind) {
      errors.push(
        `"${file.name}" isn't a supported file. Attach a JPG, PNG, WebP or GIF photo, or an MP4, WebM or MOV video.`,
      );
    } else if (file.size === 0) {
      errors.push(`"${file.name}" is empty.`);
    } else if (file.size > MEDIA_RULES[kind].maxBytes) {
      errors.push(
        `"${file.name}" is ${formatBytes(file.size)}, but ${kind === "image" ? "photos" : "videos"} can be at most ${formatBytes(MEDIA_RULES[kind].maxBytes)}.`,
      );
    } else if (kind === "video" && running.length > 0) {
      errors.push(
        hasVideo
          ? `A post can include only one video. "${file.name}" wasn't added.`
          : `A post can have photos or a video, not both. Remove the photos to attach "${file.name}".`,
      );
    } else if (kind === "image" && hasVideo) {
      errors.push(`A post can have photos or a video, not both. Remove the video to attach "${file.name}".`);
    } else if (kind === "image" && running.length >= MAX_IMAGES_PER_POST) {
      errors.push(`You can attach up to ${MAX_IMAGES_PER_POST} photos per post. "${file.name}" wasn't added.`);
    } else {
      running.push(file);
    }
  }

  return { accepted: running.slice(current.length), errors };
}

export type MediaInput = {
  kind: MediaKind;
  path: string;
  mime_type: string;
  size_bytes: number;
};

// Server-side check of the attachment metadata a client submits with a post.
// The files themselves were already uploaded straight to Storage (which
// enforces the bucket size/type caps); this makes sure the post only points at
// files inside the caller's own folder and obeys the same mix/count rules.
export function validateMediaInput(
  items: unknown,
  userId: string,
): { ok: true; items: MediaInput[] } | { ok: false; error: string } {
  if (items === undefined || items === null) return { ok: true, items: [] };
  if (!Array.isArray(items)) return { ok: false, error: "media must be a list" };
  if (items.length === 0) return { ok: true, items: [] };

  const parsed: MediaInput[] = [];
  const pathPattern = new RegExp(`^${userId}/[A-Za-z0-9._-]+$`);

  for (const item of items) {
    const { kind, path, mime_type, size_bytes } = (item ?? {}) as Partial<MediaInput>;

    if (kind !== "image" && kind !== "video") {
      return { ok: false, error: "Unsupported attachment type" };
    }
    if (typeof path !== "string" || !pathPattern.test(path) || path.includes("..")) {
      return { ok: false, error: "Invalid attachment" };
    }
    if (typeof mime_type !== "string" || !(mime_type in MEDIA_RULES[kind].types)) {
      return { ok: false, error: "Unsupported attachment file type" };
    }
    if (
      typeof size_bytes !== "number" ||
      !Number.isInteger(size_bytes) ||
      size_bytes < 1 ||
      size_bytes > MEDIA_RULES[kind].maxBytes
    ) {
      return {
        ok: false,
        error: `${kind === "image" ? "Photos" : "Videos"} can be at most ${formatBytes(MEDIA_RULES[kind].maxBytes)}`,
      };
    }
    parsed.push({ kind, path, mime_type, size_bytes });
  }

  const videos = parsed.filter((m) => m.kind === "video").length;
  if (videos > 1 || (videos === 1 && parsed.length > 1)) {
    return { ok: false, error: "A post can have one video or up to 4 photos, not both" };
  }
  if (parsed.length > MAX_IMAGES_PER_POST) {
    return { ok: false, error: `A post can have up to ${MAX_IMAGES_PER_POST} photos` };
  }
  if (new Set(parsed.map((m) => m.path)).size !== parsed.length) {
    return { ok: false, error: "Duplicate attachment" };
  }

  return { ok: true, items: parsed };
}

export function mediaUrl(kind: MediaKind, path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_RULES[kind].bucket}/${path}`;
}

// ---------------------------------------------------------------------------
// Feed queries
// ---------------------------------------------------------------------------

type ReactionRow = {
  emoji: string;
  user_id: string;
  user: { full_name: string } | null;
};

// Rows must arrive oldest-first so chips keep the order the emojis were first used.
export function summarizeReactions(rows: ReactionRow[], userId: string): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();

  for (const row of rows) {
    let summary = byEmoji.get(row.emoji);
    if (!summary) {
      summary = { emoji: row.emoji, count: 0, mine: false, reactors: [] };
      byEmoji.set(row.emoji, summary);
    }
    summary.count += 1;
    if (row.user_id === userId) {
      summary.mine = true;
    } else if (summary.reactors.length < 9 && row.user?.full_name) {
      summary.reactors.push(row.user.full_name);
    }
  }

  return [...byEmoji.values()];
}

const REACTION_EMBED = (table: string) =>
  `${table}(emoji, user_id, created_at, user:profiles!${table}_user_id_fkey(full_name))`;

const POST_SELECT = `id, content, kind, is_announcement, is_pinned, created_at, kudos_value,
  author:profiles!posts_author_id_fkey(${AUTHOR_COLUMNS}),
  recipient:profiles!posts_kudos_recipient_id_fkey(${AUTHOR_COLUMNS}),
  post_media(id, kind, path, mime_type, size_bytes, position),
  post_poll_options(id, label, position),
  post_poll_votes(option_id, user_id),
  ${REACTION_EMBED("post_reactions")},
  post_comments(count)`;

type PostRow = {
  id: string;
  content: string;
  kind: PostKind;
  is_announcement: boolean;
  is_pinned: boolean;
  created_at: string;
  kudos_value: string | null;
  author: PostAuthor | null;
  recipient: PostAuthor | null;
  post_media: {
    id: string;
    kind: MediaKind;
    path: string;
    mime_type: string;
    size_bytes: number;
    position: number;
  }[];
  post_poll_options: { id: string; label: string; position: number }[];
  post_poll_votes: { option_id: string; user_id: string }[];
  post_reactions: ReactionRow[];
  post_comments: { count: number }[];
};

function toFeedPost(row: PostRow, userId: string): FeedPost {
  let poll: FeedPost["poll"] = null;
  if (row.kind === "poll") {
    const counts = new Map<string, number>();
    let myVote: string | null = null;
    for (const vote of row.post_poll_votes) {
      counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
      if (vote.user_id === userId) myVote = vote.option_id;
    }
    poll = {
      options: [...row.post_poll_options]
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ id: o.id, label: o.label, votes: counts.get(o.id) ?? 0 })),
      my_vote: myVote,
      total_votes: row.post_poll_votes.length,
    };
  }

  return {
    id: row.id,
    content: row.content,
    kind: row.kind,
    is_announcement: row.is_announcement,
    is_pinned: row.is_pinned,
    created_at: row.created_at,
    author: row.author,
    kudos: row.recipient && row.kudos_value ? { recipient: row.recipient, value: row.kudos_value } : null,
    media: [...row.post_media]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        url: mediaUrl(m.kind, m.path),
        mime_type: m.mime_type,
        size_bytes: m.size_bytes,
      })),
    poll,
    reactions: summarizeReactions(row.post_reactions, userId),
    comment_count: row.post_comments[0]?.count ?? 0,
  };
}

type FeedOptions = {
  announcements: boolean;
  kind?: PostKind | null;
  // false = only unpinned posts, used to page past the pinned ones that the
  // first page already contained.
  pinned?: boolean;
  before?: string | null;
  // Case-insensitive text search over the post body.
  search?: string | null;
  // Only posts that tag this person (see lib/mentions.ts for the token format).
  mentionedUserId?: string | null;
};

export const SEARCH_MAX_LENGTH = 80;

// ilike treats % and _ as wildcards - escape them so a search for "50%" means 50%.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// One query per page of the feed: author, attachments, poll, reactions and the
// comment count are embedded rather than fetched per post. Comments themselves
// are only loaded when a post's thread is opened.
export async function fetchFeed(
  supabase: SupabaseClient,
  userId: string,
  { announcements, kind, pinned, before, search, mentionedUserId }: FeedOptions,
): Promise<{ posts: FeedPost[]; hasMore: boolean; error: string | null }> {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_announcement", announcements)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "post_reactions", ascending: true })
    // One extra row tells us whether there's another page without a count query.
    .limit(FEED_PAGE_SIZE + 1);

  if (kind) query = query.eq("kind", kind);
  if (pinned !== undefined) query = query.eq("is_pinned", pinned);
  if (before) query = query.lt("created_at", before);
  if (search) query = query.ilike("content", `%${escapeLike(search)}%`);
  if (mentionedUserId) query = query.like("content", `%](${mentionedUserId})%`);

  const { data, error } = await query.returns<PostRow[]>();

  if (error) {
    return { posts: [], hasMore: false, error: error.message };
  }

  const rows = data ?? [];

  return {
    posts: rows.slice(0, FEED_PAGE_SIZE).map((row) => toFeedPost(row, userId)),
    hasMore: rows.length > FEED_PAGE_SIZE,
    error: null,
  };
}

export async function fetchPost(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<FeedPost | null> {
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .order("created_at", { referencedTable: "post_reactions", ascending: true })
    .maybeSingle<PostRow>();

  return data ? toFeedPost(data, userId) : null;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export const COMMENT_MEDIA_COLUMNS = "media_kind, media_path, media_url, media_mime, media_size";

export const COMMENT_SELECT = `id, post_id, content, created_at, ${COMMENT_MEDIA_COLUMNS},
  author:profiles!post_comments_author_id_fkey(${AUTHOR_COLUMNS}),
  ${REACTION_EMBED("comment_reactions")}`;

export type CommentRow = Omit<PostComment, "reactions" | "media"> &
  Partial<MediaColumns> & { comment_reactions: ReactionRow[] };

export function toComment(row: CommentRow, userId: string): PostComment {
  const { comment_reactions, media_kind, media_path, media_url, media_mime, media_size, ...rest } = row;
  return {
    ...rest,
    media: mediaFromColumns({ media_kind, media_path, media_url, media_mime, media_size }),
    reactions: summarizeReactions(comment_reactions, userId),
  };
}
