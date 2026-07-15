"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function updateOwnProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();

  if (!full_name) {
    throw new Error("Full name is required");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: phone || null,
      department: department || null,
      designation: designation || null,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  await logAudit({
    actorId: user.id,
    actorName: full_name,
    actorEmail: user.email ?? "",
    action: "update",
    entity: "profile",
    comment: "Updated own profile details",
  });

  revalidatePath("/settings");
  revalidatePath("/");
}
