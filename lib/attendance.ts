const DHAKA_TIME_ZONE = "Asia/Dhaka";
const DHAKA_UTC_OFFSET = "+06:00"; // Bangladesh Standard Time - fixed offset, no DST

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: DHAKA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "—";
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function hoursWorked(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, ms / 3_600_000);
}

// The current calendar date in Bangladesh Standard Time (UTC+6). Attendance
// "date" rows are keyed to the Dhaka day so a check-in just after midnight
// Dhaka time still lands on the correct day, regardless of the server's/
// browser's own timezone.
export function todayInDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TIME_ZONE }).format(new Date());
}

// For pre-filling a <input type="time"> from a stored timestamp, in Bangladesh Standard Time -
// matches what formatTime() displays in the history table, so editing round-trips exactly.
export function toDhakaTimeInputValue(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")!.value;
  const minute = parts.find((p) => p.type === "minute")!.value;
  return `${hour}:${minute}`;
}

// Combines a plain date ("YYYY-MM-DD") with a <input type="time"> value ("HH:MM"),
// both interpreted in Bangladesh Standard Time (UTC+6, no DST), into a UTC ISO timestamp.
export function buildIsoFromDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00${DHAKA_UTC_OFFSET}`).toISOString();
}
