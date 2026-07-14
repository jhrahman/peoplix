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

Peoplix — People management, simplified.

A role-based HR management web app: team directory, leave management, overtime tracking, Bangladesh holiday calendar, and attendance check-in/out — built end-to-end on free-tier services, with a modern glassmorphism UI: an airy teal "light glass" theme and a vibrant emerald-teal "dark ash glass" theme (never dimmed, never violet).

Full project plan: [hr-app-plan.md](hr-app-plan.md).

---

## ✨ Features

- **Authentication** — Supabase Auth session-cookie login, forgot-password / invite flow (`/reset-password`), no open account creation — accounts are provisioned by Admin/HR, or self-requested via `/signup` and gated behind Admin approval (see **Access requests** below).
- **Access requests** — anyone can submit a self-service request from `/signup` (name/email/department/designation/mobile) with an animated success confirmation; it only lands in a `signup_requests` table — no account exists until an Admin reviews it from the Employees page. Approve/Reject buttons show a live "Approving…"/"Rejecting…" state, and a dedicated orange-gradient dashboard stat tile surfaces the pending count to Admins. Approving creates the account exactly like an Admin-added employee and sends the same branded password-setup email.
- **Role-based access (RBAC)** — `admin`, `hr`, `employee`, enforced by Postgres Row-Level Security *and* re-checked server-side in every API route (never trusted from the client alone).
- **Dashboard** — at-a-glance stat tiles and charts for hours worked, overtime, leave balance, upcoming holidays, and account role, plus Admin/HR-only approval-queue counters (leave, overtime, and — Admin only — pending access requests).
- **Employee management** — Admin/HR can add, edit, and remove employees; assign roles; department/designation fields. Adding an employee sends the same branded invite email as an approved access request. A small hardcoded allowlist of protected accounts can never be removed, even by Admin, re-checked server-side.
- **Team directory** — read-only, searchable (name/department/designation/email) profile listing visible to **every** role — unlike the Employees page, any employee can look up a colleague's contact details. One-click copy-to-clipboard on each email address, and an instant clear (✕) button on the search box.
- **Leave management** — apply for Casual/Sick/Annual leave, live day-count preview, Admin/HR approval queue, automatic balance deduction on approval, per-employee balance view, and self-service edit/cancel while a request is still pending (fix a typo without waiting on HR).
- **Overtime tracking** — log overtime manually (date + hours in 0.5h steps, one entry per day), Admin-only approval (HR can view but not approve), self-service edit/cancel while still pending, a per-employee summary (pending/approved/rejected) and matching dashboard widgets.
- **Holiday calendar** — shared company holiday list, recurring-holiday support, and a one-click "generate default Bangladesh public holidays for this year" recovery action available to any signed-in user.
- **Attendance** — one-click check-in/out with all times shown in Bangladesh Standard Time (12-hour AM/PM, regardless of the viewer's own device timezone), real-time in-flight/success feedback on the check-in/out buttons, automatic duration calculation, and a self-service manual override/correction (e.g. fix an accidental early checkout) — no approval step required. Any role can delete their own **today's** record to re-check-in; past records can't be deleted by anyone, including Admin. History is filterable by date range (persisted in the URL, so it survives a refresh).
- **Import / Export** — CSV and XLSX for Employees, Leave requests, and Holidays, with a downloadable template, row-by-row validation preview, and per-row import status.
- **Settings** — every role can self-edit their own Full name, Phone, Department, and Designation (Email is never editable), plus change their own password directly — no need to go through the forgot-password email flow just to update a password.
- **Danger Zone** — Admin-only, type-to-confirm wipe of all leave/holiday/attendance/overtime data; employee accounts are never touched.
- **Polish** — page-transition loading states, spinner feedback on in-flight approve/reject actions, a proper pointer cursor on every button, responsive/mobile layout, empty states everywhere, `data-testid` attributes on every interactive element for automated testing.
- **Brand assets** — code-generated favicon, apple-touch icon, and Open Graph image (teal gradient mark, no external design tool).

## 🧱 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript, React 19 |
| Backend | Next.js API Routes — no separate server |
| Database & Auth | Supabase (Postgres + Auth), free tier, Row-Level Security on every table |
| Styling | Tailwind CSS v4 + shadcn/ui, glassmorphism design system, `next-themes` light/dark |
| Import/Export | `papaparse` (CSV) + `exceljs` (XLSX) |
| Hosting | Vercel (native GitHub integration — auto-deploy on push to `main`) |
| CI | GitHub Actions (lint + build check on every push/PR) |

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
    settings/                  Profile self-edit (name/phone/department/designation), change password, Danger Zone
  api/                      REST endpoints, one resource per folder
    employees/, leave/, holidays/, attendance/, overtime/, admin/clear-database/, signup-requests/
    (directory/ and settings/ have no API route — see api-endpoints/API-ENDPOINTS.md §8-9)
components/
  ui/            shadcn primitives (Button, Card, Dialog, Table, ...)
  layout/        Sidebar, Navbar, ThemeToggle, page loader
  {feature}/     Feature-specific components (employees/, directory/, leave/, overtime/, holidays/, attendance/, settings/, import-export/, dashboard/)
lib/
  supabase/      client.ts (browser), server.ts (server components/routes), admin.ts (service-role, server-only), middleware.ts
  auth/          requireRole() — server-side RBAC gate for API routes
  actions/       Next.js Server Actions
  *.ts           leave.ts, attendance.ts, overtime.ts, bd-holidays.ts, import-export.ts — shared domain logic
supabase/
  migrations/    Numbered SQL migrations (schema, RLS policies, seed data, backfills)
test-cases/      Manual QA test cases per page (Action / Test Data / Expected Result)
api-endpoints/   API reference for manual/API-client testing
```

## 🚀 Getting started

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL/keys.

### Local development with Docker (optional)

For local dev only — Vercel deploys directly from the Git repo, not from a Docker image.

```bash
docker compose up
```

This runs the Next.js app in a container. To also run Supabase locally (Postgres/Auth/Studio), install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase start
```

## 👥 Roles

- **Admin** — full access, manages employees, approves leave, edits holidays, Danger Zone
- **HR** — manages employees, approves leave, edits holidays
- **Employee** — views own profile, applies for leave, checks in/out, views holidays

No open account creation — Admin/HR creates employee accounts directly, or anyone can submit a
self-service request at `/signup` for an Admin to approve. Either path triggers the same branded
invite email to set a password.

## ☁️ Deployment

Every push runs [CI](.github/workflows/ci.yml) (lint + build) via GitHub Actions. Deployment itself
is handled by Vercel's native GitHub integration — connect this repo once in the Vercel dashboard
and it auto-builds/deploys on every push to `main`, no extra workflow needed.

In the Vercel project's **Settings → Environment Variables**, set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

(same values as your local `.env.local`). Then add the deployed URL to Supabase's
**Authentication → URL Configuration → Redirect URLs** (e.g. `https://your-app.vercel.app/**`) so
the invite/forgot-password flow (`/reset-password`) works in production too — Supabase silently
falls back to the project's Site URL if the exact `redirect_to` isn't allow-listed, which otherwise
looks like the reset link is just broken.

**Email delivery**: Supabase's built-in email sending is rate-limited and not meant for production
volume, so this project sends transactional email (invite/password-setup, access-request approval)
through a custom SMTP provider (Brevo) configured under **Authentication → Emails → SMTP Settings**,
with a Peoplix-branded HTML template under **Authentication → Email Templates → Reset Password**.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security. Keep it a **server-only** env var —
> never prefix it with `NEXT_PUBLIC_`, never import `lib/supabase/admin.ts` from a Client Component.

## 🧪 Testing

No automated test suite ships in this repo by default (see `CLAUDE.md`) — test scripts, if added,
are written in a separate pass. Two references document what test coverage this project calls for,
and both are structured so they can be turned directly into an automated suite (e.g. Playwright):

- **[`test-cases/`](test-cases/)** — page-by-page test cases against the live app
  (**Action / Test Data / Expected Result** format), one `.md` file per page:
  - [`01-login-authentication.md`](test-cases/01-login-authentication.md) — login, validation, RBAC redirects, forgot password
  - [`02-dashboard.md`](test-cases/02-dashboard.md) — widgets, charts, empty states, responsiveness
  - [`03-employees.md`](test-cases/03-employees.md) — access control, add/edit/delete, import/export
  - [`04-leave.md`](test-cases/04-leave.md) — apply, balances, approvals, import/export
  - [`05-holidays.md`](test-cases/05-holidays.md) — CRUD, default BD holiday seeding, import/export
  - [`06-attendance.md`](test-cases/06-attendance.md) — check-in/out, manual overrides, team view, Bangladesh time format
  - [`07-settings-danger-zone.md`](test-cases/07-settings-danger-zone.md) — profile edit, Danger Zone RBAC + confirmation flow
  - [`08-overtime.md`](test-cases/08-overtime.md) — logging, validation, Admin-only approvals, dashboard widgets
  - [`09-directory.md`](test-cases/09-directory.md) — all-roles visibility, read-only listing, search
  - [`10-signup-requests.md`](test-cases/10-signup-requests.md) — public request form, duplicate handling, Admin-only approve/reject, resulting invite email

  Every interactive element in the UI carries a `data-testid` attribute matching these test cases,
  so each row maps cleanly onto a Playwright step (locator → action → assertion).

- **[`api-endpoints/API-ENDPOINTS.md`](api-endpoints/API-ENDPOINTS.md)** — full REST reference for
  every `/api/*` route (method, auth/role required, request body, response shape, error codes),
  plus a note on the one page (`/directory`) that has no API route of its own. Use it for
  real-time API testing with a tool like Postman/Insomnia, `curl`, or Playwright's `request`
  fixture: log in first and reuse the Supabase session cookie, then exercise each endpoint
  directly — e.g. `POST /api/leave` to file a request, `PATCH /api/leave/{id}` to approve/reject
  it, `POST /api/overtime` + `PATCH /api/overtime/{id}` to cover the Admin-only overtime approval
  rule, or `POST /api/attendance` / `PATCH /api/attendance/{id}` to cover check-in/out and manual
  corrections at the API layer, independent of the UI.
