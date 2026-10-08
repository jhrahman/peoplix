import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInDhaka } from "@/lib/attendance";
import type { Occasion } from "@/lib/wish-constants";
import {
  NEW_JOINER_DAYS,
  WISH_GRACE_DAYS,
  isMilestoneYear,
  monthDayOf,
  occurrenceNear,
  type Celebration,
} from "@/lib/celebrations";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Verified = { ok: true; years: number | null } | { ok: false; error: string };

const DAY_MS = 86_400_000;

function daysBetween(fromIso: string, toIso: string) {
  const ms = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(toIso) - ms(fromIso)) / DAY_MS);
}

// Server-side proof that this celebration is real and open: the date is the
// person's actual birthday / work anniversary / join date, the kind matches
// (a milestone year vs an ordinary one), and today is inside the open window -
// the day itself and WISH_GRACE_DAYS after for birthdays and anniversaries, or
// NEW_JOINER_DAYS after someone joins. This is why wishes, card comments and
// card reactions are written by the API (service role) rather than by the
// client: checking needs the private birthday table, and nobody can add to a
// celebration that isn't happening.
export async function verifyOccasion(input: {
  recipientId: string;
  occasion: Occasion;
  date: string;
  today: string;
}): Promise<Verified> {
  if (!DATE_PATTERN.test(input.date)) return { ok: false, error: "Invalid date" };

  const admin = createAdminClient();

  if (input.occasion === "birthday") {
    const { data } = await admin
      .from("employee_birthdays")
      .select("date_of_birth, share_with_team")
      .eq("employee_id", input.recipientId)
      .maybeSingle<{ date_of_birth: string; share_with_team: boolean }>();

    // Same answer whether they have no birthday on file or have opted out, so
    // this can't be used to probe who has set one.
    if (!data || !data.share_with_team) {
      return { ok: false, error: "This birthday isn't open for wishes" };
    }
    const { month, day } = monthDayOf(data.date_of_birth);
    const occ = occurrenceNear(month, day, input.today, WISH_GRACE_DAYS, 0);
    if (!occ || occ.date !== input.date) {
      return { ok: false, error: "Birthday cards are open on the day and for 3 days after" };
    }
    return { ok: true, years: null };
  }

  const { data } = await admin
    .from("profiles")
    .select("joined_date")
    .eq("id", input.recipientId)
    .maybeSingle<{ joined_date: string | null }>();

  if (!data?.joined_date) return { ok: false, error: "This celebration isn't open" };

  if (input.occasion === "new_joiner") {
    const since = daysBetween(data.joined_date, input.today);
    if (input.date !== data.joined_date || since < 0 || since > NEW_JOINER_DAYS) {
      return { ok: false, error: "Welcome cards are open for 2 weeks after someone joins" };
    }
    return { ok: true, years: null };
  }

  // milestone / anniversary: counted from the joining date.
  const { month, day } = monthDayOf(data.joined_date);
  const occ = occurrenceNear(month, day, input.today, WISH_GRACE_DAYS, 0);
  if (!occ || occ.date !== input.date) {
    return { ok: false, error: "Anniversary cards are open on the day and for 3 days after" };
  }

  const years = Number(occ.date.slice(0, 4)) - Number(data.joined_date.slice(0, 4));
  if (years < 1) return { ok: false, error: "This anniversary isn't open" };
  // The kind has to match the year, so a card can't be filed under the wrong one.
  if (isMilestoneYear(years) !== (input.occasion === "milestone")) {
    return { ok: false, error: "That isn't the right kind of card for this anniversary" };
  }
  return { ok: true, years };
}

// Fills in each celebration's wish count and whether the caller already signed
// that card, with one query for the whole list.
export async function applyWishSummaries(
  supabase: SupabaseClient,
  userId: string,
  celebrations: Celebration[],
): Promise<Celebration[]> {
  // Every celebration has a card.
  const wishable = celebrations;
  if (wishable.length === 0) return celebrations;

  const { data } = await supabase
    .from("celebration_wishes")
    .select("recipient_id, sender_id, occasion, occasion_date")
    .in("recipient_id", [...new Set(wishable.map((c) => c.id))])
    .in("occasion_date", [...new Set(wishable.map((c) => c.date))])
    .returns<{ recipient_id: string; sender_id: string; occasion: Occasion; occasion_date: string }[]>();

  return celebrations.map((c) => {
    const rows = (data ?? []).filter(
      (w) => w.recipient_id === c.id && w.occasion === c.kind && w.occasion_date === c.date,
    );
    return { ...c, wishCount: rows.length, iWished: rows.some((w) => w.sender_id === userId) };
  });
}

// For things people add to a card (comments, reactions): the same proof as a
// wish that the celebration is real and still open, plus the celebrant's name
// for messages. A card stays readable forever, but only takes new comments and
// reactions during the same day-plus-3 window as wishes.
export async function openCard(input: {
  recipientId: string;
  occasion: Occasion;
  date: string;
}): Promise<{ ok: true; recipientName: string } | { ok: false; error: string }> {
  const verified = await verifyOccasion({ ...input, today: todayInDhaka() });
  if (!verified.ok) return { ok: false, error: `This card is closed. ${verified.error}` };

  const { data } = await createAdminClient()
    .from("profiles")
    .select("full_name")
    .eq("id", input.recipientId)
    .maybeSingle<{ full_name: string }>();

  return { ok: true, recipientName: data?.full_name ?? "an employee" };
}
