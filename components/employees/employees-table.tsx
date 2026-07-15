"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) =>
      [employee.full_name, employee.email, employee.department, employee.designation]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [employees, query]);

  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No employees yet. Add the first one above.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, department, designation..."
          className="pl-8 pr-8"
          data-testid="employees-search-input"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            data-testid="employees-search-clear"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="employees-empty">
          No employees match your search.
        </p>
      ) : (
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
            {filtered.map((employee) => (
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
      )}
    </div>
  );
}
