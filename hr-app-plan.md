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

No self-service account creation. Visitors can submit a sign-up *request* from
`/signup` (name/email/dept/designation/mobile), but this only writes to a
`signup_requests` table - `auth.users`/`profiles` are untouched until an Admin
approves it from a **Pending Sign Up Requests** panel at the top of the
**Employees** page (Admin-only — not HR, unlike most Admin/HR-gated screens
here), at which point the account is created via the Supabase Admin API
exactly as with Admin-created employees (see §5). Approve/Reject show a live
"Approving…"/"Rejecting…" state while the request is in flight, and the
Dashboard gets an Admin-only orange-gradient stat tile for the pending count.

---

## 2. Modules (v1 Scope)
1. **Auth** — login, protected routes, role-based access control
2. **Employee directory/profiles** — CRUD (Admin/HR) from the Employees page. Every role, including
   Employee, can also self-edit their own Full name, Phone, Department, and Designation from
   **Settings** (via `updateOwnProfile`, RLS-restricted to each user's own row). Email is set once
   at account creation and is never editable afterward by anyone, including Admin/HR editing another
   employee's row. A small hardcoded allowlist (`lib/protected-employees.ts`) marks accounts that
   can never be deleted, even by Admin — checked server-side in the delete route, not just hidden
   in the UI.
3. **Leave management** — apply, approve/reject, balance tracking
   - Leave types: Casual, Sick, Annual (standard BD types)
4. **Bangladesh holiday calendar** — seeded default holidays + Admin/HR can add/edit
5. **Attendance/check-in** — simple Check-in / Check-out button with timestamps. Any role can
   delete their own **today's** record (to re-check-in); no one, including Admin, can delete a
   past attendance record — enforced via RLS, not just the UI.
6. **Org chart/departments** — simple `department` field on employee profile (no hierarchy tree in v1)
7. **Overtime tracking** *(ad-hoc, post-v1)* — employees log overtime manually (date + hours,
   0.5h minimum in 0.5h steps); Admin-only approval (stricter than the usual Admin/HR gate)
8. **Team directory** *(ad-hoc, post-v1)* — read-only, searchable profile listing visible to
   every role (name, designation, department, email/phone); no editing. Requires one additional
   `profiles` SELECT policy so non-staff can read everyone's row (write access unaffected).
9. **Audit Log** *(ad-hoc, post-v1)* — who-did-what history for leave/overtime/attendance/employee/
   signup-request/profile/password/account actions. Every role sees their own entries; Admin only
   sees everyone's. 10-day retention (auto-deleted by a daily cron), to stay within Supabase's
   free-tier storage cap. See §10.

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

### `overtime_requests`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| employee_id | uuid | FK → profiles |
| date | date | must not be in the future |
| hours | numeric(4,1) | 0.5–12, in 0.5 steps |
| reason | text | nullable |
| status | enum | pending, approved, rejected |
| reviewed_by | uuid | nullable, FK → profiles |
| reviewed_at | timestamp | nullable |

One entry per employee per day (unique constraint). Unlike every other approval flow in this app,
only **Admin** may approve/reject — HR can view all entries but not act on them.

**Row Level Security (RLS):** enabled on all tables. Employees can only read/write their own rows; HR/Admin roles get broader policies for approvals, editing holidays, and managing employee records.

---

## 4. Folder Structure

> This diagram reflects the original v1 scaffold. Several modules shipped after it was written
> (Overtime, Team Directory, Sign-up Requests, Account deletion, Audit Log) aren't reflected below —
> see [README.md § Project structure](README.md#-project-structure) for the current, up-to-date tree.

```
/app
  /(auth)/login
  /(dashboard)
    /page.tsx                 → dashboard home (role-aware widgets)
    /employees                → directory + profile CRUD (HR/Admin)
    /leave                    → apply + my requests (all) / approvals (HR/Admin)
    /attendance                → check-in/out + history
    /holidays                  → calendar view + admin edit
    /settings                  → profile self-edit (name/phone/department/designation), change password, Danger Zone, Delete Account
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
- `proxy.ts` (`lib/supabase/middleware.ts`) checks session on every protected route, redirects to `/login` if absent
- Role read from `profiles.role`, used to:
  - Conditionally render nav items/pages in the UI
  - Gate API routes server-side (e.g. only HR/Admin can `PATCH /api/leave/[id]` to approve/reject)
- Admin creates employee accounts (**no public sign-up**) via a dedicated "Add Employee" screen using the Supabase Admin API
- **Invite / forgot-password flow** (`/reset-password`): when Admin/HR adds an employee, Supabase
  emails them a recovery link (`resetPasswordForEmail`) pointing at `/reset-password`, which reads
  the `access_token`/`refresh_token` out of the URL hash client-side, calls `setSession`, then lets
  them set a password via `updateUser`. The same page and mechanism power "Forgot password?" on
  the login page for existing users — it's self-service *credential recovery* for an account
  Admin/HR already created, not open registration, so it doesn't reopen the no-public-sign-up rule.
  - **Requires one Supabase dashboard step**: add your app's origin(s) to
    **Authentication → URL Configuration → Redirect URLs** (e.g. `http://localhost:3000/**` for
    dev, plus your Vercel URL once deployed) — Supabase refuses to redirect to a URL that isn't
    allow-listed there, and silently falls back to the project's Site URL instead (which can look
    like a broken/misdirected link if you're not expecting it).
  - **Email delivery**: this project sends transactional email (invite/password-setup) through a
    custom SMTP provider (Brevo) configured under **Authentication → Emails → SMTP Settings**,
    since Supabase's built-in email sending is rate-limited and not meant for production volume.
    The "Reset Password" template under **Authentication → Email Templates** is a Peoplix-branded
    HTML email (table-based layout, inline styles, teal gradient header/button matching the app's
    accent) rather than the plain default Supabase template.
  - **Self-service password change**: logged-in users can also change their password directly from
    **Settings** (`supabase.auth.updateUser({ password })`) without going through the email/recovery
    flow at all, since they already have an active session.
  - **Self-service account deletion**: every role (Employee, HR, Admin) can permanently delete their
    own account from **Settings** (`DELETE /api/account`) — a confirm-phrase dialog matching the
    Danger Zone pattern, showing a "Deleting Account..." state while in flight. The route deletes the
    Supabase Auth user via the Admin API, which cascades to `profiles` and all FK'd tables
    (`leave_requests`, `leave_balances`, `attendance`, `overtime_requests`), then signs out and
    redirects to `/login`. The same protected-employees allowlist (`lib/protected-employees.ts`) used
    to stop Admin from deleting certain accounts also blocks those accounts from deleting themselves.

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
- `POST /api/admin/clear-database` — System Admin only, wipes tables (see §9)
- `POST /api/admin/clear-audit-logs` — Admin only, wipes audit log history (see §9, §10)
- `POST /api/auth/forgot-password` — public, checks an email against real accounts before sending a reset link
- `POST /api/settings/password-changed` — audit-log-only hook after a client-side password change (see §10)
- `GET /api/cron/audit-log-cleanup` — internal, Vercel Cron only (`CRON_SECRET`), daily retention cleanup (see §10)
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
9. Danger Zone — Clear Database (System Admin only)
10. Polish — responsive pass, glass-effect pass, empty/loading states
11. Push to GitHub → GitHub Actions CI → Vercel deploy
12. Audit Log — who-did-what history, 10-day retention (see §10)

---

## 9. Danger Zone — Clear Database (System Admin only)
A **Settings → Danger Zone** section with a "Clear Database" button.

- **Visibility:** built as an Admin-only feature, but tightened further in the actual implementation
  to a single, hardcoded **System Admin** account (`isSystemAdmin()` in `lib/protected-employees.ts`,
  keyed off one specific email) — not every `role = admin` account. For every other role *and* every
  other Admin account, the section isn't rendered in the DOM at all (fully hidden, not disabled +
  tooltip — the original plan's "disabled is preferred over hiding" call was revisited once the gate
  narrowed past just role, since a visible-but-permanently-disabled control for other Admins would
  have implied they could get access, which isn't true).
- **Server-side enforcement:** the corresponding `POST /api/admin/clear-database` route independently
  re-checks `role === 'admin'` from the session, **then** additionally re-checks `isSystemAdmin()` —
  the hidden UI is a UX nicety, not the actual security boundary.
- **Confirmation flow:** clicking opens a confirm dialog requiring the admin to type a confirmation phrase (`DELETE ALL DATA`) before the action fires, to prevent accidental clicks.
- **Scope:** truncates `leave_requests`, `leave_balances`, `holidays`, `attendance`, and `overtime_requests`. `profiles` and Supabase Auth users are never touched — no accounts are affected.
- **Purpose:** since this is a personal/demo project on Supabase's free 500MB tier, this gives an easy way to reset all seeded/test data without needing to touch the Supabase dashboard directly.
- **Separately**, any Admin (not just the System Admin) can clear all **Audit Log** history from the
  same Settings page — a lighter-weight action since it's only clearing history, not operational
  data, so it doesn't need the same narrow gate or the confirm-phrase step (a plain Yes/Cancel dialog
  is enough). See §10.

