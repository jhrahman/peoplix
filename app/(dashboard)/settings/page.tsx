import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { DangerZone } from "@/components/settings/danger-zone";
import { DeleteAuditLogs } from "@/components/settings/delete-audit-logs";
import { DeleteAccount } from "@/components/settings/delete-account";
import { isSystemAdmin } from "@/lib/protected-employees";

export default async function SettingsPage() {
  const { profile } = await getCurrentProfile();

  if (!profile) return null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card className="w-full lg:self-start">
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload profile={profile} />
        </CardContent>
      </Card>

      <div className="space-y-6 lg:col-start-1">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {profile.role === "admin" && <DeleteAuditLogs />}

        {isSystemAdmin(profile.email) && <DangerZone />}

        <DeleteAccount />
      </div>
    </div>
  );
}
