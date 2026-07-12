# Peoplix — Project Conventions

Peoplix is a role-based HR management web app. Full plan: [hr-app-plan.md](hr-app-plan.md).

## Stack
- Next.js (App Router) + TypeScript
- Next.js API Routes as the backend (no separate server)
- Supabase (Postgres + Auth), free tier
- Tailwind CSS + shadcn/ui, glassmorphism + light/dark theme (`next-themes`)
- Vercel hosting, GitHub Actions CI/CD

## Design system
- Typography: Plus Jakarta Sans (body/UI), Outfit (`font-heading`, headings only). Don't reach for a third font.
- Two glass flavors sharing one teal/green accent (seeded from `#0d8a82`): airy translucent-white "light glass"
  and charcoal-based "dark ash glass" (never pure black). Full rationale in plan §6 — read it before touching
  `globals.css` or `Card`. The accent lives entirely in CSS variables (`--primary`, `--ring`, etc.) — reference
  those tokens (`text-primary`, `bg-primary`, `ring-ring`), never a hardcoded Tailwind color like `bg-indigo-600`.
- `Card` is glass by default (translucent `bg-card` + `backdrop-blur`) — don't re-add manual `glass-panel` classes
  to `<Card>` usages; `glass-panel` is only for non-Card containers (`<aside>`, `<header>`, raw wrapper divs).
- Interactive elements (buttons, nav items, clickable cards) need a hover/active affordance - lift, glow, or
  brightness change, 150-200ms Tailwind transition. No new animation library for this.

## Folder conventions
- `/app/(auth)`, `/app/(dashboard)/...` — route groups per plan §4
- `/app/api/*/route.ts` — REST endpoints, one resource per folder
- `/components/ui` — shadcn primitives; `/components/layout` — Sidebar/Navbar/ThemeToggle; `/components/{feature}` — feature-specific
- `/lib/supabase` — `client.ts` (browser), `server.ts` (server components/route handlers), `middleware.ts`
- `/lib/types.ts` — shared types (mirror DB schema in plan §3)

## House style
- Keep things simple, avoid overclaiming or over-engineering. No speculative abstractions.
- Prefer small, direct route handlers over generic middleware layers unless a pattern repeats 3+ times.
- No automated tests in this repo (see below) — don't scaffold test frameworks unprompted.

## Hard rules
- **RLS is required on every Supabase table.** No table ships without a row-level security policy.
- **Admin-only routes must re-check `role === 'admin'` server-side** from the session — never trust a disabled button or client-side role check as the security boundary (see plan §9, Clear Database).
- **Free-tier constraints:** Supabase free projects cap at 500MB DB / auto-pause after 7 days of inactivity. Keep this in mind for seed data volume and any keep-alive tooling.
- Employees can only read/write their own rows unless role is `hr` or `admin`.

## Testing
- No AI-generated tests in this repo. Test scripts, if/when added, are written manually by the user in a separate pass — don't propose or generate test suites unless explicitly asked.

## Build order
Follow the milestone order in plan §8 — don't jump ahead to later milestones (e.g. import/export, danger zone) before earlier ones (auth, schema, core CRUD) are in place, unless explicitly asked to.
