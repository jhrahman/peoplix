import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  return (
    <div className="app-background flex min-h-screen flex-1 flex-col gap-4 p-4 md:flex-row">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col gap-4">
        <Navbar profile={profile} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
