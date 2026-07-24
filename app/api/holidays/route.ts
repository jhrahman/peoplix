import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { getHolidaysList } from "@/lib/holidays";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getHolidaysList();

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { name, date, is_recurring } = body;

  if (!name || !date) {
    return NextResponse.json({ error: "name and date are required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("holidays")
    .insert({ name, date, is_recurring: Boolean(is_recurring), created_by: auth.user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("holidays-list", { expire: 0 });

  return NextResponse.json({ data }, { status: 201 });
}
