import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CelebrationPerson } from "@/lib/celebrations";
import type { PersonOption } from "@/lib/types";

// Everyone can already read every profile (see CLAUDE.md), so this is fetched
// once and shared across users/requests - same approach as the Directory.
// It feeds both the kudos recipient picker and the celebrations card.
export const getPeople = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, email, designation, avatar_url, joined_date")
      .order("full_name")
      .returns<(PersonOption & Pick<CelebrationPerson, "joined_date">)[]>();
    return data ?? [];
  },
  ["engagement-people"],
  { revalidate: 60, tags: ["directory-profiles"] },
);
