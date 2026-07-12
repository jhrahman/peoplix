import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col gap-4 bg-gradient-to-br from-zinc-100 via-white to-zinc-200 p-4 dark:from-zinc-950 dark:via-black dark:to-zinc-900 md:flex-row">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col gap-4">
        <Navbar profile={profile} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
