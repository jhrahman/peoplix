"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJI_CATEGORIES, SKIN_TONES, applyTone } from "@/lib/engagement";
import { isEmojiSupported } from "@/lib/emoji-support";
import { cn } from "@/lib/utils";

const TONE_STORAGE_KEY = "peoplix:emoji-tone";

// A per-person convenience only (like a remembered tab), so any storage failure
// just means "default tone".
function readTone() {
  try {
    const stored = Number(window.localStorage.getItem(TONE_STORAGE_KEY));
    return Number.isInteger(stored) && stored >= 0 && stored < SKIN_TONES.length ? stored : 0;
  } catch {
    return 0;
  }
}

// Representative skin colours for the tone buttons (not theme colours).
const TONE_SWATCH = ["#FFCC4D", "#F7DECE", "#F3D2A2", "#D5AB88", "#AF7E57", "#7C533E"];

// Discord-style picker: searchable, grouped, jump-to-section tabs, skin tones,
// and limited to the curated workplace set in lib/engagement.ts (the API rejects
// anything else). Emojis this device can't draw are left out rather than shown
// as empty boxes. The list scrolls on its own, including when the picker is
// opened from inside a dialog such as a celebration card (see ui/popover.tsx).
export function EmojiPicker({
  onPick,
  selected = [],
  children,
  testId,
}: {
  onPick: (emoji: string) => void;
  // Emojis the viewer already used - highlighted, and picking one removes it.
  selected?: string[];
  children: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        collisionPadding={12}
        className="w-[min(21rem,calc(100vw-2rem))] gap-0 p-0"
        data-testid={testId}
      >
        {/* Mounted only while open, so it starts clean and reads the saved tone then. */}
        <PickerBody
          selected={selected}
          onPick={(emoji) => {
            onPick(emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function PickerBody({
  onPick,
  selected,
}: {
  onPick: (emoji: string) => void;
  selected: string[];
}) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState(readTone);
  const scroller = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EMOJI_CATEGORIES.map((category) => ({
      ...category,
      emojis: category.emojis
        .filter((e) => !q || `${e.label} ${e.keywords ?? ""}`.toLowerCase().includes(q))
        .map((e) => ({ ...e, shown: applyTone(e, tone) }))
        // Not every device can draw every emoji (or every skin-tone variant).
        .filter((e) => isEmojiSupported(e.shown)),
    })).filter((category) => category.emojis.length > 0);
  }, [query, tone]);

  function chooseTone(id: number) {
    setTone(id);
    try {
      window.localStorage.setItem(TONE_STORAGE_KEY, String(id));
    } catch {
      // Not remembered - fine.
    }
  }

  function jumpTo(id: string) {
    const section = sections.current.get(id);
    scroller.current?.scrollTo({ top: section ? section.offsetTop - 4 : 0, behavior: "smooth" });
  }

  return (
    <div>
      <div className="relative border-b border-border p-2">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reactions..."
          aria-label="Search reactions"
          className="h-8 w-full rounded-lg bg-muted/60 pr-2 pl-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
          data-testid="emoji-search"
        />
      </div>

      {/* Jump to a group - the full set is long enough that scrolling alone is slow. */}
      {!query.trim() && (
        <div className="flex gap-0.5 border-b border-border px-2 py-1" role="tablist" aria-label="Emoji groups">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => jumpTo(category.id)}
              title={category.label}
              aria-label={`Jump to ${category.label}`}
              data-testid={`emoji-jump-${category.id}`}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg leading-none transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {category.emojis[0].shown}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scroller}
        className="relative max-h-72 space-y-3 overflow-y-auto overscroll-contain p-2"
        data-testid="emoji-scroll"
      >
        {categories.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No matching reactions</p>
        )}
        {categories.map((category) => (
          <section
            key={category.id}
            ref={(node) => {
              if (node) sections.current.set(category.id, node);
              else sections.current.delete(category.id);
            }}
          >
            <h3 className="px-1 pb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              {category.label}
            </h3>
            <div className="grid grid-cols-7 gap-0.5">
              {category.emojis.map((e) => (
                <button
                  key={e.emoji}
                  type="button"
                  title={e.label}
                  aria-label={e.label}
                  aria-pressed={selected.includes(e.shown)}
                  onClick={() => onPick(e.shown)}
                  data-testid={`emoji-${e.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className={cn(
                    "flex size-9 cursor-pointer items-center justify-center rounded-lg text-xl leading-none transition-transform duration-150 outline-none hover:scale-110 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95",
                    selected.includes(e.shown) && "bg-primary/15",
                  )}
                >
                  {e.shown}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5">
        <span className="text-[0.7rem] text-muted-foreground">Skin tone</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Skin tone">
          {SKIN_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tone === t.id}
              aria-label={t.label}
              title={t.label}
              onClick={() => chooseTone(t.id)}
              data-testid={`emoji-tone-${t.id}`}
              className={cn(
                "size-5 cursor-pointer rounded-full outline-none ring-offset-1 ring-offset-popover transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                tone === t.id && "ring-2 ring-primary",
              )}
              style={{ backgroundColor: TONE_SWATCH[t.id] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
