# Peoplix — Project Plan

## Overview
**Peoplix** is a simple, role-based HR management web app covering core people-management functions, built entirely on free-tier services.

- **Frontend:** Next.js (App Router) + TypeScript
- **Backend:** Next.js API Routes (Node.js) — single repo, no separate backend server
- **Database + Auth:** Supabase (Postgres, free tier, no credit card required)
- **Styling:** Tailwind CSS + shadcn/ui, with glassmorphism + light/dark theme
- **Hosting:** Vercel (free tier)
- **CI/CD:** GitHub Actions → Vercel, triggered on push to GitHub
- **API:** REST endpoints via Next.js API routes (Supabase also auto-generates REST over tables)

Automated testing is explicitly out of scope for this repo — planned separately later.

---

## Naming Conventions
- **App name:** Peoplix
- **Suggested repo name:** `peoplix` or `peoplix-hr`
- **Vercel deployment URL:** `peoplix.vercel.app` (or similar, subject to availability)
- **Page title / branding:** "Peoplix" in the navbar/sidebar, with a tagline such as *"Peoplix — People management, simplified"*
- Note: `peoplix.com` is currently parked/for sale, and a prior HR-tool company used the name — not a blocker for this personal project, but worth a fresh domain/trademark check if this is ever made public-facing later.

---

## 1. Roles
- **Admin** — full access, manages employees, approves leave, edits holidays
- **HR** — manages employees, approves leave, edits holidays
- **Employee** — views own profile, applies for leave, checks in/out, views holidays

No public sign-up. Admin creates employee accounts via Supabase Admin API.

---

## 2. Modules (v1 Scope)
1. **Auth** — login, protected routes, role-based access control
2. **Employee directory/profiles** — CRUD (Admin/HR), read-only self-view (Employee)
3. **Leave management** — apply, approve/reject, balance tracking
   - Leave types: Casual, Sick, Annual (standard BD types)
4. **Bangladesh holiday calendar** — seeded default holidays + Admin/HR can add/edit
5. **Attendance/check-in** — simple Check-in / Check-out button with timestamps
6. **Org chart/departments** — simple `department` field on employee profile (no hierarchy tree in v1)

---

## 3. Database Schema (Supabase / Postgres)

### `profiles` (extends `auth.users`)
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users |
| full_name | text | |
| email | text | |
| phone | text | |
| department | text | |
| designation | text | |
| role | enum | admin, hr, employee |
| joined_date | date | |
| avatar_url | text | nullable |
| manager_id | uuid | nullable, self-FK (reserved for future use) |

### `leave_requests`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| employee_id | uuid | FK → profiles |
| leave_type | enum | casual, sick, annual |
| start_date | date | |
| end_date | date | |
| reason | text | |
| status | enum | pending, approved, rejected |
| reviewed_by | uuid | nullable, FK → profiles |
| reviewed_at | timestamp | nullable |

### `leave_balances`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| employee_id | uuid | FK → profiles |
| year | int | |
| casual_total / casual_used | int | |
| sick_total / sick_used | int | |
| annual_total / annual_used | int | |

### `holidays`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| date | date | |
| is_recurring | boolean | |
| created_by | uuid | FK → profiles |

### `attendance`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| employee_id | uuid | FK → profiles |
| date | date | |
| check_in | timestamp | nullable |
| check_out | timestamp | nullable |

**Row Level Security (RLS):** enabled on all tables. Employees can only read/write their own rows; HR/Admin roles get broader policies for approvals, editing holidays, and managing employee records.

---

## 4. Folder Structure

```
/app
  /(auth)/login
  /(dashboard)
    /page.tsx                 → dashboard home (role-aware widgets)
    /employees                → directory + profile CRUD (HR/Admin)
    /leave                    → apply + my requests (all) / approvals (HR/Admin)
    /attendance                → check-in/out + history
    /holidays                  → calendar view + admin edit
    /settings                  → profile edit
  /api
    /leave/route.ts, /leave/[id]/route.ts
    /attendance/route.ts
    /holidays/route.ts
    /employees/route.ts, /employees/[id]/route.ts
/components
  /ui (shadcn components)
  /layout (Sidebar, Navbar, ThemeToggle)
  /leave, /attendance, /holidays, /employees (feature components)
/lib
  /supabase (client.ts, server.ts, middleware.ts)
  /types.ts
/middleware.ts   → route protection + role gating
Dockerfile          → local dev container (Node multi-stage build)
docker-compose.yml  → app + local Supabase services (dev only)
CLAUDE.md           → project conventions for AI-assisted development
.claude/skills/     → optional, reusable multi-step patterns (e.g. migrations, import/export)
```

