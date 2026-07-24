import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types";
import { getEmployeeIdsOnApprovedLeave } from "@/lib/leave";
import { todayInDhaka } from "@/lib/attendance";
import { DirectoryList } from "@/components/directory/directory-list";

// Directory data is readable by every authenticated user (see CLAUDE.md), so
// it's fetched with the admin client and cached across requests/users rather
// than re-queried per page load.
const getDirectoryProfiles = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, designation, department, email, phone, avatar_url")
      .order("full_name")
      .returns<
        Pick<Profile, "id" | "full_name" | "designation" | "department" | "email" | "phone" | "avatar_url">[]
      >();
    return data ?? [];
  },
  ["directory-profiles"],
  { revalidate: 60, tags: ["directory-profiles"] },
);

export default async function DirectoryPage() {
  const [profiles, onLeaveTodayIds] = await Promise.all([
    getDirectoryProfiles(),
    getEmployeeIdsOnApprovedLeave(createAdminClient(), todayInDhaka()),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team directory</CardTitle>
      </CardHeader>
      <CardContent>
        <DirectoryList profiles={profiles} onLeaveTodayIds={onLeaveTodayIds} />
      </CardContent>
    </Card>
  );
}
