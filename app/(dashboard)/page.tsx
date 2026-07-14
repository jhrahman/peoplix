import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { StaffOverview } from "@/components/dashboard/staff-overview";
import { StatTileSkeleton } from "@/components/dashboard/stat-tile-skeleton";
import { DashboardOverviewSkeleton } from "@/components/dashboard/dashboard-overview-skeleton";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();
  const isStaff = Boolean(profile && ["admin", "hr"].includes(profile.role));
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {profile?.full_name}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {profile?.role} · {profile?.department ?? "No department set"}
        </p>
      </div>

      <Suspense fallback={<DashboardOverviewSkeleton isAdmin={isAdmin} />}>
        <DashboardOverview userId={user!.id} profile={profile!} isAdmin={isAdmin} />
      </Suspense>

      {isStaff && (
        <Suspense
          fallback={
            <StatTileSkeleton
              count={isAdmin ? 3 : 2}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            />
          }
        >
          <StaffOverview isAdmin={isAdmin} />
        </Suspense>
      )}
    </div>
  );
}
