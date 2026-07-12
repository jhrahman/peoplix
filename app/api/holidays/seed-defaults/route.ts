import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { defaultBdHolidaysForYear } from "@/lib/bd-holidays";

export async function POST(request: Request) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const year = Number(body.year) || new Date().getFullYear();

  const defaults = defaultBdHolidaysForYear(year);

  const { data: existingForYear, error: fetchError } = await auth.supabase
    .from("holidays")
    .select("name, date")
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existingKeys = new Set((existingForYear ?? []).map((h) => `${h.name}|${h.date}`));
  const toInsert = defaults
    .filter((h) => !existingKeys.has(`${h.name}|${h.date}`))
    .map((h) => ({ ...h, created_by: auth.user.id }));

  if (toInsert.length > 0) {
    const { error: insertError } = await auth.supabase.from("holidays").insert(toInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    data: { inserted: toInsert.length, skipped: defaults.length - toInsert.length, year },
  });
}
