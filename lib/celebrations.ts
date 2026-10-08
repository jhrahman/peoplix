import type { Profile } from "@/lib/types";

export type CelebrationPerson = Pick<Profile, "id" | "full_name" | "avatar_url" | "joined_date">;

// Only the day and month of a birthday ever leave the server (never the year),
// and only for people who left "share with team" on.
export type SharedBirthday = { id: string; month: number; day: number };

export type CelebrationKind = "birthday" | "milestone" | "anniversary" | "new_joiner";

export type Celebration = {
  // Unique per person + occasion + day, e.g. "birthday:<id>:2026-10-08".
  key: string;
  id: string;
  full_name: string;
  avatar_url: string | null;
  kind: CelebrationKind;
  // The day being celebrated (YYYY-MM-DD). For new joiners, their join date.
  date: string;
  // Milestones and anniversaries: how many years.
  years: number;
  // Days until it (0 = today, negative = days ago). For new joiners: days since joining.
  days: number;
  // Whether the card is open right now: wishes, comments and reactions are allowed.
  canWish: boolean;
  wishCount: number;
  iWished: boolean;
};

const DAY_MS = 86_400_000;

// A wish can be sent on the day itself or up to this many days after, so
// someone who missed the day can still send a (belated) one - but nobody can
// wish ahead of time or months later.
export const WISH_GRACE_DAYS = 3;
const UPCOMING_DAYS = 7;
// A new joiner's welcome card stays open (and listed) for this many days.
export const NEW_JOINER_DAYS = 14;

// Work-anniversary milestones worth a celebration card: 3, 5, 10, then every
// 5 years (15, 20, 25...). Other anniversaries are shown but not wishable.
export function isMilestoneYear(years: number) {
  return years === 3 || years === 5 || (years >= 10 && years % 5 === 0);
}

function utcMs(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoOf(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

// The occurrence of a month/day nearest to `today`, if it falls inside the
// window [-daysBefore, +daysAfter]. Checks the neighbouring years so a
// birthday on Jan 2 is still found from Dec 30. (Feb 29 lands on Mar 1 in
// non-leap years, the same way on the server and in the browser.)
export function occurrenceNear(
  month: number,
  day: number,
  today: string,
  daysBefore = WISH_GRACE_DAYS,
  daysAfter = UPCOMING_DAYS,
): { date: string; days: number } | null {
  const todayMs = utcMs(today);
  const year = new Date(todayMs).getUTCFullYear();

  for (const y of [year - 1, year, year + 1]) {
    const ms = Date.UTC(y, month - 1, day);
    const days = Math.round((ms - todayMs) / DAY_MS);
    if (days >= -daysBefore && days <= daysAfter) return { date: isoOf(ms), days };
  }
  return null;
}

export function monthDayOf(isoDate: string) {
  const [, m, d] = isoDate.split("-").map(Number);
  return { month: m, day: d };
}

// Birthdays and work-anniversary milestones around today (recent, today, and
// the coming week), upcoming plain anniversaries, and people who just joined.
// Built from profiles.joined_date and the shared-birthday list, so nobody
// enters anything twice. `today` is the Dhaka calendar date.
export function buildCelebrations(
  people: CelebrationPerson[],
  birthdays: SharedBirthday[],
  today: string,
): Celebration[] {
  const todayMs = utcMs(today);
  const byId = new Map(people.map((p) => [p.id, p]));
  const result: Celebration[] = [];

  const add = (
    person: CelebrationPerson,
    kind: CelebrationKind,
    date: string,
    days: number,
    years: number,
  ) =>
    result.push({
      key: `${kind}:${person.id}:${date}`,
      id: person.id,
      full_name: person.full_name,
      avatar_url: person.avatar_url,
      kind,
      date,
      years,
      days,
      // Birthdays and anniversaries open on the day (and stay open for the grace
      // period); a welcome card is open from the day someone joins.
      canWish: kind === "new_joiner" ? true : days <= 0,
      wishCount: 0,
      iWished: false,
    });

  for (const b of birthdays) {
    const person = byId.get(b.id);
    const occ = person && occurrenceNear(b.month, b.day, today);
    if (person && occ) add(person, "birthday", occ.date, occ.days, 0);
  }

  for (const person of people) {
    if (!person.joined_date) continue;

    const daysSinceJoined = Math.round((todayMs - utcMs(person.joined_date)) / DAY_MS);
    if (daysSinceJoined < 0) continue;

    if (daysSinceJoined <= NEW_JOINER_DAYS) {
      add(person, "new_joiner", person.joined_date, daysSinceJoined, 0);
      continue;
    }

    const { month, day } = monthDayOf(person.joined_date);
    const occ = occurrenceNear(month, day, today);
    if (!occ) continue;

    const years = Number(occ.date.slice(0, 4)) - Number(person.joined_date.slice(0, 4));
    if (years < 1) continue;

    // 3, 5, 10 and every 5th year are "milestones"; every other year is a plain
    // anniversary. Both get a full card - the difference is just the trophy.
    add(person, isMilestoneYear(years) ? "milestone" : "anniversary", occ.date, occ.days, years);
  }

  // Happening today first, then coming up, then recent ones people can still
  // wish, and new joiners last.
  const rank = (c: Celebration) =>
    c.kind === "new_joiner" ? 3 : c.days === 0 ? 0 : c.days > 0 ? 1 : 2;

  return result.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.kind === "new_joiner") return a.days - b.days;
    return Math.abs(a.days) - Math.abs(b.days) || a.full_name.localeCompare(b.full_name);
  });
}
