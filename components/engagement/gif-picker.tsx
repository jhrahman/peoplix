"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type GifResult = {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
};

type Page = { key: string; gifs: GifResult[]; next: number | null; error: string | null };

const SEARCH_DELAY_MS = 400;

async function fetchGifs(query: string, offset: number, signal?: AbortSignal): Promise<Page> {
  const params = new URLSearchParams({ q: query, offset: String(offset) });
  const res = await fetch(`/api/gifs?${params}`, { signal }).catch(() => null);
  const json = await res?.json().catch(() => null);

  if (!res?.ok) {
    return { key: query, gifs: [], next: null, error: json?.error ?? "GIF search is unavailable right now." };
  }
  return { key: query, gifs: json.data ?? [], next: json.next_offset ?? null, error: null };
}

// Search GIPHY for a GIF to put on a comment. Opens on what's trending, then
// narrows as you type (after a short pause, to stay inside the free key's
// hourly limit). GIPHY's terms ask for the "Powered by GIPHY" credit.
export function GifPicker({
  onPick,
  disabled,
}: {
  onPick: (gif: GifResult) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full text-[0.7rem] font-bold tracking-wide"
          disabled={disabled}
          aria-label="Add a GIF"
          title="Add a GIF"
          data-testid="comment-gif-button"
        >
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0"
        data-testid="gif-picker"
      >
        {/* Mounted only while open, so it starts fresh and loads "trending" each time. */}
        <GifSearch
          onPick={(gif) => {
            onPick(gif);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function GifSearch({ onPick }: { onPick: (gif: GifResult) => void }) {
  const [text, setText] = useState("");
  // The search actually being shown (the text, after the typing pause). Fewer
  // than 2 characters is treated as "no search" so it stays on trending.
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Loading is derived: we're loading whenever the page on screen is for a
  // different search than the one being asked for.
  const loading = page === null || page.key !== query;

  useEffect(() => {
    const controller = new AbortController();
    fetchGifs(query, 0, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPage(result);
    });
    return () => controller.abort();
  }, [query]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = value.trim();
      setQuery(trimmed.length >= 2 ? trimmed : "");
    }, SEARCH_DELAY_MS);
  }

  async function loadMore() {
    if (!page?.next || loadingMore) return;
    setLoadingMore(true);
    const more = await fetchGifs(page.key, page.next);
    setLoadingMore(false);
    setPage((prev) =>
      prev && prev.key === more.key
        ? { ...prev, gifs: [...prev.gifs, ...more.gifs], next: more.next, error: more.error }
        : prev,
    );
  }

  return (
    <div>
      <div className="relative border-b border-border p-2">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search GIFs..."
          aria-label="Search GIFs"
          maxLength={50}
          className="h-8 w-full rounded-lg bg-muted/60 pr-8 pl-8 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
          data-testid="gif-search-input"
        />
        {text && (
          <button
            type="button"
            onClick={() => handleChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-72 min-h-40 overflow-y-auto p-2" data-testid="gif-results">
        {loading ? (
          <div className="grid grid-cols-2 gap-1.5" aria-label="Loading GIFs">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/70" />
            ))}
          </div>
        ) : page.error ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground" data-testid="gif-error">
            {page.error}
          </p>
        ) : page.gifs.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground" data-testid="gif-empty">
            No GIFs found for &ldquo;{page.key}&rdquo;. Try another word.
          </p>
        ) : (
          <>
            <p className="px-1 pb-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              {page.key ? `Results for “${page.key}”` : "Trending"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {page.gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => onPick(gif)}
                  aria-label={gif.title}
                  title={gif.title}
                  className="cursor-pointer overflow-hidden rounded-lg bg-muted outline-none transition-transform duration-150 hover:scale-[1.03] focus-visible:ring-3 focus-visible:ring-ring/50"
                  data-testid={`gif-option-${gif.id}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gif.preview} alt="" loading="lazy" className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
            {page.next !== null && (
              <div className="flex justify-center pt-2">
                <Button type="button" variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="border-t border-border px-3 py-1.5 text-center text-[0.7rem] text-muted-foreground">
        Powered by GIPHY
      </p>
    </div>
  );
}
