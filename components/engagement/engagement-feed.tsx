"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AtSign,
  Award,
  ChartColumn,
  LayoutList,
  Megaphone,
  MessagesSquare,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_MAX_LENGTH } from "@/lib/engagement";
import { cn } from "@/lib/utils";
import type { Celebration } from "@/lib/celebrations";
import type { Occasion } from "@/lib/wish-constants";
import type { FeedPost, PersonOption, PostKind, Profile } from "@/lib/types";
import { CelebrationsCard } from "@/components/engagement/celebrations-card";
import { EngagementProvider } from "@/components/engagement/engagement-context";
import { PostCard } from "@/components/engagement/post-card";
import { PostComposer } from "@/components/engagement/post-composer";
import { WishDialog, type WishTarget } from "@/components/engagement/wish-dialog";

export type EngagementUser = Pick<Profile, "id" | "full_name" | "avatar_url" | "role">;

type FeedPage = { posts: FeedPost[]; hasMore: boolean };
type FeedType = "posts" | "announcements";
type KindFilter = "all" | "mentions" | PostKind;
type View = { kind: KindFilter; q: string };
type FeedQuery = { kind: PostKind | null; q: string; mentioned: boolean };

const FILTERS: { value: KindFilter; label: string; icon: typeof Pencil }[] = [
  { value: "all", label: "All", icon: LayoutList },
  { value: "mentions", label: "Mentions", icon: AtSign },
  { value: "update", label: "Posts", icon: Pencil },
  { value: "kudos", label: "Kudos", icon: Award },
  { value: "poll", label: "Polls", icon: ChartColumn },
];

const EMPTY_TEXT: Record<KindFilter, string> = {
  all: "Nothing here yet. Be the first to share something with the team.",
  mentions: "Nobody has tagged you in a post yet.",
  update: "No posts yet.",
  kudos: "No kudos yet. Recognize a colleague who made your week.",
  poll: "No polls yet. Ask the team something.",
};

const SEARCH_DEBOUNCE_MS = 300;

function feedQuery({ kind, q }: View): FeedQuery {
  return {
    kind: kind === "all" || kind === "mentions" ? null : kind,
    q,
    mentioned: kind === "mentions",
  };
}

// The announcements rail has no kind filter, but search and "Mentions" apply to it too.
function announcementQuery(view: View): FeedQuery {
  return { ...feedQuery(view), kind: null };
}

function queryString(type: FeedType, query: FeedQuery, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ type, ...extra });
  if (query.kind) params.set("kind", query.kind);
  if (query.q) params.set("q", query.q);
  if (query.mentioned) params.set("mentioned", "me");
  return params.toString();
}

function sortPinnedFirst(posts: FeedPost[]) {
  // Array.sort is stable, so the existing newest-first order survives within each group.
  return [...posts].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
}

// Local state for one list (the feed or the announcements rail). Mutations
// update this in place instead of calling router.refresh(), so posting,
// reacting or deleting never re-runs the page's server queries.
function useFeedList(initial: FeedPage, type: FeedType) {
  const [posts, setPosts] = useState(initial.posts);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloading, setReloading] = useState(false);
  // Only the newest reload may apply its result - typing in the search box
  // fires several in a row and they can return out of order.
  const latestReload = useRef(0);

  async function loadMore(query: FeedQuery) {
    // Pinned posts only ever appear on the first page, so the cursor is the
    // oldest *unpinned* post and the next page excludes pinned ones.
    const cursor = [...posts].reverse().find((p) => !p.is_pinned);
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    const res = await fetch(
      `/api/posts?${queryString(type, query, { pinned: "false", before: cursor.created_at })}`,
    ).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setLoadingMore(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't load more");
      return;
    }

    setPosts((prev) => [...prev, ...json.data]);
    setHasMore(json.has_more);
  }

  async function reload(query: FeedQuery) {
    const id = ++latestReload.current;
    setReloading(true);
    const res = await fetch(`/api/posts?${queryString(type, query)}`).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (id !== latestReload.current) return;
    setReloading(false);

    if (!res?.ok) {
      toast.error(json?.error ?? "Couldn't load the feed");
      return;
    }

    setPosts(json.data);
    setHasMore(json.has_more);
  }

  return {
    posts,
    hasMore,
    loadingMore,
    reloading,
    loadMore,
    reload,
    prepend: (post: FeedPost) => setPosts((prev) => [post, ...prev]),
    update: (id: string, update: (post: FeedPost) => FeedPost) =>
      setPosts((prev) => {
        const next = prev.map((p) => (p.id === id ? update(p) : p));
        return type === "announcements" ? sortPinnedFirst(next) : next;
      }),
    remove: (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id)),
  };
}

