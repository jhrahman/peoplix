import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultBdHolidaysForYear } from "@/lib/bd-holidays";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const year = Number(body.year) || new Date().getFullYear();

  const defaults = defaultBdHolidaysForYear(year);

  const { data: existingForYear, error: fetchError } = await supabase
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
    .map((h) => ({ ...h, created_by: user.id }));

  if (toInsert.length > 0) {
    // This is a fixed, hardcoded set of public-holiday rows (no arbitrary
    // user-controlled content) - safe to insert via the admin client so any
    // signed-in role can use this recovery action, not just Admin/HR, which
    // is what the normal holidays_insert_staff RLS policy would otherwise
    // require.
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("holidays").insert(toInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    data: { inserted: toInsert.length, skipped: defaults.length - toInsert.length, year },
  });
}
