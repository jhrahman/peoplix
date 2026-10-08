import type { SupabaseClient } from "@supabase/supabase-js";

// Tagging a colleague. What the author sees and types is "@Jane Doe"; what's
// stored in a post/comment is the token "@[Jane Doe](<profile id>)". Keeping the
// id (not just the name) means a tag survives a rename, and rendering resolves
// the *current* name from the id, so a token can't be forged to display a
// different person's name. The name inside the token is only a fallback.

export const MAX_MENTIONS = 5;

const UUID_SOURCE = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const TOKEN_SOURCE = `@\\[([^\\]\\n]{1,80})\\]\\((${UUID_SOURCE})\\)`;

// Typed name -> profile id, for the people picked from the suggestion list.
export type MentionMap = Record<string, string>;

export type MentionSegment =
  | { type: "text"; text: string }
  | { type: "mention"; id: string; label: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turns the typed text into the stored form. Only names still present in the
// text are converted, so deleting a tag after picking it simply drops it.
export function serializeMentions(text: string, mentions: MentionMap) {
  let out = text;

  // Longest first, so "@Ann Lee" is replaced before a shorter "@Ann".
  for (const name of Object.keys(mentions).sort((a, b) => b.length - a.length)) {
    const label = name.replace(/[[\]\n]/g, "").slice(0, 80);
    if (!label) continue;
    // Not preceded by a letter/digit (so "a@Jane.com" stays an email) and not
    // followed by one (so "@Ann" never matches inside "@Anna").
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])@${escapeRegExp(name)}(?![\\p{L}\\p{N}_])`, "gu");
    out = out.replace(pattern, () => `@[${label}](${mentions[name]})`);
  }

  return out;
}

export function splitMentions(content: string): MentionSegment[] {
  const pattern = new RegExp(TOKEN_SOURCE, "g");
  const segments: MentionSegment[] = [];
  let last = 0;

  for (const match of content.matchAll(pattern)) {
    if (match.index > last) segments.push({ type: "text", text: content.slice(last, match.index) });
    segments.push({ type: "mention", label: match[1], id: match[2].toLowerCase() });
    last = match.index + match[0].length;
  }
  if (last < content.length) segments.push({ type: "text", text: content.slice(last) });

  return segments;
}

// Length as displayed ("@Jane Doe"), which is what the 2000/500 character
// limits are about - the token's id is plumbing the author never sees.
export function visibleLength(content: string) {
  return content.replace(new RegExp(TOKEN_SOURCE, "g"), "@$1").length;
}

// Server-side check of the tokens in submitted content.
export async function validateMentions(
  supabase: SupabaseClient,
  content: string,
): Promise<string | null> {
  const ids = splitMentions(content).flatMap((s) => (s.type === "mention" ? [s.id] : []));
  if (ids.length === 0) return null;

  if (ids.length > MAX_MENTIONS) {
    return `You can tag up to ${MAX_MENTIONS} people at a time`;
  }

  const unique = [...new Set(ids)];
  const { data, error } = await supabase.from("profiles").select("id").in("id", unique);

  if (error) return error.message;
  if ((data?.length ?? 0) !== unique.length) return "Someone you tagged no longer exists";

  return null;
}

// The "@query" being typed at the caret, if any: an "@" at the start of the
// text or after whitespace, followed by at most two words with no newline.
export function findMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;

  const query = before.slice(at + 1);
  if (query.length > 30 || query.includes("\n") || /^\s/.test(query)) return null;
  if (query.trim().split(/\s+/).filter(Boolean).length > 2) return null;

  return { start: at, query };
}

// Every typed word must prefix-match a word of the name, so "@jan", "@doe"
// and "@jane d" all find "Jane Doe".
export function matchPeople<T extends { full_name: string }>(people: T[], query: string, limit = 6) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const matches = people.filter((p) => {
    const nameWords = p.full_name.toLowerCase().split(/\s+/);
    return words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
  });

  // Names that start with what was typed come first.
  const typed = query.toLowerCase().trim();
  matches.sort(
    (a, b) =>
      Number(b.full_name.toLowerCase().startsWith(typed)) -
      Number(a.full_name.toLowerCase().startsWith(typed)),
  );

  return matches.slice(0, limit);
}
