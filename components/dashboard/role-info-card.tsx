import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "Admin",
  hr: "HR",
  employee: "Employee",
};

export function RoleInfoCard({ profile }: { profile: Profile }) {
  const joined = new Date(`${profile.joined_date}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Role</span>
          <Badge>{ROLE_LABEL[profile.role]}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Department</span>
          <span className="font-medium">{profile.department ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Designation</span>
          <span className="font-medium">{profile.designation ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Joined</span>
          <span className="font-medium">{joined}</span>
        </div>
      </CardContent>
    </Card>
  );
}
