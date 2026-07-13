import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { DangerZone } from "@/components/settings/danger-zone";

export default async function SettingsPage() {
  const { profile } = await getCurrentProfile();

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
