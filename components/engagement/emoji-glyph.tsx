"use client";

import { useSyncExternalStore } from "react";
import { EMOJI_CATEGORIES } from "@/lib/engagement";
import { isEmojiSupported } from "@/lib/emoji-support";

const LABELS = new Map(EMOJI_CATEGORIES.flatMap((c) => c.emojis.map((e) => [e.emoji, e.label] as const)));

const noSubscribe = () => () => {};

// Whether this device can draw the emoji. useSyncExternalStore gives the server
// render (and hydration) "yes", then the real answer once on the client, so
// there is no hydration mismatch on devices that can't draw it.
export function useEmojiSupported(emoji: string) {
  return useSyncExternalStore(
    noSubscribe,
    () => isEmojiSupported(emoji),
    () => true,
  );
}

// An emoji that always shows something readable: the emoji itself, or - on a
// device too old to draw it - its name, instead of an empty box.
export function EmojiGlyph({ emoji, className }: { emoji: string; className?: string }) {
  const supported = useEmojiSupported(emoji);
  // Skin-tone variants share their base emoji's name.
  const base = [...emoji].filter((c) => !/[\u{1F3FB}-\u{1F3FF}]/u.test(c)).join("");

  if (supported) {
    return (
      <span className={className} aria-hidden>
        {emoji}
      </span>
    );
  }
  return <span className="text-[0.7rem] font-medium">{LABELS.get(base) ?? LABELS.get(emoji) ?? "Reaction"}</span>;
}
