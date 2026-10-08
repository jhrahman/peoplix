import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cache/ratelimit";
import { isAllowedGifUrl } from "@/lib/comment-media";

const PAGE_SIZE = 18;
const MAX_OFFSET = 200;
const GIPHY = "https://api.giphy.com/v1/gifs";

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = { id?: string; title?: string; images?: Record<string, GiphyImage | undefined> };

// GIF search for comments, backed by GIPHY (Tenor's API was shut down by Google
// on 30 June 2026). The key stays on the server; the browser only talks to this
// route. GIPHY's free "beta" key is limited to 100 calls per hour, so results
// are kept in Next's data cache for an hour - the same search (or the
// trending list) is paid for once, not once per person.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GIF search isn't set up yet. Ask an admin to add a GIPHY API key." },
      { status: 503 },
    );
  }

  const allowed = await checkRateLimit(`gif-search:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Slow down a little and try again." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 50);
  const offset = Math.min(Math.max(Number(searchParams.get("offset")) || 0, 0), MAX_OFFSET);

  // No search text means "show me what's popular".
  const url = new URL(`${GIPHY}/${query ? "search" : "trending"}`);
  url.searchParams.set("api_key", apiKey);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  // Workplace-appropriate results only.
  url.searchParams.set("rating", "g");
  url.searchParams.set("lang", "en");

  const res = await fetch(url, { next: { revalidate: 3600 } }).catch(() => null);

  // Never echo GIPHY's response or URL back: the URL contains the key.
  if (res?.status === 429) {
    return NextResponse.json(
      { error: "GIF search is busy right now. Try again in a little while." },
      { status: 503 },
    );
  }
  if (!res?.ok) {
    return NextResponse.json({ error: "GIF search is unavailable right now." }, { status: 502 });
  }

  const json = (await res.json().catch(() => null)) as {
    data?: GiphyItem[];
    pagination?: { total_count?: number; count?: number; offset?: number };
  } | null;

  const gifs = (json?.data ?? []).flatMap((item) => {
    // fixed_height is ~200px tall: sharp enough for a comment, light enough to load fast.
    const main = item.images?.fixed_height;
    const small = item.images?.fixed_width_small ?? item.images?.fixed_height_small ?? main;
    if (!item.id || !isAllowedGifUrl(main?.url) || !isAllowedGifUrl(small?.url)) return [];
    return [
      {
        id: item.id,
        title: item.title || "GIF",
        url: main.url,
        preview: small.url,
        width: Number(main.width) || 200,
        height: Number(main.height) || 200,
      },
    ];
  });

  const total = json?.pagination?.total_count ?? 0;
  const next = (json?.pagination?.offset ?? offset) + (json?.pagination?.count ?? gifs.length);

  return NextResponse.json({
    data: gifs,
    next_offset: next < total && next <= MAX_OFFSET && gifs.length > 0 ? next : null,
  });
}
