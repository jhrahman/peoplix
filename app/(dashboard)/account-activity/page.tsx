import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { loadAccountActivity } from "@/lib/account-activity";
import { Card, CardContent } from "@/components/ui/card";
import { AccountActivityView } from "@/components/account-activity/account-activity-view";

export default async function AccountActivityPage() {
  const { profile } = await getCurrentProfile();

  // The dashboard layout redirects to /login in this case.
  if (!profile) return null;

  // Admin only, re-checked on the server from the session: hiding the sidebar
  // link is a convenience, not the boundary (see CLAUDE.md). The event table is
  // also locked to Admin by its RLS policy.
  if (profile.role !== "admin") redirect("/");

  let data;
  try {
    data = await loadAccountActivity();
  } catch (err) {
    console.error("Failed to load account activity:", err);
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-6 text-center text-sm text-muted-foreground" data-testid="account-activity-error">
          Couldn&apos;t load account activity right now. Please try again in a moment.
        </CardContent>
      </Card>
    );
  }

  return <AccountActivityView {...data} />;
}
