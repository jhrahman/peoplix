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

A role-based HR management web app: employee directory, leave management, Bangladesh holiday calendar, and attendance check-in/out — built end-to-end on free-tier services, with a modern glassmorphism UI and a teal accent theme in both light and dark mode.

Full project plan: [hr-app-plan.md](hr-app-plan.md).

---

## ✨ Features

- **Authentication** — Supabase Auth session-cookie login, forgot-password / invite flow (`/reset-password`), no public sign-up (accounts are provisioned by Admin/HR).
- **Role-based access (RBAC)** — `admin`, `hr`, `employee`, enforced by Postgres Row-Level Security *and* re-checked server-side in every API route (never trusted from the client alone).
- **Dashboard** — at-a-glance stat tiles and charts for leave balance, weekly attendance, upcoming holidays, and account role.
- **Employee directory** — Admin/HR can add, edit, and remove employees; assign roles; department/designation fields.
- **Leave management** — apply for Casual/Sick/Annual leave, live day-count preview, Admin/HR approval queue, automatic balance deduction on approval, per-employee balance view.
- **Holiday calendar** — shared company holiday list, recurring-holiday support, and a one-click "generate default Bangladesh public holidays for this year" recovery action available to any signed-in user.
- **Attendance** — one-click check-in/out, automatic duration calculation, and a self-service manual override/correction (e.g. fix an accidental early checkout) — no approval step required.
- **Import / Export** — CSV and XLSX for Employees, Leave requests, and Holidays, with a downloadable template, row-by-row validation preview, and per-row import status.
- **Danger Zone** — Admin-only, type-to-confirm wipe of all leave/holiday/attendance data; employee accounts are never touched.
- **Polish** — page-transition loading states, responsive/mobile layout, empty states everywhere, `data-testid` attributes on every interactive element for automated testing.
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
  (auth)/reset-password/   Invite / password-reset landing page
  (dashboard)/             Authenticated app shell (sidebar, navbar, theme toggle)
    page.tsx                 Dashboard widgets
    employees/                Employee directory (Admin/HR)
    leave/                     Apply, approvals, balances
    holidays/                  Holiday calendar
    attendance/                Check-in/out, history, overrides
    settings/                  Profile + Danger Zone
  api/                      REST endpoints, one resource per folder
    employees/, leave/, holidays/, attendance/, admin/clear-database/
components/
  ui/            shadcn primitives (Button, Card, Dialog, Table, ...)
  layout/        Sidebar, Navbar, ThemeToggle, page loader
  {feature}/     Feature-specific components (employees/, leave/, holidays/, attendance/, settings/, import-export/, dashboard/)
lib/
  supabase/      client.ts (browser), server.ts (server components/routes), admin.ts (service-role, server-only), middleware.ts
  auth/          requireRole() — server-side RBAC gate for API routes
  actions/       Next.js Server Actions
  *.ts           leave.ts, attendance.ts, bd-holidays.ts, import-export.ts — shared domain logic
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

No public sign-up — Admin/HR creates employee accounts, which triggers an invite email to set a password.

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
the invite/forgot-password flow (`/reset-password`) works in production too.

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
  - [`06-attendance.md`](test-cases/06-attendance.md) — check-in/out, manual overrides, team view
  - [`07-settings-danger-zone.md`](test-cases/07-settings-danger-zone.md) — profile edit, Danger Zone RBAC + confirmation flow

  Every interactive element in the UI carries a `data-testid` attribute matching these test cases,
  so each row maps cleanly onto a Playwright step (locator → action → assertion).

- **[`api-endpoints/API-ENDPOINTS.md`](api-endpoints/API-ENDPOINTS.md)** — full REST reference for
  every `/api/*` route (method, auth/role required, request body, response shape, error codes).
  Use it for real-time API testing with a tool like Postman/Insomnia, `curl`, or Playwright's
  `request` fixture: log in first and reuse the Supabase session cookie, then exercise each endpoint
  directly — e.g. `POST /api/leave` to file a request, `PATCH /api/leave/{id}` to approve/reject it,
  or `POST /api/attendance` / `PATCH /api/attendance/{id}` to cover check-in/out and manual
  corrections at the API layer, independent of the UI.
