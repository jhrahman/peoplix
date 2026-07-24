# Peoplix

**🔗 Live app: [https://peoplix-hr.vercel.app/](https://peoplix-hr.vercel.app/)**

[![CI](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml/badge.svg)](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://peoplix-hr.vercel.app/)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/license-private-lightgrey)

Peoplix is people management, simplified.

It's a role-based HR app that handles the everyday stuff: a team directory, leave requests, overtime logging, a Bangladesh holiday calendar, and attendance check-in/out. All of it sits inside a glassmorphism UI with two teal themes that were actually designed rather than defaulted to — an airy "light glass" look and a moodier "dark ash glass" one that stays vibrant instead of just looking dimmed.

Curious about the reasoning behind a decision? The [full project plan](hr-app-plan.md) has it.

---

## ✨ What's inside

- **Authentication.** Supabase Auth handles the session cookie. There's a forgot-password flow through `/reset-password`, and no open sign-up — accounts get created by Admin/HR, or someone can request access from `/signup` and wait for an Admin to approve it. "Forgot password?" checks the email against real accounts in real time: a registered address gets a reset link and a friendly "sent!" message, while an unregistered one is told plainly that no account exists yet. This is an internal tool, so we didn't need to hide behind the usual "if an account exists…" wording public products use.
- **Access requests.** Anyone can submit a request from `/signup` with their name, email, department, designation, and mobile number, and get a nice animated confirmation for their trouble. Nothing happens on the backend until an Admin reviews it from the Employees page. Approve and Reject buttons show a live "Approving…" / "Rejecting…" state while they work, and Admins get an orange stat tile on the dashboard showing how many requests are waiting — click it and you're taken straight to the queue. Approving a request creates the account just like an Admin adding someone directly, and sends the same branded invite email.
- **Role-based access.** Three roles: `admin`, `hr`, `employee`. Enforced by Postgres Row-Level Security *and* re-checked on the server in every API route, because a role check that only lives in the client isn't a security boundary, it's a suggestion.
- **Dashboard.** Stat tiles and charts for hours worked, overtime, leave balance, and upcoming holidays, plus an account role summary. Admin and HR also see approval-queue counters for leave and overtime, and Admins get one more for pending access requests.
- **Employee management.** Admin and HR can add, edit, and remove employees, assign roles, and fill in department/designation. Adding someone sends the same invite email as an approved access request. A small hardcoded list keeps a few protected accounts from ever being deleted, even by an Admin, and that rule is checked server-side too. A live search box sits above the table for filtering by name, email, department, or designation.
- **Team directory.** Read-only and searchable by name, department, designation, or email, and visible to every role. Unlike the Employees page, any employee can look up a colleague's contact details here, complete with their profile photo (or initials, if they haven't uploaded one). One click copies an email address to the clipboard, and there's an instant clear button on the search box. Anyone with an *approved* leave request covering today also gets a small 🌴 next to their name, so you can tell at a glance who's out.
- **Leave management.** Apply for Casual, Sick, or Annual leave with a live day-count preview as you pick dates. Admin and HR review requests in an approval queue, and approving one deducts the days from that employee's balance automatically. If a request would exceed what's left, the app tells you before you even hit submit ("No Casual leave left for 2026," or "Only 3 days left, this needs 5") and the same check runs again on the server, so it can't be exceeded even by mistake or by editing a request after the fact. Balances can't go negative, full stop — it's enforced at the database level too. Employees can also fix a typo or cancel a request while it's still pending, no need to wait on HR for that.
- **Overtime tracking.** Log overtime manually with a date and hours (in half-hour steps), one entry per day. Only Admin approves these (HR can view but not act), and employees can edit or cancel a pending entry themselves. There's a per-employee summary and matching dashboard widgets too.
- **Holiday calendar.** A shared list of company holidays, support for recurring ones, and a one-click "generate default Bangladesh public holidays for this year" button that anyone signed in can use if the list ever needs restoring.
- **Attendance.** One-click check-in and check-out, with every timestamp shown in Bangladesh time regardless of the device you're using. The buttons give real-time feedback while the request is in flight, duration is calculated automatically, and there's a self-service override if you need to fix an accidental early checkout — no approval needed for that. Anyone can delete their own record for *today* to re-check-in, but past records are locked for everyone, including Admin. History is filterable by date range, and that filter survives a page refresh.
- **Import / Export.** CSV and XLSX for Employees, Leave requests, and Holidays, with a downloadable template, a preview before you commit to an import, and row-by-row status so you know exactly what happened.
- **Audit Log.** A `/audit-log` page that quietly keeps track of who did what: leave and overtime actions, attendance edits, employee changes, signup approvals, profile edits, password changes, account deletions, and a first-time "joined" entry when someone sets their password for the first time. Profile edits are logged field by field, so saving just a department change says exactly that instead of a vague "updated profile," and nothing gets logged if you save without actually changing anything. Everyone sees their own history; only Admin sees everyone's, with a real-time search box and a simple date filter. Entries stick around for 10 days and then get cleaned up automatically by a daily cron job, so the log stays fast and doesn't quietly eat into Supabase's free storage tier.
- **Settings.** Everyone can edit their own name, phone, department, and designation (email stays fixed once set), upload a profile photo with an interactive crop step, and change their password directly without going through the email reset flow.
- **Danger Zone.** Locked down to one specific System Admin account, not just anyone with the Admin role. A type-to-confirm dialog wipes all leave, holiday, attendance, and overtime data (employee accounts are never touched), and it's hidden entirely from the UI for everyone else. The wipe genuinely clears everything now, including other employees' attendance history, since a couple of tables have narrower delete rules by design that this action deliberately bypasses. Right after a wipe, leave balances are re-seeded fresh for every employee too, so nothing looks stale or half-empty. Separately, any Admin can clear just the Audit Log history from Settings, since that's lower stakes.
- **Delete Account.** Every role can permanently delete their own account from Settings, behind a type-to-confirm dialog. It removes the Supabase Auth user (which cascades to their profile and records) and signs them out.
- **Performance.** Optional Upstash Redis caching keeps the app snappy as more people use it at once — profile lookups and the holiday list get cached for a short window instead of hitting Postgres on every navigation, and the busiest write endpoints (check-in, leave, overtime) are rate-limited so a burst of activity doesn't overwhelm the free-tier database. None of this is required to run the app; without Redis configured, everything just falls back to querying Supabase directly like before.
- **Little touches.** Page transitions, spinners on in-flight actions, a proper pointer cursor on every clickable thing, and empty states wherever there'd otherwise be nothing to look at. Every interactive element carries a `data-testid` for automated testing. The mobile navbar stays sticky and fully opaque so it never gets tinted by whatever's scrolling underneath it.
- **Brand assets.** A code-generated favicon, apple-touch icon, and Open Graph image, all in the app's own teal gradient. No external design tool involved.

## 🧱 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript, React 19 |
| Backend | Next.js API Routes, no separate server |
| Database, Auth & Storage | Supabase (Postgres + Auth + Storage), Row-Level Security on every table |
| Caching & rate limiting | Upstash Redis (optional, free tier) |
| Styling | Tailwind CSS v4 + shadcn/ui, glassmorphism design system, `next-themes` light/dark |
| Import/Export | `papaparse` (CSV) + `exceljs` (XLSX) |
| Hosting | Vercel (native GitHub integration, auto-deploy on push to `main`) |
| CI | GitHub Actions (lint + build check on every push/PR) |
| Scheduled jobs | Vercel Cron (`vercel.json`), daily Audit Log retention cleanup |

## 📁 Project structure

```
app/
  (auth)/login/            Login page + forgot-password dialog
  (auth)/signup/            Public self-service access request form
  (auth)/reset-password/   Invite / password-reset landing page
  (dashboard)/             Authenticated app shell (sidebar, navbar, theme toggle)
    page.tsx                 Dashboard widgets
    employees/                Employee management (Admin/HR) + pending access requests panel (Admin)
    directory/                 Read-only team directory (all roles)
    leave/                     Apply, approvals, balances
    overtime/                  Log, summary, Admin-only approvals
    holidays/                  Holiday calendar
    attendance/                Check-in/out, history, overrides
    audit-log/                 Who-did-what history (all roles, Admin-only cross-employee search)
    settings/                  Profile self-edit (name/phone/department/designation) + photo upload, change password, Danger Zone (System Admin only), Audit Log Cleanup (Admin), Delete Account
  api/                      REST endpoints, one resource per folder
    employees/, leave/, holidays/, attendance/, overtime/, admin/clear-database/, admin/clear-audit-logs/,
    signup-requests/, account/, auth/forgot-password/, settings/password-changed/, cron/audit-log-cleanup/
    (directory/ and audit-log/ have no dedicated API route — they query Supabase directly from the
    Server Component; settings/ only backs Delete Account via account/ — see api-endpoints/API-ENDPOINTS.md)
components/
  ui/            shadcn primitives (Button, Card, Dialog, Table, ...)
  layout/        Sidebar, Navbar, ThemeToggle, page loader
  {feature}/     Feature-specific components (employees/, directory/, leave/, overtime/, holidays/, attendance/, audit-log/, settings/, import-export/, dashboard/)
lib/
  supabase/      client.ts (browser), server.ts (server components/routes), admin.ts (service-role, server-only), middleware.ts
  cache/         redis.ts (Upstash wrapper), ratelimit.ts (sliding-window rate limiter)
  auth/          requireRole() — server-side RBAC gate for API routes
  actions/       Next.js Server Actions
  *.ts           leave.ts, attendance.ts, overtime.ts, bd-holidays.ts, import-export.ts, datetime.ts (shared Dhaka-time helpers), audit.ts (audit log writer + retention constant) — shared domain logic
supabase/
  migrations/    Numbered SQL migrations (schema, RLS policies, storage buckets, seed data, backfills)
test-cases/      Manual QA test cases per page (Action / Test Data / Expected Result)
api-endpoints/   API reference for manual/API-client testing
vercel.json      Vercel Cron config (Audit Log retention cleanup)
```

## 🚀 Getting started

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and keys. Upstash Redis is optional — leave those two variables blank and the app runs exactly the same, just without the caching layer.

### Local development with Docker (optional)

Vercel deploys straight from the Git repo, not from a Docker image, so this is purely a local convenience.

```bash
docker compose up
```

That runs the Next.js app in a container. If you'd also like Supabase running locally (Postgres, Auth, Studio), install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase start
```

## 👥 Roles

- **Admin** — full access: manages employees, approves leave, edits holidays, Danger Zone
- **HR** — manages employees, approves leave, edits holidays
- **Employee** — views their own profile, applies for leave, checks in/out, views holidays

There's no open sign-up. Admin or HR creates employee accounts directly, or someone can request access at `/signup` and wait for an Admin to approve it. Either way, they get the same branded invite email to set a password.

## ☁️ Deployment

Every push runs [CI](.github/workflows/ci.yml) (lint + build) through GitHub Actions. Deployment itself is handled by Vercel's native GitHub integration: connect the repo once in the Vercel dashboard and it builds and deploys automatically on every push to `main`.

In the Vercel project's **Settings → Environment Variables**, set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` — any random string. Vercel automatically sends it as a bearer token when it invokes the Audit Log retention cron (`vercel.json` → `/api/cron/audit-log-cleanup`), and the route checks it. Without this set, the cleanup route just stays unreachable (401) rather than breaking anything.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — optional. Add these (from a free [Upstash](https://upstash.com/) Redis database) to enable caching and rate limiting. Leave them out and the app behaves exactly the same, just without that extra layer of speed.

(Same values as your local `.env.local`, plus `CRON_SECRET`.) Then add the deployed URL to Supabase's **Authentication → URL Configuration → Redirect URLs** (something like `https://your-app.vercel.app/**`) so the invite and forgot-password flow (`/reset-password`) works in production too. Supabase quietly falls back to the project's Site URL if the exact `redirect_to` isn't allow-listed there, which just looks like a broken reset link if you're not expecting it.

**Email delivery.** Supabase's built-in email sending is rate-limited and not meant for production volume, so this project sends its transactional email (invites, password setup, access-request approvals) through a custom SMTP provider (Brevo), configured under **Authentication → Emails → SMTP Settings**, with a Peoplix-branded HTML template under **Authentication → Email Templates → Reset Password**.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security. Keep it a **server-only** env var. Never prefix it with `NEXT_PUBLIC_`, and never import `lib/supabase/admin.ts` from a Client Component.

## 🧪 Testing

There's no automated test suite in this repo by default (see `CLAUDE.md`) — if test scripts ever get added, that happens in a separate pass, written by hand. In the meantime, two references describe what test coverage this project actually calls for, written so they can be turned directly into an automated suite later (Playwright, for instance):

- **[`test-cases/`](test-cases/)** — page-by-page test cases against the live app, in an **Action / Test Data / Expected Result** format, one `.md` file per page:
  - [`01-login-authentication.md`](test-cases/01-login-authentication.md) — login, validation, RBAC redirects, forgot password
  - [`02-dashboard.md`](test-cases/02-dashboard.md) — widgets, charts, empty states, responsiveness
  - [`03-employees.md`](test-cases/03-employees.md) — access control, add/edit/delete, import/export
  - [`04-leave.md`](test-cases/04-leave.md) — apply, balances, approvals, import/export
  - [`05-holidays.md`](test-cases/05-holidays.md) — CRUD, default BD holiday seeding, import/export
  - [`06-attendance.md`](test-cases/06-attendance.md) — check-in/out, manual overrides, team view, Bangladesh time format
  - [`07-settings-danger-zone.md`](test-cases/07-settings-danger-zone.md) — profile edit, profile photo upload/crop/delete, Danger Zone RBAC + confirmation flow, Delete Account confirmation + cascade cleanup
  - [`08-overtime.md`](test-cases/08-overtime.md) — logging, validation, Admin-only approvals, dashboard widgets
  - [`09-directory.md`](test-cases/09-directory.md) — all-roles visibility, read-only listing, search, on-leave-today indicator
  - [`10-signup-requests.md`](test-cases/10-signup-requests.md) — public request form, duplicate handling, Admin-only approve/reject, resulting invite email, dashboard-tile highlight flash on arrival
  - [`11-audit-log.md`](test-cases/11-audit-log.md) — per-role visibility, Admin-only cross-employee search, date filter, retention notice, Admin-only "delete all logs" cleanup

  Every interactive element in the UI carries a `data-testid` attribute matching these test cases, so each row maps cleanly onto a Playwright step: locator, action, assertion.

- **[`api-endpoints/API-ENDPOINTS.md`](api-endpoints/API-ENDPOINTS.md)** — a full REST reference for every `/api/*` route (method, required auth/role, request body, response shape, error codes), plus a note on the two pages (`/directory`, `/audit-log`) that query Supabase directly and have no dedicated API route of their own. Use it for real-time API testing with Postman, Insomnia, `curl`, or Playwright's `request` fixture: log in first, reuse the session cookie, and exercise each endpoint directly. `POST /api/leave` to file a request, `PATCH /api/leave/{id}` to approve or reject it, the same pair for overtime to cover the Admin-only approval rule, or `POST`/`PATCH /api/attendance` for check-in/out and manual corrections, all independent of the UI.
