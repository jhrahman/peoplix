// Fixed-date Bangladesh public holidays that fall on the same Gregorian
// date every year. Lunar-calendar holidays (Eid-ul-Fitr, Eid-ul-Adha, etc.)
// shift each year and are intentionally left out - Admin/HR add those
// manually per year.
export const DEFAULT_BD_HOLIDAYS = [
  { name: "International Mother Language Day", month: 2, day: 21 },
  { name: "Independence Day", month: 3, day: 26 },
  { name: "Bengali New Year (Pohela Boishakh)", month: 4, day: 14 },
  { name: "May Day", month: 5, day: 1 },
  { name: "National Mourning Day", month: 8, day: 15 },
  { name: "Victory Day", month: 12, day: 16 },
  { name: "Christmas Day", month: 12, day: 25 },
] as const;

export function defaultBdHolidaysForYear(year: number) {
  return DEFAULT_BD_HOLIDAYS.map((h) => ({
    name: h.name,
    date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
    is_recurring: true,
  }));
}
