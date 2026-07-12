# Peoplix

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

## Testing
Automated testing is out of scope for this repo (planned separately later).
