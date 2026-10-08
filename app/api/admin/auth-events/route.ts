import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { EVENT_LABEL } from "@/lib/account-status";

const PAGE_SIZE = 25;

// ilike treats % and _ as wildcards - escape them so a search is literal.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// Admin only, checked from the session here and again by the table's RLS policy
// (0020_auth_events.sql), which allows nobody else - HR included - to read it.
export async function GET(request: Request) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim().slice(0, 100);
  const before = searchParams.get("before");

  let query = auth.supabase
    .from("auth_events")
    .select("id, event, user_id, email, actor_id, detail, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    // One extra row tells us whether there's another page.
    .limit(PAGE_SIZE + 1);

  if (type && type in EVENT_LABEL) query = query.eq("event", type);
  if (q) query = query.ilike("email", `%${escapeLike(q)}%`);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;

  if (error) {
    // 22007 / 22008 = malformed timestamp.
    return NextResponse.json({ error: error.message }, { status: error.code?.startsWith("22") ? 400 : 500 });
  }

  const rows = data ?? [];
  return NextResponse.json({ data: rows.slice(0, PAGE_SIZE), has_more: rows.length > PAGE_SIZE });
}
