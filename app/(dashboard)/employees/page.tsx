import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeesImportExport } from "@/components/employees/employees-import-export";
import { SignupRequestsPanel } from "@/components/employees/signup-requests-panel";
import type { SignupRequest } from "@/lib/types";

export default async function EmployeesPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!profile || !["admin", "hr"].includes(profile.role)) {
    redirect("/");
  }

  const isAdmin = profile.role === "admin";

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")
    .returns<Profile[]>();

  let pendingSignupRequests: SignupRequest[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("signup_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingSignupRequests = data ?? [];
  }

  return (
    <div className="space-y-6">
      {isAdmin && <SignupRequestsPanel initialRequests={pendingSignupRequests} />}

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Employees</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <EmployeesImportExport employees={employees ?? []} />
            <EmployeeFormDialog
              trigger={
                <Button size="sm" data-testid="employee-add-trigger">
                  <Plus className="h-4 w-4" />
                  Add employee
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <EmployeesTable employees={employees ?? []} currentUserId={user!.id} />
        </CardContent>
      </Card>
    </div>
  );
}
