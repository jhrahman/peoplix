"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidate } from "@/lib/cache/redis";
import { logAudit } from "@/lib/audit";

const PROFILE_FIELD_LABELS = {
  full_name: "name",
  phone: "mobile number",
  department: "department",
  designation: "designation",
} as const;

function describeChanges(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

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

  const updated = {
    full_name,
    phone: phone || null,
    department: department || null,
    designation: designation || null,
  };

  const { data: before } = await supabase
    .from("profiles")
    .select("full_name, phone, department, designation")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update(updated)
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  const changedLabels = (Object.keys(PROFILE_FIELD_LABELS) as (keyof typeof PROFILE_FIELD_LABELS)[])
    .filter((field) => before?.[field] !== updated[field])
    .map((field) => PROFILE_FIELD_LABELS[field]);

  if (changedLabels.length > 0) {
    await logAudit({
      actorId: user.id,
      actorName: full_name,
      actorEmail: user.email ?? "",
      action: "update",
      entity: "profile",
      comment: `Updated their ${describeChanges(changedLabels)}`,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
  await invalidate(`profile:${user.id}`);
}

export async function updateAvatarUrl(avatarUrl: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("full_name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAudit({
    actorId: user.id,
    actorName: data?.full_name ?? user.email ?? "",
    actorEmail: user.email ?? "",
    action: "update",
    entity: "profile",
    comment: avatarUrl ? "Updated profile photo" : "Removed profile photo",
  });

  revalidatePath("/settings");
  revalidatePath("/");
  revalidateTag("directory-profiles", { expire: 0 });
  await invalidate(`profile:${user.id}`);
}
