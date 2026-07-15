export const DHAKA_TIME_ZONE = "Asia/Dhaka";
export const DHAKA_UTC_OFFSET = "+06:00"; // Bangladesh Standard Time - fixed offset, no DST

// The calendar date (YYYY-MM-DD) of the given instant in Bangladesh Standard
// Time - defaults to now. Attendance/audit-log day comparisons are keyed to
// the Dhaka day so they line up with what formatDateTime()/formatTime() show,
// regardless of the server's/browser's own timezone.
export function toDhakaDateString(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TIME_ZONE }).format(date);
}

// e.g. "Jul 20, 2026, 2:35 PM" - a full date+time stamp in Bangladesh
// Standard Time, 12-hour format.
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: DHAKA_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
