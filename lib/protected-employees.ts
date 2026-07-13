// Employees who can never be deleted, regardless of role. Client-side checks
// here only drive UI (hiding the delete button); the DELETE route re-checks
// this server-side since that's the actual security boundary.
const PROTECTED_EMPLOYEE_EMAILS = new Set(["tflash978@gmail.com"]);

export function isProtectedEmployee(email: string | null | undefined) {
  return Boolean(email && PROTECTED_EMPLOYEE_EMAILS.has(email.toLowerCase()));
}