---

## 10. Audit Log
A `/audit-log` page, positioned right before Settings in the nav, visible to every role.

- **What's logged:** leave apply/self-edit/cancel/approve/reject, overtime log/self-edit/cancel/
  approve/reject, attendance check-in/checkout/override/delete, employee create/update/delete,
  signup-request approve/reject, profile self-edit, password change, and self-account deletion.
  Each entry records the actor's name/email (snapshotted at write time, so it still reads correctly
  even after the profile is later edited or the account deleted), a timestamp, an `action`
  (`create`/`update`/`delete`/`cancel`/`approve`/`reject`), an `entity`, and a short plain-language
  comment (e.g. "Applied for casual leave (Jul 20 → Jul 22)", "Approved Jane Doe's overtime (3h)").
- **Visibility:** RLS (`audit_logs_select_own_or_admin`) restricts Employee/HR to their own entries
  (`actor_id = auth.uid()`); only Admin sees every employee's. This mirrors the Danger Zone's "Admin
  isn't a monolith" theme, but the gate here is the ordinary `role = 'admin'` check, not the narrower
  System Admin one — clearing history isn't as sensitive as wiping operational data.
- **Filtering:** an Admin-only real-time search box (name/email/comment) plus a from/to date-range
  filter available to every role, both entirely client-side over the already-fetched rows (the 10-day
  retention window keeps that dataset small enough that a server round-trip per keystroke isn't
  needed). The date inputs are mutually clamped (`min`/`max`) so an invalid range can't be picked.
