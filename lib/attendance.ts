export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "—";
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// For pre-filling a <input type="time"> from a stored timestamp, in the browser's local time.
export function toLocalTimeInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Combines a plain date ("YYYY-MM-DD") with a <input type="time"> value ("HH:MM"),
// interpreted in the browser's local timezone, into a UTC ISO timestamp.
export function buildIsoFromDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