---

## 5. Auth & Role Flow
- Supabase Auth (email/password) for login
- `middleware.ts` checks session on every protected route, redirects to `/login` if absent
- Role read from `profiles.role`, used to:
  - Conditionally render nav items/pages in the UI
  - Gate API routes server-side (e.g. only HR/Admin can `PATCH /api/leave/[id]` to approve/reject)
- Admin creates employee accounts (no public sign-up) via a dedicated "Add Employee" screen using the Supabase Admin API

---

## 6. Design System
- **Base components:** Tailwind CSS + shadcn/ui
- **Typography:** Plus Jakarta Sans for body/UI text (soft, rounded, modern), Outfit for headings
  (`font-heading`) — a geometric, slightly more eye-catching pairing than a default system sans.
- **Glassmorphism, two flavors:**
  - **Light glass:** soft, airy — translucent white surfaces (`bg-card` ~60% opacity) over a
    faint multi-stop radial-gradient background, subtle teal-tinted shadows.
  - **Dark "ash glass":** charcoal/graphite base (never pure black), translucent zinc-toned
    surfaces (`bg-card` ~40-50% opacity), soft teal-glow accents rather than harsh contrast.
  - Both share one accent color — a teal/green seeded from `#0d8a82`
    (`oklch(0.57 0.10 188)` light / `oklch(0.72 0.13 188)` dark) — for primary actions, focus
    rings, active nav state, and badges, so light/dark read as the same product rather than two
    reskins.
- **Interactive elements:** buttons/cards/nav items get hover/active affordances (lift, glow,
  brightness, or press-down translate) — nothing should look static under a pointer. Prefer
  Tailwind transitions over adding an animation library; keep motion subtle (150-200ms).
- **Theme:** `next-themes` for light/dark toggle, CSS variables for palette
- **Responsiveness:** Tailwind breakpoints throughout; sidebar collapses to a bottom nav / drawer on mobile

---

## 7. REST API
Every route under `/app/api/*/route.ts` exposes standard REST verbs (GET / POST / PATCH / DELETE), so the API is usable outside the UI as well. Supabase also auto-generates REST endpoints over the Postgres tables if direct access is ever needed.

Additional routes:
- `POST /api/admin/clear-database` — Admin-only, wipes tables (see §9)
- `GET /api/{employees|leave|holidays}/export` — returns CSV or XLSX based on a `?format=` query param
- `POST /api/{employees|leave|holidays}/import` — accepts uploaded CSV/XLSX, validates, and upserts rows

---

## 8. Build Order (Milestones)
0. Repo setup — `CLAUDE.md`, `Dockerfile` + `docker-compose.yml` (local dev), initial README
1. Supabase project setup — schema + RLS policies
2. Next.js scaffold — Tailwind/shadcn + theme toggle (light/dark + glass)
3. Auth — login page, middleware, protected layout
4. Employee directory — Admin/HR CRUD, Employee read-only self-view
5. Leave management — apply, balances, approve/reject
6. Holiday calendar — seed defaults + admin edit
7. Attendance — check-in/out
8. Import/export (CSV & XLSX) across Employees, Leave, Holidays
9. Danger Zone — Clear Database (Admin only)
10. Polish — responsive pass, glass-effect pass, empty/loading states
11. Push to GitHub → GitHub Actions CI → Vercel deploy

---

## 9. Danger Zone — Clear Database (Admin only)
A **Settings → Danger Zone** section with a "Clear Database" button.

