# Peoplix

[![CI](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml/badge.svg)](https://github.com/jhrahman/peoplix/actions/workflows/ci.yml)

Peoplix — People management, simplified.

A simple, role-based HR management web app (employee directory, leave management, Bangladesh holiday calendar, attendance check-in/out) built on free-tier services.

Full project plan: [hr-app-plan.md](hr-app-plan.md).

## Stack
- Next.js (App Router) + TypeScript
- Next.js API Routes (backend, same repo)
- Supabase (Postgres + Auth)
- Tailwind CSS + shadcn/ui
- Vercel + GitHub Actions

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL/keys.

## Local development with Docker (optional)

For local dev only — Vercel deploys directly from the Git repo, not from a Docker image.

```bash
docker compose up
```

This runs the Next.js app in a container. To also run Supabase locally (Postgres/Auth/Studio), install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase start
```

## Roles
- **Admin** — full access, manages employees, approves leave, edits holidays
- **HR** — manages employees, approves leave, edits holidays
- **Employee** — views own profile, applies for leave, checks in/out, views holidays

No public sign-up — Admin creates employee accounts.

## Deployment

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

## Testing
Automated testing is out of scope for this repo (planned separately later).
