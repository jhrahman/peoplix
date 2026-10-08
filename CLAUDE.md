# Peoplix — Project Conventions

Peoplix is a role-based HR management web app. Full plan: [hr-app-plan.md](hr-app-plan.md).

## Stack
- Next.js (App Router) + TypeScript
- Next.js API Routes as the backend (no separate server)
- Supabase (Postgres + Auth), free tier
- Upstash Redis (free tier) for caching and rate limiting — optional, never a hard dependency;
  see `lib/cache/redis.ts` and `lib/cache/ratelimit.ts`. Every call site falls back to a live
  Supabase query if Redis env vars are missing or a call fails.
- Tailwind CSS + shadcn/ui, glassmorphism + light/dark theme (`next-themes`)
- Vercel hosting, GitHub Actions CI/CD

## Design system
- Typography: Plus Jakarta Sans (body/UI), Outfit (`font-heading`, headings only). Don't reach for a third font.
- Two glass flavors from one teal/green family (seeded from `#0d8a82`): airy translucent-white "light glass"
  and charcoal-based "dark ash glass" (never pure black, never violet/indigo). The dark theme's accent is
  intentionally shifted/boosted (`oklch(0.78 0.16 175)`, a punchier emerald-teal) rather than reusing the
  light theme's exact hue — this keeps dark mode reading as vibrant instead of dimmed. Full rationale in
  plan §6 — read it before touching `globals.css` or `Card`. The accent lives entirely in CSS variables
  (`--primary`, `--ring`, etc.) — reference those tokens (`text-primary`, `bg-primary`, `ring-ring`), never
  a hardcoded Tailwind color like `bg-indigo-600`.
- `Card` is glass by default (translucent `bg-card` + `backdrop-blur`) — don't re-add manual `glass-panel` classes
  to `<Card>` usages; `glass-panel` is only for non-Card containers (`<aside>`, `<header>`, raw wrapper divs).
- Interactive elements (buttons, nav items, clickable cards) need a hover/active affordance - lift, glow, or
  brightness change, 150-200ms Tailwind transition. No new animation library for this.

## Folder conventions
- `/app/(auth)`, `/app/(dashboard)/...` — route groups per plan §4
- `/app/api/*/route.ts` — REST endpoints, one resource per folder
- `/components/ui` — shadcn primitives; `/components/layout` — Sidebar/Navbar/ThemeToggle; `/components/{feature}` — feature-specific
- `/lib/supabase` — `client.ts` (browser), `server.ts` (server components/route handlers), `middleware.ts`
- `/lib/cache` — `redis.ts` (Upstash wrapper: `getOrSetJSON`/`invalidate`), `ratelimit.ts` (`checkRateLimit`)
- `/lib/types.ts` — shared types (mirror DB schema in plan §3)

## House style
- Keep things simple, avoid overclaiming or over-engineering. No speculative abstractions.
- Prefer small, direct route handlers over generic middleware layers unless a pattern repeats 3+ times.
- No automated tests in this repo (see below) — don't scaffold test frameworks unprompted.

## Hard rules
- **RLS is required on every Supabase table.** No table ships without a row-level security policy.
- **Admin-only routes must re-check `role === 'admin'` server-side** from the session — never trust a disabled button or client-side role check as the security boundary (see plan §9, Clear Database).
- **Free-tier constraints:** Supabase free projects cap at 500MB DB / auto-pause after 7 days of inactivity. Keep this in mind for seed data volume and any keep-alive tooling.
- Employees can only read/write their own rows unless role is `hr` or `admin`. **Exception:**
  `profiles` are readable (SELECT only) by every authenticated user, to power the read-only
  Team Directory (`/directory`) — write access (insert/update/delete) is untouched by this.
- **`leave_balances.*_used` can never exceed `*_total` or go negative** — enforced both in the
  API routes (`app/api/leave/route.ts` and `app/api/leave/[id]/route.ts` check remaining balance
  before creating/approving a request) and at the database layer (`CHECK` constraints added in
  `supabase/migrations/0012_leave_balance_caps.sql`). If you ever touch this table directly,
  keep both layers in sync — don't rely on just one.
- **Engagement (`posts`, `post_comments`): delete is author-or-Admin, never HR.** Admin/HR may
  *publish* announcements, but moderating someone else's content is Admin only — checked in the
  `app/api/posts/**` routes and again in RLS (`0013_engagement.sql`). Length limits live in both
  `lib/engagement.ts` and the tables' `CHECK` constraints; change them together.
