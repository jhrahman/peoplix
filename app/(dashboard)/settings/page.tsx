import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "@/components/settings/profile-form";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <div className="mx-auto max-w-lg">
        <DangerZone isAdmin={profile.role === "admin"} />
      </div>
    </div>
  );
}
