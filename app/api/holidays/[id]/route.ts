import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, date, is_recurring } = body;

  const { data, error } = await auth.supabase
    .from("holidays")
    .update({ name, date, is_recurring: Boolean(is_recurring) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("holidays-list", { expire: 0 });

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "hr"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { error } = await auth.supabase.from("holidays").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("holidays-list", { expire: 0 });

  return NextResponse.json({ data: { id } });
}
