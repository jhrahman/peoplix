"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidate } from "@/lib/cache/redis";
import { logAudit } from "@/lib/audit";
import { todayInDhaka } from "@/lib/attendance";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_JOINING_DATE = "1970-01-01";

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
  const joined_date = String(formData.get("joined_date") ?? "").trim();

  if (!full_name) {
    throw new Error("Full name is required");
  }

  // Optional here (the column can't be empty, so blank just means "leave it").
  // Anniversaries and the 3/5/10-year milestones are counted from this date.
  if (joined_date) {
    if (!DATE_PATTERN.test(joined_date) || Number.isNaN(Date.parse(joined_date))) {
      throw new Error("Enter a valid joining date");
    }
    if (joined_date > todayInDhaka()) {
      throw new Error("Joining date can't be in the future");
    }
    if (joined_date < MIN_JOINING_DATE) {
      throw new Error("Enter a valid joining date");
    }
  }

  const updated = {
    full_name,
    phone: phone || null,
    department: department || null,
    designation: designation || null,
  };

  const { data: before } = await supabase
    .from("profiles")
    .select("full_name, phone, department, designation, joined_date")
    .eq("id", user.id)
    .single<{
      full_name: string;
      phone: string | null;
      department: string | null;
      designation: string | null;
      joined_date: string;
    }>();

  const joinedChanged = Boolean(joined_date) && joined_date !== before?.joined_date;

  const { error } = await supabase
    .from("profiles")
    .update(joinedChanged ? { ...updated, joined_date } : updated)
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

  // Unlike a date of birth, a joining date isn't private (it's already on the
  // profile), and HR will want to see what changed - so the dates are recorded.
  if (joinedChanged) {
    await logAudit({
      actorId: user.id,
      actorName: full_name,
      actorEmail: user.email ?? "",
      action: "update",
      entity: "profile",
      comment: `Updated their joining date from ${before?.joined_date ?? "unknown"} to ${joined_date}`,
    });
    // Milestones and the celebrations list are built from this date.
    revalidateTag("directory-profiles", { expire: 0 });
    revalidatePath("/engagement");
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

const MAX_AGE_YEARS = 100;
const MIN_AGE_YEARS = 14;

// The birthday lives in its own table that only its owner can read (see
// 0017_reactions_birthdays_wishes.sql), not on the profile row everyone can
// read. These actions are the only place it's written, and the audit entry
// says it changed without recording the date itself.
export async function saveOwnBirthday(input: { date_of_birth: string; share_with_team: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const date = String(input.date_of_birth ?? "");
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error("Enter a valid date of birth");
  }

  const today = todayInDhaka();
  const year = (iso: string) => Number(iso.slice(0, 4));
  const age = year(today) - year(date) - (date.slice(5) > today.slice(5) ? 1 : 0);

  if (date > today) {
    throw new Error("Date of birth can't be in the future");
  }
  if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
    throw new Error("Enter a valid date of birth");
  }

  const { error } = await supabase.from("employee_birthdays").upsert(
    {
      employee_id: user.id,
      date_of_birth: date,
      share_with_team: input.share_with_team === true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await logBirthdayChange(user.id, user.email ?? "", "Updated their date of birth");
  revalidatePath("/settings");
  revalidatePath("/engagement");
}

export async function removeOwnBirthday() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("employee_birthdays").delete().eq("employee_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  await logBirthdayChange(user.id, user.email ?? "", "Removed their date of birth");
  revalidatePath("/settings");
  revalidatePath("/engagement");
}

async function logBirthdayChange(userId: string, email: string, comment: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();

  await logAudit({
    actorId: userId,
    actorName: data?.full_name ?? email,
    actorEmail: email,
    action: "update",
    entity: "profile",
    comment,
  });
}
