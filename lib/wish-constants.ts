// Safe to import from Client Components (no server-only code in here) -
// lib/wishes.ts is the server half and pulls in the service-role client.

export const WISH_MAX_LENGTH = 200;
export const CARD_COMMENT_MAX_LENGTH = 500;

// Every celebration has a card: birthdays, work anniversaries (a "milestone" is
// 3, 5, 10, then every 5 years; "anniversary" is any other year), and people
// who just joined. They share one design and differ in wording and windows.
export type Occasion = "birthday" | "milestone" | "anniversary" | "new_joiner";

export const OCCASIONS: Occasion[] = ["birthday", "milestone", "anniversary", "new_joiner"];

export function isOccasion(value: unknown): value is Occasion {
  return OCCASIONS.includes(value as Occasion);
}

// How a card is named in messages.
export const CARD_NOUN: Record<Occasion, string> = {
  birthday: "birthday card",
  milestone: "work anniversary card",
  anniversary: "work anniversary card",
  new_joiner: "welcome card",
};

// One-tap starting points so sending a wish takes seconds; the sender can edit
// them or write their own.
const ANNIVERSARY_PRESETS = [
  "Congratulations on your work anniversary! 🏆",
  "Thank you for everything you do! 🙌",
  "Here's to many more years together! 🚀",
];

export const WISH_PRESETS: Record<Occasion, string[]> = {
  birthday: [
    "Happy birthday! 🎂",
    "Have an amazing day! 🎉",
    "Wishing you a wonderful year ahead! 🌟",
  ],
  milestone: ANNIVERSARY_PRESETS,
  anniversary: ANNIVERSARY_PRESETS,
  new_joiner: [
    "Welcome to the team! 👋",
    "So glad you're here! 🎉",
    "Looking forward to working with you! 🚀",
  ],
};
