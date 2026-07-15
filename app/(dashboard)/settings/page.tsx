import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { DeleteAccount } from "@/components/settings/delete-account";
import { isSystemAdmin } from "@/lib/protected-employees";

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

      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {isSystemAdmin(profile.email) && (
        <div className="mx-auto max-w-lg">
          <DangerZone />
        </div>
      )}

      <DeleteAccount />
    </div>
  );
}
