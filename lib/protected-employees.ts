// The one account treated as this app's System Admin (e.g. sole access to
// the Danger Zone's Clear Database action). Client-side checks here only
// drive UI; routes that gate on this re-check it server-side since that's
// the actual security boundary.
const SYSTEM_ADMIN_EMAIL = "tflash978@gmail.com";

// Employees who can never be deleted, regardless of role. Client-side checks
// here only drive UI (hiding the delete button); the DELETE route re-checks
// this server-side since that's the actual security boundary.
const PROTECTED_EMPLOYEE_EMAILS = new Set([SYSTEM_ADMIN_EMAIL]);

export function isProtectedEmployee(email: string | null | undefined) {
  return Boolean(email && PROTECTED_EMPLOYEE_EMAILS.has(email.toLowerCase()));
}

export function isSystemAdmin(email: string | null | undefined) {
  return Boolean(email && email.toLowerCase() === SYSTEM_ADMIN_EMAIL);
}
