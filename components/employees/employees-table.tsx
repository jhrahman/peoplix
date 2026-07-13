"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";
import type { Profile } from "@/lib/types";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { DeleteEmployeeButton } from "@/components/employees/delete-employee-button";
import { isProtectedEmployee } from "@/lib/protected-employees";

export function EmployeesTable({
  employees,
  currentUserId,
}: {
  employees: Profile[];
  currentUserId: string;
}) {
  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No employees yet. Add the first one above.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} data-testid={`employee-row-${employee.id}`}>
              <TableCell className="font-medium">{employee.full_name}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.department ?? "—"}</TableCell>
              <TableCell>{employee.designation ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {employee.role}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-1">
                <EmployeeFormDialog
                  employee={employee}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${employee.full_name}`}
                      data-testid={`employee-edit-trigger-${employee.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                {employee.id !== currentUserId && !isProtectedEmployee(employee.email) && (
                  <DeleteEmployeeButton id={employee.id} name={employee.full_name} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
