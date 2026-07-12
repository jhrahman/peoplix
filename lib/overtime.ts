export const MIN_OVERTIME_HOURS = 0.5;
export const MAX_OVERTIME_HOURS = 12;

export const OVERTIME_HOUR_OPTIONS = Array.from(
  { length: (MAX_OVERTIME_HOURS - MIN_OVERTIME_HOURS) / 0.5 + 1 },
  (_, i) => Number((MIN_OVERTIME_HOURS + i * 0.5).toFixed(1)),
);

export function isValidOvertimeHours(hours: number) {
  return (
    Number.isFinite(hours) &&
    hours >= MIN_OVERTIME_HOURS &&
    hours <= MAX_OVERTIME_HOURS &&
    Number.isInteger(hours * 2)
  );
}

export function formatOvertimeHours(hours: number) {
  return `${hours}h`;
}