- **Retention:** kept for **10 days**, shown as a banner on the page itself so every role understands
  why older history disappears. Enforced two ways: every read query is clamped to the last 10 days
  regardless of role, and a daily Vercel Cron job (`vercel.json` → `/api/cron/audit-log-cleanup`,
  gated by a `CRON_SECRET` bearer token Vercel sends automatically) hard-deletes anything older —
  same free-tier-storage motivation as Danger Zone.
- **Writes:** always via the service-role client (`lib/audit.ts`'s `logAudit()`), regardless of which
  client performed the underlying mutation — `audit_logs` has no insert policy for user sessions at
  all. A logging failure never breaks the action it's describing (fire-and-forget with a console
  error, not a thrown exception).
- **Cleanup:** any Admin (not just System Admin) can wipe all audit log history from Settings — see §9.

---

## 11. Import / Export (CSV & XLSX)
Applies to the main data-driven features: **Employees**, **Leave requests**, **Leave balances**, and **Holidays**.

- **Export:** each of these list views gets an "Export" button offering both **CSV** and **XLSX** output of the currently filtered/visible data (e.g. export just "pending leave requests" or a date-ranged holiday list).
- **Import:** each of these views also gets an "Import" button accepting **CSV or XLSX**, with:
  - A downloadable template file matching the expected columns
  - Client-side preview of parsed rows before committing
  - Validation (required fields, date formats, valid enum values like `leave_type`/`role`) with per-row error reporting instead of an all-or-nothing failure
  - Import restricted to **Admin/HR roles**; Employees do not get import/export controls
  - Leave balances is **export-only** — there's no dedicated balances management table to import into, so a "Leave balances" export button lives on the Leave page instead of getting its own view
  - Imported leave requests always land as `pending`, regardless of any status column in the sheet — they still have to go through the normal approve/reject flow so the balance-usage increment only ever happens in one place
- **Libraries (free, no external service):**
  - `papaparse` — CSV parsing/generation
  - `exceljs` — Excel (.xlsx) read/write. The plan originally suggested `xlsx` (SheetJS), but its npm release has unpatched high-severity CVEs (prototype pollution, ReDoS) with no fix available — swapped to `exceljs`, which has no known critical vulnerabilities
  - Both run entirely client-side (parsing happens in the browser before anything is sent to an API route); no paid service required, fits free-tier hosting

---

## 12. Local Development & Containerization (Docker)
Vercel builds and deploys directly from the Git repo (`next build`) — it does **not** deploy from a Docker image. Docker is used here purely for **local development consistency**, not production deployment.

- **`Dockerfile`** — multi-stage Node build for running the Next.js app locally in a container, so dependencies/behavior are identical regardless of host machine/OS
- **`docker-compose.yml`** — spins up the app container alongside local Supabase services (Postgres, Auth, Studio), which the **Supabase CLI** (`supabase start`) already runs via Docker under the hood — no custom Dockerfile needed for that part, just the CLI + Docker Desktop installed
- **Documented as optional** in the README — clearly labeled "for local development only" so it's never confused with the actual Vercel deploy path
- **Portfolio value** — demonstrates containerization practice consistent with your existing Dockerized Playwright CI/CD project, without adding deployment complexity

---

## 13. AI-Assisted Development Conventions (`CLAUDE.md` + Skills)
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

## 14. Hosting & Cost Notes
- **Vercel Hobby plan:** free, deploys directly from GitHub via Actions
- **Supabase Free plan:** free forever, no credit card, includes Postgres + Auth + REST API
  - Limits: 500MB database, 50,000 MAU, 1GB file storage — generous for this use case
  - Free projects auto-pause after 7 days of inactivity — mitigate with occasional logins or a scheduled GitHub Action ping if needed

---

## 15. Explicitly Out of Scope (v1)
- Automated testing (planned in a separate repo later)
- Public self-registration
- Full org-chart hierarchy / manager tree UI
- GPS/photo-based attendance verification
- Custom/admin-configurable leave types