- **Visibility:** rendered only for `role = admin`. For HR/Employee accounts the button is either hidden or rendered **disabled** (disabled + tooltip "Admin only" is preferred over hiding, so the UI stays consistent across roles).
- **Server-side enforcement:** the corresponding `POST /api/admin/clear-database` route independently re-checks `role === 'admin'` from the session before doing anything — the disabled button is a UX nicety, not the actual security boundary.
- **Confirmation flow:** clicking opens a confirm dialog requiring the admin to type a confirmation phrase (e.g. `DELETE ALL DATA`) before the action fires, to prevent accidental clicks.
- **Scope:** truncates `leave_requests`, `leave_balances`, `holidays`, `attendance`, and optionally `profiles` (excluding the currently logged-in admin, or excluded entirely — worth deciding at build time). Auth users in `auth.users` are left untouched unless explicitly included.
- **Purpose:** since this is a personal/demo project on Supabase's free 500MB tier, this gives an easy way to reset all seeded/test data without needing to touch the Supabase dashboard directly.

---

## 10. Import / Export (CSV & XLSX)
Applies to the main data-driven features: **Employees**, **Leave requests**, **Leave balances**, and **Holidays**.

- **Export:** each of these list views gets an "Export" button offering both **CSV** and **XLSX** output of the currently filtered/visible data (e.g. export just "pending leave requests" or a date-ranged holiday list).
- **Import:** each of these views also gets an "Import" button accepting **CSV or XLSX**, with:
  - A downloadable template file matching the expected columns
  - Client-side preview of parsed rows before committing
  - Validation (required fields, date formats, valid enum values like `leave_type`/`role`) with per-row error reporting instead of an all-or-nothing failure
  - Import restricted to **Admin/HR roles**; Employees do not get import/export controls
- **Suggested libraries (free, no external service):**
  - `papaparse` — CSV parsing/generation
  - `xlsx` (SheetJS) — Excel (.xlsx) read/write
  - Both run client-side or in an API route; no paid service required, fits free-tier hosting

---

## 11. Local Development & Containerization (Docker)
Vercel builds and deploys directly from the Git repo (`next build`) — it does **not** deploy from a Docker image. Docker is used here purely for **local development consistency**, not production deployment.

- **`Dockerfile`** — multi-stage Node build for running the Next.js app locally in a container, so dependencies/behavior are identical regardless of host machine/OS
- **`docker-compose.yml`** — spins up the app container alongside local Supabase services (Postgres, Auth, Studio), which the **Supabase CLI** (`supabase start`) already runs via Docker under the hood — no custom Dockerfile needed for that part, just the CLI + Docker Desktop installed
- **Documented as optional** in the README — clearly labeled "for local development only" so it's never confused with the actual Vercel deploy path
- **Portfolio value** — demonstrates containerization practice consistent with your existing Dockerized Playwright CI/CD project, without adding deployment complexity

---

## 12. AI-Assisted Development Conventions (`CLAUDE.md` + Skills)
Since parts of this build will likely use Claude Code, a couple of lightweight conventions keep AI-assisted work consistent across sessions:

- **`CLAUDE.md`** at the repo root — persistent project context loaded automatically by Claude Code, covering:
  - Stack choices and folder conventions (per this plan)
  - House style: keep things simple, avoid overclaiming/over-engineering
  - Hard rules: RLS required on all Supabase tables; Admin-only routes (e.g. Clear Database) must re-check role server-side, never trust the client; free-tier constraints (Supabase 500MB/7-day pause) to keep in mind
  - Preference for manually-written test scripts later, not AI-generated (consistent with your other projects)
- **`.claude/skills/` folder** (optional, add as needed) — useful if the same multi-step pattern gets repeated across features, e.g.:
  - A "supabase-migration" skill documenting how schema changes are written/applied
  - A "csv-xlsx-import" skill capturing the validation/error-reporting pattern, so it's applied consistently across Employees, Leave, and Holidays imports

Both are low-cost additions that pay off most on a project like this, where several features (RLS-gated CRUD, import/export) share the same structural pattern and benefit from consistent handling.

---

## 13. Hosting & Cost Notes
- **Vercel Hobby plan:** free, deploys directly from GitHub via Actions
- **Supabase Free plan:** free forever, no credit card, includes Postgres + Auth + REST API
  - Limits: 500MB database, 50,000 MAU, 1GB file storage — generous for this use case
  - Free projects auto-pause after 7 days of inactivity — mitigate with occasional logins or a scheduled GitHub Action ping if needed

---

## 14. Explicitly Out of Scope (v1)
- Automated testing (planned in a separate repo later)
- Public self-registration
- Full org-chart hierarchy / manager tree UI
- GPS/photo-based attendance verification
- Custom/admin-configurable leave types