function PostList({
  list,
  query,
  currentUser,
  isNew,
  emptyIcon: EmptyIcon,
  emptyText,
  testId,
}: {
  list: ReturnType<typeof useFeedList>;
  query: FeedQuery;
  currentUser: EngagementUser;
  isNew: (post: FeedPost) => boolean;
  emptyIcon: typeof Megaphone;
  emptyText: string;
  testId: string;
}) {
  if (list.reloading) {
    return (
      <div className="space-y-4" aria-label="Loading posts">
        {[0, 1].map((i) => (
          <div key={i} className="glass-panel h-40 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.posts.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center"
        data-testid={`${testId}-empty`}
      >
        <EmptyIcon className="size-6 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={testId}>
      {list.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          isNew={isNew(post)}
          onUpdate={(update) => list.update(post.id, update)}
          onDelete={() => list.remove(post.id)}
        />
      ))}
      {list.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => list.loadMore(query)}
            disabled={list.loadingMore}
            data-testid={`${testId}-load-more`}
          >
            {list.loadingMore ? "Loading..." : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function EngagementFeed({
  currentUser,
  people,
  celebrations: initialCelebrations,
  onLeaveTodayIds,
  openWishes,
  lastSeenMs,
  initialFeed,
  initialAnnouncements,
}: {
  currentUser: EngagementUser;
  people: PersonOption[];
  celebrations: Celebration[];
  // Employees on approved leave today (powers the hover preview's 🌴).
  onLeaveTodayIds: string[];
  // Set when arriving from a wish notification: open that card straight away.
  openWishes: { occasion: Occasion; date: string; recipientId: string } | null;
  // When this person last left the page; null on their first visit, so
  // nothing is flagged "New" for someone who has never seen the feed.
  lastSeenMs: number | null;
  initialFeed: FeedPage;
  initialAnnouncements: FeedPage;
}) {
  const feed = useFeedList(initialFeed, "posts");
  const announcements = useFeedList(initialAnnouncements, "announcements");
  // Below `lg` the two columns collapse into tabs; from `lg` up both are
  // always visible and this state is simply ignored.
  const [tab, setTab] = useState<FeedType>("posts");
  const [view, setView] = useState<View>({ kind: "all", q: "" });
  const viewRef = useRef(view);
  const [searchText, setSearchText] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [celebrations, setCelebrations] = useState(initialCelebrations);
  const [wishTarget, setWishTarget] = useState<WishTarget | null>(
    openWishes
      ? { recipientId: openWishes.recipientId, occasion: openWishes.occasion, date: openWishes.date, years: null }
      : null,
  );

  // Remember when they leave, so the next visit can flag what's new since.
  // Cookie (not localStorage) so the server render knows it too.
  useEffect(() => {
    const save = () => {
      document.cookie = `engagement_seen_${currentUser.id}=${new Date().toISOString()}; path=/; max-age=31536000; samesite=lax`;
    };
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [currentUser.id]);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const isNew = (post: FeedPost) =>
    lastSeenMs !== null &&
    post.author?.id !== currentUser.id &&
    Date.parse(post.created_at) > lastSeenMs;
  const newAnnouncements = announcements.posts.filter(isNew).length;

  function applyView(patch: Partial<View>) {
    const prev = viewRef.current;
    const next = { ...prev, ...patch };
    if (next.kind === prev.kind && next.q === prev.q) return;

    viewRef.current = next;
    setView(next);
    feed.reload(feedQuery(next));
    // Kind chips only concern the feed; search and Mentions concern both lists.
    if (next.q !== prev.q || (next.kind === "mentions") !== (prev.kind === "mentions")) {
      announcements.reload(announcementQuery(next));
    }
  }

  function openWish(c: Celebration) {
    // Every celebration has a card; the kind is the occasion.
    setWishTarget({
      recipientId: c.id,
      occasion: c.kind,
      date: c.date,
      years: c.kind === "milestone" || c.kind === "anniversary" ? c.years : null,
    });
  }

  // The card on screen and the "N wishes" / "Wished ✓" state follow what happens in the dialog.
  function handleWishChange(change: { count: number; mine?: boolean }) {
    if (!wishTarget) return;
    const key = `${wishTarget.occasion}:${wishTarget.recipientId}:${wishTarget.date}`;
    setCelebrations((prev) =>
      prev.map((c) =>
        c.key === key
          ? {
              ...c,
              wishCount: Math.max(0, c.wishCount + change.count),
              iWished: change.mine ?? c.iWished,
            }
          : c,
      ),
    );
  }

  const activeCelebration = wishTarget
    ? celebrations.find(
        (c) => c.key === `${wishTarget.occasion}:${wishTarget.recipientId}:${wishTarget.date}`,
      )
    : undefined;

  function handleSearchChange(value: string) {
    setSearchText(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyView({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  function clearSearch() {
    clearTimeout(searchTimer.current);
    setSearchText("");
    applyView({ q: "" });
  }

  function handlePosted(post: FeedPost) {
    const current = viewRef.current;
    const visible =
      current.q === "" &&
      current.kind !== "mentions" &&
      (post.is_announcement || current.kind === "all" || current.kind === post.kind);

    if (visible) {
      (post.is_announcement ? announcements : feed).prepend(post);
    } else {
      // The active search/filter would hide what they just posted - show everything instead.
      setSearchText("");
      applyView({ kind: "all", q: "" });
    }

    setTab(post.is_announcement ? "announcements" : "posts");
    if (post.is_announcement) toast.success("Announcement published");
    else if (post.kind === "kudos") toast.success("Kudos sent 🎉");
  }

  const searching = view.q !== "";
  const feedEmpty = searching ? `No posts match “${view.q}”.` : EMPTY_TEXT[view.kind];
  const announcementsEmpty = searching
    ? `No announcements match “${view.q}”.`
    : view.kind === "mentions"
      ? "No announcement has tagged you."
      : "No announcements yet.";

  const tabs: { value: FeedType; label: string; icon: typeof Megaphone; badge: number }[] = [
    { value: "posts", label: "Feed", icon: MessagesSquare, badge: 0 },
    { value: "announcements", label: "Announcements", icon: Megaphone, badge: newAnnouncements },
  ];

  return (
    <EngagementProvider
      currentUserId={currentUser.id}
      people={people}
      onLeaveTodayIds={onLeaveTodayIds}
    >
      <div className="mx-auto max-w-5xl">
        <div
          role="tablist"
          aria-label="Engagement sections"
          className="glass-panel mb-4 grid grid-cols-2 gap-1 rounded-xl p-1 lg:hidden"
        >
          {tabs.map(({ value, label, icon: Icon, badge }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              data-testid={`engagement-tab-${value}`}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === value
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_4px_16px_-4px] shadow-primary/50"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {badge > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[0.7rem] leading-5 tabular-nums",
                    tab === value ? "bg-primary-foreground/25" : "bg-primary text-primary-foreground",
                  )}
                  aria-label={`${badge} new`}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            aria-label="Feed"
            className={cn("min-w-0 space-y-4", tab !== "posts" && "hidden lg:block")}
          >
            <CelebrationsCard
              celebrations={celebrations}
              currentUserId={currentUser.id}
              onOpenWish={openWish}
              limit={3}
              className="lg:hidden"
            />
            <PostComposer currentUser={currentUser} people={people} onPosted={handlePosted} />

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                maxLength={SEARCH_MAX_LENGTH}
                placeholder="Search posts and announcements..."
                aria-label="Search posts and announcements"
                className="h-9 rounded-full pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                data-testid="feed-search"
              />
              {searchText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={clearSearch}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
                  aria-label="Clear search"
                  data-testid="feed-search-clear"
                >
                  <X />
                </Button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter the feed"
              className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]"
            >
              {FILTERS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyView({ kind: value })}
                  aria-pressed={view.kind === value}
                  data-testid={`feed-filter-${value}`}
                  className={cn(
                    "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-all duration-150 outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0",
                    view.kind === value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <PostList
              list={feed}
              query={feedQuery(view)}
              currentUser={currentUser}
              isNew={isNew}
              emptyIcon={searching ? Search : MessagesSquare}
              emptyText={feedEmpty}
              testId="feed-list"
            />
          </section>

          {/* Sticky on desktop, scrolling on its own if the list outgrows the viewport. */}
          <aside
            aria-label="Announcements"
            className={cn(
              "min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1",
              tab !== "announcements" && "hidden lg:block",
            )}
          >
            <CelebrationsCard
              celebrations={celebrations}
              currentUserId={currentUser.id}
              onOpenWish={openWish}
              limit={6}
              className="hidden lg:flex"
            />
            <h2 className="hidden items-center gap-2 px-1 text-base font-medium lg:flex">
              <Megaphone className="size-4 text-primary" />
              Announcements
              {newAnnouncements > 0 && (
                <span className="rounded-full bg-primary px-2 text-xs leading-5 text-primary-foreground tabular-nums">
                  {newAnnouncements} new
                </span>
              )}
            </h2>
            <PostList
              list={announcements}
              query={announcementQuery(view)}
              currentUser={currentUser}
              isNew={isNew}
              emptyIcon={searching ? Search : Megaphone}
              emptyText={announcementsEmpty}
              testId="announcements-list"
            />
          </aside>
        </div>
      </div>

      <WishDialog
        target={wishTarget}
        currentUserId={currentUser.id}
        isAdmin={currentUser.role === "admin"}
        canWish={Boolean(activeCelebration?.canWish)}
        onClose={() => setWishTarget(null)}
        onChange={handleWishChange}
      />
    </EngagementProvider>
  );
}
