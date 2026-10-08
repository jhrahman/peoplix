import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInDhaka } from "@/lib/attendance";
import { getSharedBirthdays } from "@/lib/birthdays";
import { buildCelebrations } from "@/lib/celebrations";
import { getPeople } from "@/lib/engagement-people";
import { fetchFeed } from "@/lib/engagement";
import { getEmployeeIdsOnApprovedLeave } from "@/lib/leave";
import { isOccasion } from "@/lib/wish-constants";
import { applyWishSummaries } from "@/lib/wishes";
import { EngagementFeed } from "@/components/engagement/engagement-feed";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ wishes?: string; occasion?: string; for?: string }>;
}) {
  const { wishes, occasion, for: forId } = await searchParams;
  const { supabase, user, profile } = await getCurrentProfile();

  // The dashboard layout redirects to /login in this case.
  if (!user || !profile) return null;

  // When they last left this page (written by the client, see
  // EngagementFeed). A cookie rather than localStorage so the server render
  // and the client agree on which posts are "New" - no hydration mismatch.
  const seen = (await cookies()).get(`engagement_seen_${user.id}`)?.value;
  const lastSeenMs = seen && !Number.isNaN(Date.parse(seen)) ? Date.parse(seen) : null;

  const today = todayInDhaka();

  // Deliberately uncached, like attendance/leave/overtime: a feed that lags
  // behind what you just posted or reacted to reads as broken, not fast.
  const [feed, announcements, people, birthdays, onLeaveTodayIds] = await Promise.all([
    fetchFeed(supabase, user.id, { announcements: false }),
    fetchFeed(supabase, user.id, { announcements: true }),
    getPeople(),
    getSharedBirthdays(),
    getEmployeeIdsOnApprovedLeave(createAdminClient(), today),
  ]);

  const celebrations = await applyWishSummaries(
    supabase,
    user.id,
    buildCelebrations(people, birthdays, today),
  );

  return (
    <EngagementFeed
      currentUser={{
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      }}
      people={people.map(({ id, full_name, email, designation, avatar_url }) => ({
        id,
        full_name,
        email,
        designation,
        avatar_url,
      }))}
      celebrations={celebrations}
      onLeaveTodayIds={onLeaveTodayIds}
      openWishes={
        wishes && DATE_PATTERN.test(wishes) && isOccasion(occasion)
          ? {
              occasion,
              date: wishes,
              // Whose card: someone else's when you were tagged on it, otherwise your own.
              recipientId: forId && UUID_PATTERN.test(forId) ? forId : user.id,
            }
          : null
      }
      lastSeenMs={lastSeenMs}
      initialFeed={feed}
      initialAnnouncements={announcements}
    />
  );
}
