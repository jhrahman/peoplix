# Peoplix

**A role-based HR management web app: attendance, leave, overtime, a team directory, and an employee engagement hub, built end to end on a free-tier stack.**

**Live app: [peoplix-hr.vercel.app](https://peoplix-hr.vercel.app/)**

[![CI](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml/badge.svg)](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://peoplix-hr.vercel.app/)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Sign-up is invitation only, as it would be for a real internal tool. To look around the live app, request access from `/signup` and an Admin will review it.

## Table of contents

- [Highlights](#highlights)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Roles and permissions](#roles-and-permissions)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Deployment](#deployment)
- [Testing and quality](#testing-and-quality)
- [Documentation](#documentation)

## Highlights

What this project is meant to show, beyond "it has the usual HR pages":

- **Security is enforced in the database, not the UI.** Row-Level Security is on every table, and every Admin-only API route re-checks the role from the session on the server. A disabled button is never treated as a security boundary.
- **Business rules live in more than one layer.** Leave balances can never go negative or over their cap: the API checks first, and `CHECK` constraints in Postgres catch anything that slips past. Attendance history is immutable by RLS policy, even for Admin.
- **Designed for a free tier.** Optional Redis caching and rate limiting that fall back to plain queries when absent, a daily cron that prunes old audit logs and notifications, direct-to-Storage uploads that avoid serverless body limits, and cleanup of uploaded files whenever their posts are removed.
- **A real engagement feature, not just CRUD.** Posts, kudos, polls, Discord-style emoji reactions, photo and video attachments with validation, `@` tagging, and targeted notifications, all described below.
- **Documented and testable.** A full project plan, an API reference for every route, page-by-page manual test cases, a k6 load-test script, and CI on every push.
- **A considered UI.** A custom glassmorphism design system with two themes (light glass and dark ash glass), responsive from phone to desktop.

## Features

### People and access

- **Authentication.** Supabase Auth with a session cookie, plus bearer-token support so API clients can use the same endpoints. Forgot-password checks the address against real accounts and tells the user plainly whether one exists, which suits an internal tool.
- **Access requests.** Anyone can request an account at `/signup`. An Admin approves or rejects from the Employees page, and approving creates the account and sends a branded invite email. Admins see a dashboard tile counting pending requests.
- **Employee management.** Admin and HR add, edit, and remove employees, assign roles, and set department and designation. A small server-checked allowlist protects a few accounts from deletion. Includes live search and CSV/XLSX import and export.
- **Team directory.** A read-only, searchable listing visible to every role, with profile photos, one-click email copy, and a small marker for anyone on approved leave today.
- **Settings.** Edit your own profile, upload a profile photo with an interactive crop step, change your password, or delete your own account behind a type-to-confirm dialog.

### Time and leave

- **Leave management.** Apply for Casual, Sick, or Annual leave with a live day-count preview. Admin and HR approve from a queue, and approval deducts the balance. Requests that exceed the remaining balance are rejected before submit and again on the server. Employees can edit or cancel their own pending requests.
- **Overtime tracking.** Log overtime in half-hour steps, one entry per day. Only Admin approves (HR can view but not act). Includes per-employee summaries and dashboard widgets.
- **Attendance.** One-click check-in and check-out with every timestamp shown in Bangladesh time. Duration is calculated automatically, there is a self-service fix for accidental early checkouts, and history is filterable by date range.
- **Holiday calendar.** Shared company holidays with recurring support and one-click generation of default Bangladesh public holidays.
- **Dashboard.** Stat tiles and charts for hours worked, overtime, leave balance, and upcoming holidays, plus approval-queue counters for Admin and HR.

### Employee engagement

- **Feed and announcements.** Anyone can post, comment, and react. Admin and HR publish announcements and can pin up to three. Announcements appear in their own column (a tab on mobile).
- **Kudos and polls.** Recognize a colleague against a company value, or run a poll with two to five options where votes can be changed.
- **Emoji reactions.** A searchable, Discord-style picker with a curated set of about 80 workplace emojis (including modern people and gestures, with skin tones), on posts, comments and celebration cards alike. It scrolls smoothly even inside a card, jumps between groups, and hides any emoji a device is too old to draw. Several different reactions per person are allowed, and hovering a reaction shows who used it.
- **Photo and video attachments.** Up to four photos (3 MB each) or one video (20 MB) per post. Files upload straight from the browser to Supabase Storage, and the size and type limits are enforced by the storage buckets themselves as well as by clear validation messages in the UI.
- **Rich comments.** Every comment box, on posts and on celebration cards, takes one small attachment: a photo (up to 1 MB), a short clip (up to 5 MB), or a GIF found through built-in search (powered by GIPHY). Photos and clips are validated with clear messages and stored with the size limits enforced by Storage itself; GIFs are only links, accepted only from GIPHY's own servers.
- **Tagging and notifications.** Type `@` and part of a first or last name to tag someone. Only the people involved are notified: the tagged person, a kudos recipient, the author of a post or comment that someone comments or reacts on, or someone who has been wished a happy birthday or work anniversary. A navbar bell shows an unread badge, a toast appears when something arrives, and the Notifications page has All and Unread tabs, grouped alerts (for example "Jane and 3 others reacted to your post"), and per-row mark read/unread and remove. Clicking a notification opens just that post.
- **Profile previews.** Hovering a tagged colleague shows their photo, name, designation, email (with a one-click copy button), and a vacation marker if they are on leave today. It also works by tap and by keyboard, and never includes a date of birth.
- **Birthdays and work anniversaries.** Employees can add their date of birth in Settings. It is kept in a private table that only its owner can read, never in the Team Directory, and teammates see only the day and month, and only if the person leaves sharing on. Every celebration has its own card: birthdays, every work anniversary (3, 5, 10 and every 5th year are marked as milestones), and new joiners. Colleagues can sign a shared card with a quick or custom message, and the person is notified. The card is a small conversation of its own: people can react to it and comment on it, tagging anyone, for a few days after the occasion. Employees set their own joining date in Settings (with a note to confirm it with HR), and milestones are counted from it.
- **Keeping a busy feed manageable.** Search, a Mentions filter, kind filters (posts, kudos, polls), "New since your last visit" markers, and compact media previews with a full-size viewer on click. A celebrations card surfaces birthdays, work anniversaries, and new joiners.
- **Moderation.** You can always delete your own posts and comments. Only Admin can delete someone else's, and deleting a post also deletes its uploaded files.

### Administration and compliance

- **Audit log.** Records who did what: leave and overtime actions, attendance edits, employee changes, signup approvals, profile edits (field by field), password changes, and every action on the Engagement page (posts, comments, reactions, votes, wishes, and deletes) with a readable message such as "Reacted 👍 to Jane Doe's post". Everyone sees their own history, only Admin sees everyone's, and entries are pruned after 10 days by a daily cron.
- **Danger Zone.** A type-to-confirm wipe of leave, holiday, attendance, overtime, and engagement data (including uploaded files), restricted to a single System Admin account and hidden from everyone else. It uses the service-role client on purpose, because some tables have narrower delete rules by design.

### Platform

- **Performance.** Optional Upstash Redis caches profile lookups and rate-limits the busiest write endpoints. Without Redis configured, everything falls back to querying Supabase directly.
- **Polish.** Page transitions, in-flight spinners, empty states, a sticky mobile navbar, a code-generated favicon and Open Graph image, and a `data-testid` on every interactive element.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Backend | Next.js API Routes, no separate server |
| Database, Auth, Storage | Supabase (Postgres, Auth, Storage) with Row-Level Security on every table |
| Caching and rate limiting | Upstash Redis (optional, free tier) |
| Styling | Tailwind CSS v4, shadcn/ui, a custom glassmorphism design system, `next-themes` for light and dark |
| Import and export | `papaparse` (CSV), `exceljs` (XLSX) |
| Hosting | Vercel, deploying automatically on push to `main` |
| CI | GitHub Actions (lint and build on every push and pull request) |
| Scheduled jobs | Vercel Cron, daily cleanup of old audit logs and notifications |

## Roles and permissions

| Role | Can do |
|---|---|
| **Admin** | Everything: manage employees, approve leave and overtime, edit holidays, publish and moderate engagement content, view the full audit log |
| **HR** | Manage employees, approve leave, edit holidays, publish and pin announcements |
| **Employee** | View their own profile, apply for leave, log overtime, check in and out, view holidays, and take part in the engagement feed |

Accounts are created by Admin or HR directly, or approved from an access request. Either way the person receives the same branded invite email to set a password.

## Project structure

```text
peoplix/
├── app/
│   ├── (auth)/                       Public pages
│   │   ├── login/                      Sign in and forgot-password dialog
│   │   ├── signup/                     Request access
│   │   └── reset-password/             Invite and password-reset landing page
│   ├── (dashboard)/                  Authenticated shell (sidebar, navbar, theme toggle)
│   │   ├── page.tsx                    Dashboard
│   │   ├── employees/                  Employee management and access requests
│   │   ├── directory/                  Read-only team directory
│   │   ├── leave/                      Apply, approvals, balances
│   │   ├── overtime/                   Log, summary, Admin approvals
│   │   ├── attendance/                 Check-in/out, history, corrections
│   │   ├── holidays/                   Holiday calendar
│   │   ├── engagement/                 Feed and announcements, plus posts/[id] single-post view
│   │   ├── notifications/              Notifications page
│   │   ├── audit-log/                  Who-did-what history
│   │   └── settings/                   Profile, photo, password, Danger Zone, delete account
│   └── api/                          REST endpoints, one folder per resource
│       ├── employees/  leave/  holidays/  attendance/  overtime/
│       ├── posts/                      Posts, comments, reactions, votes
│       ├── notifications/              List, unread count, mark read, remove
│       ├── signup-requests/  account/  auth/  settings/
│       ├── admin/                      clear-database, clear-audit-logs
│       └── cron/                       Daily retention cleanup
├── components/
│   ├── ui/                           shadcn/ui primitives
│   ├── layout/                       Sidebar, navbar, theme toggle, page loader
│   └── <feature>/                    attendance, audit-log, auth, dashboard, directory,
│                                       employees, engagement, holidays, import-export,
│                                       leave, notifications, overtime, settings
├── lib/
│   ├── supabase/                     Browser, server, service-role, and middleware clients
│   ├── auth/                         Session helpers and the server-side requireRole() gate
│   ├── cache/                        Redis wrapper and rate limiter (both optional)
│   ├── actions/                      Server Actions
│   └── *.ts                          Domain logic: leave, attendance, overtime, engagement,
│                                       mentions, notifications, audit, import-export, datetime
├── supabase/migrations/            Numbered SQL: schema, RLS, storage buckets, seed data
├── api-endpoints/                  Full REST API reference
├── test-cases/                     Manual QA cases, one file per page
├── load-tests/                     k6 load-test script
├── public/                         Static assets
├── hr-app-plan.md                  Project plan and design rationale
├── CLAUDE.md                       Project conventions and hard rules
├── vercel.json                     Cron schedule
└── Dockerfile, docker-compose.yml  Optional local container setup
```

## Getting started

**Prerequisites:** Node.js 20 or newer and a free [Supabase](https://supabase.com/) project.

```bash
git clone https://github.com/jhrahman/peoplix.git
cd peoplix
npm install
cp .env.local.example .env.local
```

1. **Fill in `.env.local`** with your Supabase project URL, anon key, and service-role key (Supabase dashboard, Project Settings, API). The two Upstash Redis variables are optional: leave them blank and the app works the same, just without caching.
2. **Create the database.** In the Supabase SQL Editor, run the files in [`supabase/migrations/`](supabase/migrations/) in numeric order, `0001` through the latest. They create the tables, Row-Level Security policies, storage buckets, and seed data.
3. **Start the app.**

   ```bash
   npm run dev
   ```

   It runs on [http://localhost:4000](http://localhost:4000).

> `.env.local` is git-ignored. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security, so keep it server-only: never prefix it with `NEXT_PUBLIC_`, and never import `lib/supabase/admin.ts` from a Client Component.

### Optional: run with Docker

Vercel deploys straight from the Git repo, so this is only a local convenience.

```bash
docker compose up
```

To also run Supabase locally (Postgres, Auth, Studio), install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase start`.

## Deployment

Every push runs [CI](.github/workflows/ci.yml) (lint and build) on GitHub Actions. Deployment is handled by Vercel's GitHub integration: connect the repo once and it builds and deploys on every push to `main`.

In the Vercel project's **Settings, Environment Variables**, set:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From your Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, never expose to the browser |
| `CRON_SECRET` | Any random string. Vercel sends it as a bearer token to the daily cleanup cron, and the route rejects requests without it |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional. Enables caching and rate limiting |
| `GIPHY_API_KEY` | Optional. Enables GIF search in comments. Create a free key at [developers.giphy.com](https://developers.giphy.com); the free key allows about 100 calls an hour, so results are cached for an hour. Without it the GIF button explains that search isn't set up |

Then:

- Add the deployed URL (for example `https://your-app.vercel.app/**`) to Supabase **Authentication, URL Configuration, Redirect URLs** so invite and password-reset links work in production. If the URL is not allow-listed, Supabase quietly falls back to the project's Site URL, which looks like a broken reset link.
- Apply every migration in `supabase/migrations/` to the production database too, not just your local one.
- **Email.** Supabase's built-in email is rate-limited and not meant for production, so transactional email (invites, password setup, access approvals) goes through a custom SMTP provider (Brevo) under **Authentication, Emails, SMTP Settings**, with a branded template under **Email Templates**.

## Testing and quality

There is no automated test suite in this repo by design (see `CLAUDE.md`). Instead, the project ships with detailed references written so they can be turned straight into a Playwright suite later. Every interactive element in the UI carries a `data-testid` that matches them.

- **[`test-cases/`](test-cases/)**: page-by-page cases in an Action / Test Data / Expected Result format:
  [login](test-cases/01-login-authentication.md), [dashboard](test-cases/02-dashboard.md), [employees](test-cases/03-employees.md), [leave](test-cases/04-leave.md), [holidays](test-cases/05-holidays.md), [attendance](test-cases/06-attendance.md), [settings and Danger Zone](test-cases/07-settings-danger-zone.md), [overtime](test-cases/08-overtime.md), [directory](test-cases/09-directory.md), [signup requests](test-cases/10-signup-requests.md), [audit log](test-cases/11-audit-log.md), [employee engagement](test-cases/12-engagement.md), and [notifications](test-cases/13-notifications.md).
- **[`api-endpoints/API-ENDPOINTS.md`](api-endpoints/API-ENDPOINTS.md)**: a reference for every `/api/*` route with method, required role, request body, response shape, and error codes. Use it with Postman, `curl`, or Playwright's `request` fixture: sign in with `POST /api/auth/login`, then send the returned token as `Authorization: Bearer <token>`.
- **[`load-tests/`](load-tests/)**: a k6 script that exercises the main pages with GET requests only, so it is safe to run repeatedly. It was written with roughly 100 to 120 concurrent users in mind.
- **CI**: lint and a production build on every push and pull request.

## Documentation

- [Project plan](hr-app-plan.md): scope, schema, design system, milestones, and the reasoning behind decisions
- [API reference](api-endpoints/API-ENDPOINTS.md): every endpoint
- [Conventions](CLAUDE.md): stack rules and the hard rules (RLS everywhere, server-side role checks, balance invariants)

## License

Released under the [MIT License](LICENSE).