- **Engagement uploads go browser → Supabase Storage directly** (Vercel's request-body limit would
  reject a 20 MB video through an API route). Size/type caps are enforced by the bucket itself
  (`post-images` 3 MB, `post-videos` 20 MB) *and* mirrored in `lib/engagement.ts` and
  `post_media` CHECKs. Deleting a row never deletes its file — any code path that removes posts
  must call `lib/engagement-storage.ts` (free-tier Storage is 1 GB).
- **Notifications go only to the people directly involved** (the tagged person, a kudos recipient, a post's author when someone comments), are written through the
  service-role client (`lib/notifications.ts` - there is deliberately no insert policy, so a user
  session can't forge one), and are readable only by their recipient. Don't broadcast, and don't
  add an Admin "read everyone's" policy.
- **Date of birth must stay private.** It lives only in `employee_birthdays` (own-row RLS), never
  on `profiles`, in `/api/employees`, the Directory, or any response a teammate can read: `profiles`
  is readable by every signed-in user, so a column there leaks to the API even if the UI hides it.
  Team-facing birthday features go through `lib/birthdays.ts` (service role, day and month only,
  skips people who turned sharing off). Never return the year.
- **Every action on the Engagement page is audit-logged** through `auditEngagement()` in
  `lib/engagement-audit.ts` (posts, pins, comments, reactions, votes, wishes, card comments/reactions,
  deletes by anyone). A new engagement route needs its own line there with a readable message; skip
  only no-ops (re-adding a reaction you already have). Never put a date of birth in a message.
- **`profiles.role` can't be changed by a non-staff user** (trigger in `0018`). Don't loosen it, and
  remember `profiles` is user-writable by its owner, so any new column on it needs the same thought.
- **Destructive confirm buttons use `variant="destructive-solid"`**, never
  `className="bg-destructive ..."` (the default variant paints a green gradient image over any
  background colour, which is how delete buttons ended up green).
- **Comment attachments stay small and are validated twice.** One per comment: photo <= 1 MB, clip
  <= 5 MB (`lib/comment-media.ts`, buckets `comment-images` / `comment-videos`, CHECKs in `0019`), or a
  GIF link. A GIF URL is accepted only from GIPHY's own hosts (`isAllowedGifUrl`) - never store an
  arbitrary URL. GIF search goes through `/api/gifs` so the key stays server-side; **Tenor is not an
  option** (its API was shut down on 30 June 2026). Any route that deletes a comment, post, or account
  must also remove the files (`lib/engagement-storage.ts`).
- **Popovers must stay scrollable inside dialogs.** `components/ui/popover.tsx` stops wheel and touch
  events from reaching `document` (`keepScrollable`), because a dialog's scroll lock otherwise freezes any
  popover list (emoji picker, GIF picker, tag suggestions) opened from inside it. It needs
  `stopImmediatePropagation`, not just `stopPropagation`: in the App Router React's own listener sits on
  `document` too. Don't remove it, and don't add a bare `overflow-y-auto` popover list without it.
- **New emojis go in `EMOJI_CATEGORIES`** (`lib/engagement.ts`), which is also the API allowlist. Mark hands
  and people that take a skin tone with `tone: true`; leave joined sequences (like 🧑‍💻) untoned. Devices
  that can't draw an emoji are handled by `lib/emoji-support.ts`, so newer emojis are safe to add.
- **Every celebration has a card** (birthday, milestone, anniversary, new_joiner); don't add a rule that
  leaves a kind of celebration with nothing to click.
- **Wishes are created only by `POST /api/wishes`** (service role, after `verifyOccasion`), never by
  a client insert, because "is it really their day" needs the private birthday table.
- **@tags are stored as `@[Name](profile-id)`;** limits count the displayed `@Name`
  (`visibleLength` in `lib/mentions.ts`), and the raw DB caps are deliberately higher.
- **Don't assume a table's RLS delete policy matches "any staff member can delete anything."**
  Some are deliberately narrower for normal use (e.g. `attendance` only allows deleting your own
  *today's* row — history can't be deleted by anyone, including Admin). A route that genuinely
  needs to wipe a table regardless of that (like `admin/clear-database`) must use the service-role
  client and say so in a comment — RLS silently deleting zero matching rows looks like success.

## Testing
- No AI-generated tests in this repo. Test scripts, if/when added, are written manually by the user in a separate pass — don't propose or generate test suites unless explicitly asked.

## Build order
Follow the milestone order in plan §8 — don't jump ahead to later milestones (e.g. import/export, danger zone) before earlier ones (auth, schema, core CRUD) are in place, unless explicitly asked to.
