import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { EmployeesTable } from "@/components/employees/employees-table";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeesImportExport } from "@/components/employees/employees-import-export";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  if (!profile || !["admin", "hr"].includes(profile.role)) {
    redirect("/");
  }

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")
    .returns<Profile[]>();

  return (
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
  );
}
