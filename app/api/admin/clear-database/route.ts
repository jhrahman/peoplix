import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSystemAdmin } from "@/lib/protected-employees";
import { removeCommentMediaObjects, removeMediaObjects } from "@/lib/engagement-storage";
import type { MediaKind } from "@/lib/types";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
// [table, a column every row has] - reactions have no id, hence the column.
const TABLES = [
  ["leave_requests", "id"],
  ["leave_balances", "id"],
  ["holidays", "id"],
  ["attendance", "id"],
  ["overtime_requests", "id"],
  // post_comments, post_reactions, poll data and media rows go with their posts
  // (on delete cascade).
  ["posts", "id"],
  // Celebration cards hang off people, not posts, so they are wiped explicitly.
  ["celebration_wishes", "id"],
  ["celebration_comments", "id"],
  ["celebration_reactions", "user_id"],
  // Wish notifications point at a day rather than a post, so they don't cascade away.
  ["notifications", "id"],
] as const;

export async function POST() {
  // Restricted to the single System Admin account, not just role === "admin"
  // - matches the Danger Zone visibility rule. Never trust the client-side
  // hide/show alone as the security boundary.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  if (!isSystemAdmin(auth.profile.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Service-role client: several of these tables have RLS delete policies that
  // are narrower than "any staff member" by design (e.g. attendance can only
  // delete today's own row - see 0007_attendance_delete_today_only.sql - so
  // history survives normal use). Those policies would silently no-op most of
  // this wipe if run through the session-scoped client. The security boundary
  // for this danger-zone action is the isSystemAdmin gate above, not RLS.
  const admin = createAdminClient();

  // Post attachments live in Storage, not in the tables being wiped - collect
  // their paths first, since the rows (and the paths) are gone after the wipe.
  const [{ data: media }, { data: postCommentFiles }, { data: cardCommentFiles }] = await Promise.all([
    admin.from("post_media").select("kind, path").returns<{ kind: MediaKind; path: string }[]>(),
    admin
      .from("post_comments")
      .select("media_kind, media_path")
      .not("media_kind", "is", null)
      .returns<{ media_kind: string | null; media_path: string | null }[]>(),
    admin
      .from("celebration_comments")
      .select("media_kind, media_path")
      .not("media_kind", "is", null)
      .returns<{ media_kind: string | null; media_path: string | null }[]>(),
  ]);

  for (const [table, column] of TABLES) {
    const { error } = await admin.from(table).delete().neq(column, NIL_UUID);
    if (error) {
      return NextResponse.json(
        { error: `Failed clearing ${table}: ${error.message}` },
        { status: 500 },
      );
    }
  }

  await removeMediaObjects(media ?? []);
  await removeCommentMediaObjects([...(postCommentFiles ?? []), ...(cardCommentFiles ?? [])]);

  // leave_balances was just wiped along with leave_requests - re-seed a fresh
  // default balance for every surviving employee so the admin's "All balances"
  // view shows a clean, fully-populated table immediately, instead of rows
  // reappearing one at a time as each employee happens to revisit /leave.
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id");

  if (profilesError) {
    return NextResponse.json(
      { error: `Cleared tables but failed to re-seed leave balances: ${profilesError.message}` },
      { status: 500 },
    );
  }

  if (profiles && profiles.length > 0) {
    const year = new Date().getFullYear();
    const { error: reseedError } = await admin
      .from("leave_balances")
      .insert(profiles.map((p) => ({ employee_id: p.id, year })));

    if (reseedError) {
      return NextResponse.json(
        { error: `Cleared tables but failed to re-seed leave balances: ${reseedError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data: { cleared: TABLES.map(([table]) => table) } });
}
