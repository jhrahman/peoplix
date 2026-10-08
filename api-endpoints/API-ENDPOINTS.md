# Peoplix — API Endpoints Reference

Base URL (local): `http://localhost:3000`
Base URL (production): `https://peoplix-hr.vercel.app`

All endpoints are Next.js API Routes under `/api/*`. None of them accept an API key in headers.

## 🔑 Login API — quick start

> **URL (local):** `http://localhost:3000/api/auth/login`
> **URL (production):** `https://peoplix-hr.vercel.app/api/auth/login`
> **Method:** `POST`
> **Header:** `Content-Type: application/json`

**Sample request body:**
```json
{
  "email": "your.email@example.com",
  "password": "your-password"
}
```

**Sample response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "xkq2f...",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1785412345,
    "user": {
      "id": "6f1c...-uuid",
      "email": "your.email@example.com",
      "full_name": "Jane Doe",
      "role": "employee"
    }
  }
}
```

**What to do with it:** copy `data.access_token` from the response, then put it on every other
request as a header:
```
Authorization: Bearer eyJhbGciOi...
```
That works for every `/api/*` endpoint and every page in this app — no cookies needed.

**Sample curl, start to finish:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your.email@example.com","password":"your-password"}'
```

Full details on the rest of the auth endpoints (`/api/auth/me`, `/api/auth/refresh`,
`/api/auth/logout`) are in §12 below.

---

## Authenticating an API client

Call `POST /api/auth/login` (§12) with an email and password. It returns the tokens **in the JSON
body** and also sets the Supabase session cookie, so:

- **API clients / k6 / CI** — take `data.access_token` from the body and send
  `Authorization: Bearer <access_token>` on every subsequent request. No cookie handling, no
  reconstructing Supabase's cookie encoding.
- **Browsers / cookie-jar clients (curl `-c`/`-b`, Postman)** — do nothing; the cookie is already
  set and works exactly as it did before.

Both credentials are accepted **everywhere**: every `/api/*` route and every rendered page. The
bearer token is not a shortcut around any check — Supabase verifies the JWT server-side and the
same RLS policies and role gates apply either way. This is handled centrally in
`lib/supabase/server.ts`, so no route has (or needs) its own bearer handling.

```bash
# 1. log in, keep the token
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | jq -r .data.access_token)

# 2. use it on any endpoint
curl -s "$BASE_URL/api/auth/me"  -H "Authorization: Bearer $TOKEN"
curl -s "$BASE_URL/api/leave"    -H "Authorization: Bearer $TOKEN"
```

The web app's own login form is unaffected: it still signs in to Supabase directly from the browser
and never calls `/api/auth/login`. That route exists for scripted callers.

Do not put real passwords, service-role keys, or production secrets in this file or in any test collection — reference environment variables instead.

## Conventions used below

- **Auth**: `Session required` = any logged-in user — either credential (bearer token or session cookie) counts; `Admin/HR` or `Admin only` = role is re-checked server-side, not just hidden in the UI.
- **Success shape**: `{ "data": ... }`
- **Error shape**: `{ "error": "message" }`
- Common status codes: `401 Unauthorized` (no session), `403 Forbidden` (session okay, role not allowed), `400 Bad Request` (validation), `404 Not Found`, `500 Internal Server Error`.
- `UserRole` = `"admin" | "hr" | "employee"`
- `LeaveType` = `"casual" | "sick" | "annual"`
- `LeaveStatus` = `"pending" | "approved" | "rejected"`
- `OvertimeStatus` = `"pending" | "approved" | "rejected"`
- `SignupRequestStatus` = `"pending" | "approved" | "rejected"`
- `AuditAction` = `"create" | "update" | "delete" | "cancel" | "approve" | "reject" | "joined"`
- `AuditEntity` = `"leave_request" | "overtime_request" | "attendance" | "employee" | "signup_request" | "profile" | "password" | "account" | "post" | "comment" | "wish"`
- `ReactionType` = `"like" | "love" | "celebrate" | "laugh" | "clap"`

---

## 1. Employees — `/api/employees`

### GET `/api/employees`
- **Auth**: Admin/HR
- **Query params**: none
- **Success (200)**: `{ "data": Profile[] }` — all employee profiles, ordered by full name
- **Errors**: `401`, `403`, `500`

### POST `/api/employees`
- **Auth**: Admin/HR
- **Body (JSON)**:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+8801XXXXXXXXX",
    "department": "Engineering",
    "designation": "Software Engineer",
    "role": "employee"
  }
  ```
  - Required: `full_name`, `email`, `role`
  - `phone`, `department`, `designation` optional
- **Behavior**: Creates a Supabase Auth user (random password, email pre-confirmed), seeds a leave balance row for the current year, and sends a password-setup email (`resetPasswordForEmail` → `/reset-password`).
- **Success (201)**: `{ "data": { "id": "<new-user-uuid>" } }`
- **Errors**:
  - `400` — missing `full_name`/`email`/`role`, or email already registered
  - `401` / `403`
  - `500` — profile update after user creation failed

### GET `/api/employees/{id}`
- **Auth**: Admin/HR
- **Path param**: `id` — employee's profile UUID
- **Success (200)**: `{ "data": Profile }`
- **Errors**: `401`, `403`, `404` (not found)

### PATCH `/api/employees/{id}`
- **Auth**: Admin/HR
- **Path param**: `id` — employee's profile UUID
- **Body (JSON)** — all fields optional, only send what changes:
  ```json
  {
    "full_name": "Jane D. Doe",
    "phone": "+8801XXXXXXXXX",
    "department": "Engineering",
    "designation": "Senior Software Engineer",
    "role": "hr"
  }
  ```
- **Success (200)**: `{ "data": Profile }` (updated row)
- **Errors**: `400` (update rejected, e.g. bad value), `401`, `403`

### DELETE `/api/employees/{id}`
- **Auth**: Admin/HR
- **Path param**: `id` — employee's profile UUID
- **Behavior**: Deletes the Supabase Auth user (cascades to profile). Cannot delete your own account. A small set of protected accounts (see `lib/protected-employees.ts`) can never be deleted, even by Admin — the UI hides the delete button for them, and this is re-checked server-side regardless.
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**:
  - `400` — `id` equals the caller's own user id, or deletion failed
  - `401`, `403` — includes deleting a protected account

---

## 2. Leave — `/api/leave`

### GET `/api/leave`
- **Auth**: Session required
- **Query params**:
  - `scope=all` (optional) — Admin/HR only; returns every employee's requests. Omitted or any other value, or non-staff caller → returns only the caller's own requests (RLS-enforced regardless).
- **Success (200)**: `{ "data": LeaveRequest[] }` (each row includes `employee: { full_name }`), newest first
- **Errors**: `401`, `500`

### POST `/api/leave`
- **Auth**: Session required (Admin/HR gets an extra capability, see `employee_email`)
- **Body (JSON)**:
  ```json
  {
    "leave_type": "casual",
    "start_date": "2026-08-10",
    "end_date": "2026-08-14",
    "reason": "Family event",
    "employee_email": "someone.else@example.com"
  }
  ```
  - Required: `leave_type`, `start_date`, `end_date`
  - `reason` optional
  - `employee_email` optional — **Admin/HR only**; files the request on behalf of another employee (used by bulk import). Omit this field for a normal self-request.
- **Validation**: `end_date` must be on/after `start_date`; `employee_email` must match an existing profile; `leave_type` must be one of `casual`/`sick`/`annual`; the requested day count must not exceed the employee's remaining balance for that leave type/year (see `leave_balances` in §3 of the project plan — checked here even though the actual deduction only happens on approval, so a request that can never be approved is rejected upfront).
- **Success (201)**: `{ "data": LeaveRequest }`, `status: "pending"`
- **Errors**:
  - `400` — missing fields, invalid date range, invalid `leave_type`, unknown `employee_email`, or the requested days exceed the employee's remaining balance (message names the leave type, year, and days remaining, e.g. `"No Casual leave left for 2026."` or `"Only 3 day(s) of Casual leave left for 2026 — this request needs 5."`)
  - `401` — not logged in
  - `403` — non-staff caller passed `employee_email`
  - `429` — too many requests in a short window (rate-limited per employee; only active when Redis/Upstash is configured, see project plan §16)

### PATCH `/api/leave/{id}`
This route serves two different actions, disambiguated by the request body shape.

**A. Admin/HR review** — body contains `status`:
- **Auth**: Admin/HR
- **Path param**: `id` — leave request UUID
- **Body (JSON)**:
  ```json
  { "status": "approved" }
  ```
  - `status` must be `"approved"` or `"rejected"`
- **Behavior**: Only a `pending` request can be reviewed. On `"approved"`, first checks that the requested day count still fits within the employee's remaining balance for that leave type/year (creating the year's balance row first if missing) — if it doesn't, the approval is rejected and the request stays `pending`, nothing is written. Only once that check passes does it increment the matching `*_used` column and flip the request to `approved`. This is what stops a balance from ever going negative, backed up by a `CHECK` constraint on `leave_balances` itself (see project plan §3/§16).
- **Success (200)**: `{ "data": LeaveRequest }` (updated row, with `reviewed_by`/`reviewed_at` set)
- **Errors**:
  - `400` — invalid `status` value, request is not currently `pending`, or approving it would exceed the employee's remaining balance (message names the employee, leave type, days left, and days requested)
  - `401`, `403`
  - `404` — request not found

**B. Employee self-edit** — body has no `status` field (any other shape is treated as an edit):
- **Auth**: Session required — must be the request's own owner
- **Path param**: `id` — leave request UUID
- **Body (JSON)**:
  ```json
  { "leave_type": "sick", "start_date": "2026-08-10", "end_date": "2026-08-11", "reason": "Fixed typo in dates" }
  ```
  - Required: `leave_type`, `start_date`, `end_date`; `reason` optional
- **Behavior**: Lets an employee correct a request they submitted by mistake — **only while it is still `pending`**. Once Admin/HR has approved or rejected it, this is no longer available (matches the Cancel/Delete eligibility rule).
- **Success (200)**: `{ "data": LeaveRequest }` (updated row)
- **Errors**:
  - `400` — missing fields, invalid date range, or the request is no longer `pending`
  - `401` — not logged in
  - `403` — caller does not own this request
  - `404` — request not found

### DELETE `/api/leave/{id}`
- **Auth**: Session required (RLS restricts to the caller's own **pending** requests, or staff)
- **Path param**: `id` — leave request UUID
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**:
  - `401` — not logged in
  - `404` — not found, not yours, or no longer pending

---

## 3. Holidays — `/api/holidays`

### GET `/api/holidays`
- **Auth**: Session required (read access for every role)
- **Query params**: none
- **Success (200)**: `{ "data": Holiday[] }`, ordered by date ascending
- **Errors**: `401`, `500`

### POST `/api/holidays`
- **Auth**: Admin/HR
- **Body (JSON)**:
  ```json
  {
    "name": "Independence Day",
    "date": "2026-03-26",
    "is_recurring": true
  }
  ```
  - Required: `name`, `date`
  - `is_recurring` optional, defaults to `false`
- **Success (201)**: `{ "data": Holiday }`
- **Errors**: `400` (missing fields), `401`, `403`

### PATCH `/api/holidays/{id}`
- **Auth**: Admin/HR
- **Path param**: `id` — holiday UUID
- **Body (JSON)** — same shape as POST, all fields optional per PATCH semantics:
  ```json
  { "name": "Independence Day (updated)", "date": "2026-03-26", "is_recurring": true }
  ```
- **Success (200)**: `{ "data": Holiday }`
- **Errors**: `400`, `401`, `403`

### DELETE `/api/holidays/{id}`
- **Auth**: Admin/HR
- **Path param**: `id` — holiday UUID
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**: `400`, `401`, `403`

### POST `/api/holidays/seed-defaults`
- **Auth**: Session required — **any authenticated role**, not just Admin/HR (deliberate: a recovery action any user can trigger, e.g. after Clear Database)
- **Body (JSON, optional)**:
  ```json
  { "year": 2026 }
  ```
  - `year` optional, defaults to the current year if omitted or invalid
- **Behavior**: Inserts the standard set of Bangladesh public holidays for that year, skipping any `(name, date)` pair that already exists — safe to call repeatedly (idempotent).
- **Success (200)**: `{ "data": { "inserted": 5, "skipped": 2, "year": 2026 } }`
- **Errors**: `401`, `500` (failure reading existing holidays for the year)

---

## 4. Attendance — `/api/attendance`

### GET `/api/attendance`
- **Auth**: Session required
- **Query params**:
  - `scope=all` (optional) — Admin/HR only; returns every employee's attendance. Otherwise scoped to the caller.
  - `date=YYYY-MM-DD` (optional) — filter to a single date (used for "team today" views).
- **Success (200)**: `{ "data": Attendance[] }` (each row includes `employee: { full_name }`), newest date first
- **Errors**: `401`, `500`

### POST `/api/attendance`
- **Auth**: Session required
- **Body**: none
- **Behavior**: Idempotent check-in for **today** for the calling user. If a record for today already exists, returns it unchanged instead of creating a duplicate.
- **Success**: `200` (already checked in today) or `201` (new check-in) — `{ "data": Attendance }`
- **Errors**: `400` (insert failed), `401`, `429` (rate-limited; only active when Redis/Upstash is configured, see project plan §16)

### PATCH `/api/attendance/{id}`
- **Auth**: Session required (RLS restricts to the caller's own record, or staff)
- **Path param**: `id` — attendance record UUID
- **Two modes, based on body**:
  1. **Quick check-out** — send an **empty body** (`{}` or nothing):
     - Stamps `check_out` with the current server time.
     - Fails with `400` if not checked in yet, or already checked out.
  2. **Manual override/correction** — include `check_in` and/or `check_out` explicitly (used for fixing mistakes):
     ```json
     { "check_in": "2026-07-12T10:00:00.000Z", "check_out": "2026-07-12T18:00:00.000Z" }
     ```
     - Either field can be `null` to clear it.
     - Only the fields present in the body are changed; the other keeps its existing value.
     - Validated so `check_out` cannot be before `check_in`.
- **Success (200)**: `{ "data": Attendance }`
- **Errors**:
  - `400` — invalid state transition or `check_out` before `check_in`
  - `401`
  - `404` — record not found

### DELETE `/api/attendance/{id}`
- **Auth**: Session required — only the record owner, and only for **today's** record
- **Path param**: `id` — attendance record UUID
- **Behavior**: Deletes the caller's own attendance record for the current Bangladesh calendar date, so they can check in again. Every role can do this for their own today's record. No one — including HR/Admin — can delete a record for a past date; RLS enforces this in addition to the route's own check.
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**:
  - `401` — not logged in
  - `403` — record is not the caller's own, or is not dated today
  - `404` — record not found

---

## 5. Overtime — `/api/overtime`

### GET `/api/overtime`
- **Auth**: Session required
- **Query params**:
  - `scope=all` (optional) — Admin/HR only; returns every employee's overtime entries (view-only for HR — see PATCH below). Omitted, or non-staff caller → returns only the caller's own entries (RLS-enforced regardless).
- **Success (200)**: `{ "data": OvertimeRequest[] }` (each row includes `employee: { full_name }`), newest date first
- **Errors**: `401`, `500`

### POST `/api/overtime`
- **Auth**: Session required (self-entry only — there is no staff-on-behalf-of option, unlike Leave)
- **Body (JSON)**:
  ```json
  {
    "date": "2026-07-12",
    "hours": 2,
    "reason": "Server migration support"
  }
  ```
  - Required: `date`, `hours`
  - `reason` optional
  - `hours` must be between `0.5` and `12`, in `0.5` steps
  - `date` must not be in the future (compared against Bangladesh Standard Time, `Asia/Dhaka`)
  - One entry per employee per calendar day — a second entry for a date already logged is rejected
- **Success (201)**: `{ "data": OvertimeRequest }`, `status: "pending"`
- **Errors**:
  - `400` — missing fields, `hours` outside range/not a 0.5 step, future-dated, or a duplicate entry for that date ("You already logged overtime for that date.")
  - `401` — not logged in
  - `429` — rate-limited; only active when Redis/Upstash is configured, see project plan §16

### PATCH `/api/overtime/{id}`
This route serves two different actions, disambiguated by the request body shape.

**A. Admin review** — body contains `status`:
- **Auth**: **Admin only** (not HR — HR can view all entries via `GET ?scope=all` but cannot approve/reject)
- **Path param**: `id` — overtime entry UUID
- **Body (JSON)**:
  ```json
  { "status": "approved" }
  ```
  - `status` must be `"approved"` or `"rejected"`
- **Behavior**: Only a `pending` entry can be reviewed.
- **Success (200)**: `{ "data": OvertimeRequest }` (updated row, with `reviewed_by`/`reviewed_at` set)
- **Errors**:
  - `400` — invalid `status` value, or entry is not currently `pending`
  - `401`, `403` (includes HR — this is Admin-only)
  - `404` — entry not found

**B. Employee self-edit** — body has no `status` field (any other shape is treated as an edit):
- **Auth**: Session required — must be the entry's own owner
- **Path param**: `id` — overtime entry UUID
- **Body (JSON)**:
  ```json
  { "date": "2026-07-12", "hours": 1.5, "reason": "Corrected hours" }
  ```
  - Required: `date`, `hours`; `reason` optional. Same validation as `POST /api/overtime` (0.5–12 hours in 0.5 steps, not future-dated, one entry per day).
- **Behavior**: Lets an employee correct an entry they logged by mistake — **only while it is still `pending`**. Once Admin has approved or rejected it, this is no longer available.
- **Success (200)**: `{ "data": OvertimeRequest }` (updated row)
- **Errors**:
  - `400` — missing/invalid fields, entry no longer `pending`, or a duplicate entry for that date
  - `401` — not logged in
  - `403` — caller does not own this entry
  - `404` — entry not found

### DELETE `/api/overtime/{id}`
- **Auth**: Session required (RLS restricts to the caller's own **pending** entries, or Admin)
- **Path param**: `id` — overtime entry UUID
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**:
  - `401` — not logged in
  - `404` — not found, not yours, or no longer pending

---

## 6. Admin — `/api/admin/*`

### POST `/api/admin/clear-database`
- **Auth**: **A single designated System Admin account only** — stricter than a plain `role === 'admin'` check. The route first requires `role === 'admin'` (`requireRole`), then additionally checks the caller's email against `isSystemAdmin()` (`lib/protected-employees.ts`) and rejects any other Admin, HR, or Employee account. The Danger Zone UI is not merely disabled for everyone else — it's not rendered in the DOM at all.
- **Body**: none
- **Behavior**: Permanently deletes **all rows** from `leave_requests`, `leave_balances`, `holidays`, `attendance`, `overtime_requests`, and `posts` (whose comments and reactions cascade), using the service-role client rather than the caller's own session. This matters because a couple of these tables (notably `attendance`, which only allows deleting *your own, today's* row under normal RLS — see §4) would otherwise silently leave most rows behind, since a restrictive RLS policy just matches zero rows rather than erroring. The service-role client bypasses that entirely for this one, tightly-gated action. Afterward, it re-seeds a fresh default `leave_balances` row (10/14/15 days, 0 used) for every remaining employee, so the balances view is immediately clean instead of repopulating one employee at a time as each person happens to revisit `/leave`. Never touches `profiles` or Supabase Auth users — no accounts are affected.
- **Success (200)**: `{ "data": { "cleared": ["leave_requests", "leave_balances", "holidays", "attendance", "overtime_requests", "posts"] } }`
- **Errors**:
  - `401` — not logged in
  - `403` — logged in but not the System Admin account (includes every other Admin and HR account)
  - `500` — deletion failed partway through (message names which table), or the tables were cleared but re-seeding `leave_balances` afterward failed

### POST `/api/admin/clear-audit-logs`
- **Auth**: **Admin only** (not HR) — the usual Admin gate, deliberately *not* restricted to the System Admin account like Clear Database above, since this only clears history, not operational data.
- **Body**: none
- **Behavior**: Permanently deletes **all rows** from `audit_logs`, for every employee. Does not touch any other table.
- **Success (200)**: `{ "data": { "deleted": <count> } }`
- **Errors**:
  - `401` — not logged in
  - `403` — logged in but not Admin (HR included)
  - `500` — deletion failed

---

## 7. Signup Requests — `/api/signup-requests`

Public self-service access requests submitted from `/signup` (no session required to submit). Reviewing
them is **Admin only** — not HR, unlike every other Admin/HR-gated resource in this app.

### GET `/api/signup-requests`
- **Auth**: Admin only
- **Query params**: none
- **Success (200)**: `{ "data": SignupRequest[] }`, ordered by `created_at` descending
- **Errors**: `401`, `403`, `500`

### POST `/api/signup-requests`
- **Auth**: none — publicly callable from the sign-up page
- **Body (JSON)**:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com",
    "department": "Engineering",
    "designation": "Software Engineer",
    "mobile": "+8801XXXXXXXXX"
  }
  ```
  - Required: `full_name`, `email`
  - `department`, `designation`, `mobile` optional
- **Behavior**: Inserts a row into `signup_requests` with `status: "pending"`. Does **not** touch
  `auth.users`/`profiles` — no account exists until an Admin approves it.
- **Success (201)**: `{ "data": { "submitted": true } }`
- **Errors**:
  - `400` — missing `full_name`/`email`
  - `409` — a pending request already exists for that email (unique constraint)

### PATCH `/api/signup-requests/{id}`
- **Auth**: Admin only
- **Path param**: `id` — signup request UUID
- **Body (JSON)**:
  ```json
  { "status": "approved" }
  ```
  - `status` must be `"approved"` or `"rejected"`
- **Behavior**: Only a `pending` request can be reviewed.
  - On `"approved"`: creates a Supabase Auth user (random password, email pre-confirmed), copies
    `department`/`designation`/`mobile` onto the new `profiles` row, seeds a leave balance row for
    the current year, and sends a password-setup email (`resetPasswordForEmail` → `/reset-password`)
    — identical downstream behavior to `POST /api/employees`.
  - If an auth user for that email already exists (e.g. a prior attempt partially completed), reuses
    that existing user instead of failing with a duplicate-email error.
  - Either way, marks the `signup_requests` row with `reviewed_by`/`reviewed_at`.
- **Success (200)**: `{ "data": SignupRequest }` (updated row)
- **Errors**:
  - `400` — invalid `status`, request not currently `pending`, or user creation failed
  - `401`, `403`
  - `404` — request not found
  - `500` — unexpected failure partway through approval (message included)

---

## 8. Settings (profile self-edit + password)

`/settings` doesn't go through `/api/*` for the mutation itself on these two actions:
- **Profile edit** (full name, phone, department, designation — email is never editable) is a Next.js
  **Server Action** (`updateOwnProfile` in `lib/actions/profile.ts`), called directly from the form,
  not a REST endpoint. RLS (`profiles_update_own_or_staff`) already restricts this to the caller's own
  row regardless of role. Writes an `audit_logs` entry (`entity: "profile"`) on success.
- **Change password** calls Supabase Auth directly from the client (`supabase.auth.updateUser({ password })`)
  — same mechanism `/reset-password` uses, just without the recovery-token step since the user already
  has an active session.

If you need to exercise either mutation via an API client rather than the UI, you'll need a valid
Supabase session and must call these through the Supabase client SDK/REST directly — the
`access_token` from `POST /api/auth/login` (§12) is the session to use.

### POST `/api/settings/password-changed`
- **Auth**: Session required
- **Body**: none
- **Behavior**: Not a mutation route — the actual password update happens client-side via Supabase
  Auth directly (see above), which has no server-side hook of its own. This route exists purely so a
  successful password change can be recorded in the audit log (`entity: "password"`), with the actor
  identity taken from the caller's own session cookie (not client-supplied) so it can't be spoofed.
  The client fires this right after `updateUser()` succeeds; a failure here doesn't affect the password
  change itself.
- **Success (200)**: `{ "data": { "ok": true } }`
- **Errors**: `401` — not logged in

The **Delete Account** action on the same page does go through a dedicated route — see §10 below.

---

## 9. Team Directory — no dedicated API route

`/directory` is a Server Component that queries the `profiles` table directly through
Supabase (no `/api/*` route backs it). Since migration `0006_profiles_directory_select.sql`,
every authenticated user can `SELECT` all profiles (write access is unchanged — still
Admin/HR-only or self-only). If you need to exercise this via an API client rather than the
UI, query Supabase's PostgREST endpoint directly (`GET {SUPABASE_URL}/rest/v1/profiles`) with
the `access_token` from `POST /api/auth/login` (§12) — there is nothing under `/api/` to call for
this feature. Alternatively, `GET /directory` itself accepts `Authorization: Bearer <access_token>`
like every other page, if rendering the page (rather than reading the data) is what you're testing.

It also shows a small "on leave today" indicator next to anyone with an **approved** leave
request covering the current date (Bangladesh time). That check queries `leave_requests` via
the service-role client — regular employees can't read other people's leave rows under RLS,
but a plain "away today" yes/no doesn't reveal the leave type or reason, so it's safe to surface
here. Pending requests never trigger it, only approved ones.

---

## 10. Account — `/api/account`

### DELETE `/api/account`
- **Auth**: Session required (self only — deletes the caller's own account, every role)
- **Body**: none
- **Behavior**: Deletes the caller's own Supabase Auth user via the Admin API, which cascades to their
  `profiles` row, `leave_requests`, `leave_balances`, `attendance`, and `overtime_requests` (all FK'd
  with `on delete cascade`). The route then signs out the session so cookies are cleared before the
  client redirects to `/login`. A small set of protected accounts (see `lib/protected-employees.ts`,
  the same allowlist used by `DELETE /api/employees/{id}`) can never delete themselves via this route
  either — checked server-side.
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**:
  - `401` — not logged in
  - `403` — caller's account is in the protected-employees allowlist
  - `400` — deletion failed

---

## 11. Audit Log — `/audit-log` (no dedicated read route) + `/api/admin/clear-audit-logs`

`/audit-log` is a Server Component that queries the `audit_logs` table directly through Supabase
(no `/api/*` GET route backs it — same pattern as Team Directory in §9), using the caller's own
session so RLS does the actual scoping:
- **Employee/HR**: `audit_logs_select_own_or_admin` RLS policy restricts them to rows where
  `actor_id = auth.uid()` — their own history only.
- **Admin**: the same policy also allows `current_role() = 'admin'`, so Admin sees every employee's
  history. The page adds a client-side, real-time search box (name/email/comment/action label) for Admin only —
  everything else (the date-range filter) is available to every role and filters entirely client-side
  over already-fetched rows.
- **Retention**: every query (regardless of role) is clamped to the last **10 days**
  (`AUDIT_LOG_RETENTION_DAYS` in `lib/audit.ts`) — rows older than that are never shown, even if the
  daily cleanup cron (below) hasn't caught up to physically delete them yet.

If you need to exercise the read side via an API client rather than the UI, query Supabase's
PostgREST endpoint directly (`GET {SUPABASE_URL}/rest/v1/audit_logs`) with the `access_token` from
`POST /api/auth/login` (§12) — there is nothing under `/api/` to call for reading audit logs. See §6
above for the one write route this feature does have (`POST /api/admin/clear-audit-logs`, Admin-only).

**Retention cleanup (internal, not user-callable)**: `GET /api/cron/audit-log-cleanup` is hit daily
by Vercel Cron (`vercel.json`), not by any client. It requires an `Authorization: Bearer <CRON_SECRET>`
header matching the `CRON_SECRET` env var — Vercel sends this automatically when invoking the cron;
any other caller gets `401`. It hard-deletes every `audit_logs` row older than the 10-day retention
window and returns `{ "data": { "deleted": <count> } }`.

---

## 12. Auth — `/api/auth/*`

### POST `/api/auth/login`
- **Auth**: none — this is how you get a credential
- **Body (JSON)**:
  ```json
  { "email": "someone@example.com", "password": "your-password" }
  ```
  - Both required
- **Behavior**: Signs in against Supabase Auth (`signInWithPassword`). On success it does **two**
  things: sets the Supabase session cookie on the response (so a browser or cookie-jar client is
  logged in as usual), **and** returns the tokens in the JSON body so a scripted client can use
  `Authorization: Bearer <access_token>` directly — see *Authenticating an API client* at the top
  of this file. The web app's login form does not use this route; it signs in to Supabase directly
  from the browser.
- **Success (200)**:
  ```json
  {
    "data": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "xkq2f...",
      "token_type": "bearer",
      "expires_in": 3600,
      "expires_at": 1785412345,
      "user": {
        "id": "6f1c...-uuid",
        "email": "someone@example.com",
        "full_name": "Jane Doe",
        "role": "employee"
      }
    }
  }
  ```
  - `expires_in` is seconds from now; `expires_at` is absolute unix seconds (either is enough to
    drive a refresh loop). `full_name`/`role` come from the caller's `profiles` row and are `null`
    if no profile exists yet.
- **Errors**:
  - `400` — body isn't valid JSON, or `email`/`password` missing
  - `401` — bad credentials (Supabase's own message is passed through, e.g. `"Invalid login credentials"`).
    Note this is `401`, not the `400` Supabase itself returns, to match the rest of this API.
  - `429` — **not** a rate limit on logins. Only *failed* attempts are counted, and only above 150
    failures on one email within a 10-second window, so a load test signing in with valid
    credentials is never throttled and a wrong-password test suite clears itself 10 seconds later.
    Only active when Redis/Upstash is configured (project plan §16); without Redis there is no
    ceiling at all.
- **Not audit-logged.** None of the four routes in this section write an `audit_logs` entry —
  `AuditAction` has no login/logout action, and a load test would flood the 10-day retention
  window (§11) with sign-ins. Don't expect audit rows from an auth test run.

### GET `/api/auth/me`
- **Auth**: Session required (bearer token or cookie)
- **Body**: none
- **Behavior**: "Is this credential valid, and who does it belong to?" — the one call worth making
  after logging in, before asserting anything role-specific. Read-only.
- **Success (200)**: `{ "data": { "user": { "id": "...", "email": "..." }, "profile": Profile } }`
  — `profile` is the full row, so `profile.role` is what to assert against for role-based tests.
- **Errors**:
  - `401` — no credential, or the token is invalid/expired
  - `404` — token is valid but no `profiles` row exists for that user

### POST `/api/auth/refresh`
- **Auth**: none directly — the refresh token *is* the credential
- **Body (JSON, optional)**:
  ```json
  { "refresh_token": "xkq2f..." }
  ```
  - If omitted (or the body isn't JSON), the session cookie's refresh token is used instead.
- **Behavior**: Exchanges a refresh token for a fresh access token, and updates the session cookie
  too. An access token lasts ~1 hour, so a long soak test needs this rather than signing in again
  (repeated sign-ins count against Supabase's own auth rate limits). The old refresh token is
  consumed — use the new one from the response next time.
- **Success (200)**: identical shape to `POST /api/auth/login` above
- **Errors**: `401` — refresh token missing, already used, or expired (e.g. `"Refresh token is not valid"`)

### POST `/api/auth/logout`
- **Auth**: Session required (bearer token or cookie)
- **Body**: none
- **Behavior**: Revokes the caller's session server-side. With a bearer token, that specific access
  token is revoked (the token is dead for every client holding it, so don't call this mid-run if
  other VUs share the token). With a cookie, the session is revoked and the cookies are cleared.
- **Success (200)**: `{ "data": { "signed_out": true } }`
- **Errors**:
  - `401` — no credential, or the bearer token was already invalid
  - `400` — sign-out failed (message passed through)

### POST `/api/auth/forgot-password`
- **Auth**: none — publicly callable from the login page's "Forgot password?" dialog
- **Body (JSON)**:
  ```json
  { "email": "someone@example.com" }
  ```
- **Behavior**: Looks up the email against `profiles` (case-insensitive) using the service-role
  client. If no matching account exists, returns `404` with a plain "no account" message — deliberately
  **not** the ambiguous "if an account exists…" wording, since this is an internal HR tool where
  account-enumeration risk is accepted in exchange for a clearer user experience. If a match is found,
  triggers Supabase's `resetPasswordForEmail` (same mechanism the invite flow uses) and returns success.
- **Success (200)**: `{ "data": { "sent": true } }`
- **Errors**:
  - `400` — missing `email`
  - `404` — `{ "error": "No user found with this email. Please Sign Up first" }`
  - `500` — lookup or send failed

### POST `/api/auth/password-set`
- **Auth**: Session required (established client-side via `supabase.auth.setSession()` from the
  recovery-link tokens, before this route is ever called — see `/reset-password`)
- **Body**: none
- **Behavior**: Called from `/reset-password` right after `supabase.auth.updateUser({ password })`
  succeeds. The same page/mechanism serves two different situations, and this route is what tells
  them apart, based on whether `profiles.password_set_at` is still `null`:
  - **`null`** (this account has never set its own password before — i.e. it was just created by
    Admin/HR or an approved signup request, and this is the invite link): logs `action: "joined"`,
    `entity: "account"`, comment `"<email> has been registered to the app"`, then stamps
    `password_set_at` so this never fires again for the same account.
  - **otherwise** (an existing employee following a genuine "Forgot password?" link): logs
    `action: "update"`, `entity: "password"`, comment `"Reset password via forgot-password link"`.
- **Success (200)**: `{ "data": { "ok": true } }`
- **Errors**: `401` — no session (shouldn't happen in normal use, since `/reset-password` only calls
  this after establishing one)

---

## 13. Engagement — `/api/posts`

Backs the `/engagement` page. A `FeedPost` is:
```json
{
  "id": "uuid",
  "content": "Great work @[Jane Doe](<profile-uuid>)!",
  "kind": "update",
  "is_announcement": false,
  "is_pinned": false,
  "created_at": "2026-10-08T09:30:00.000Z",
  "author": { "id": "uuid", "full_name": "Rahim Uddin", "designation": "Engineer", "avatar_url": null },
  "kudos": null,
  "media": [{ "id": "uuid", "kind": "image", "url": "https://…/storage/v1/object/public/post-images/…", "mime_type": "image/png", "size_bytes": 120394 }],
  "poll": null,
  "reactions": [{ "emoji": "👍", "count": 3, "mine": true, "reactors": ["Jane Doe", "Anika Rahman"] }],
  "comment_count": 2
}
```
- `kind` is `"update" | "kudos" | "poll"`. `kudos` is `{ recipient: <author shape>, value }` for kudos posts; `poll` is `{ options: [{ id, label, votes }], my_vote, total_votes }` for polls; both are `null` otherwise.
- `reactions` are in the order each emoji was first used. `reactors` lists up to 9 *other* people; the caller is represented by `mine`.
- **Tags:** a tagged colleague is written into `content` as `@[Name](<profile-uuid>)`. The UI shows `@Name` and resolves the *current* name from the id. Limits (2000 / 500 characters) count the displayed `@Name`, not the id.
- **Reactions** are Discord-style: any number of different emojis per person per item. Only emojis from the curated set in `lib/engagement.ts` (`EMOJI_CATEGORIES`, about 80) are accepted, plus the five skin-tone variants (Unicode modifiers U+1F3FB to U+1F3FF) of the hands and people marked `tone: true`. Anything else, including a skin tone on an emoji that doesn't take one, is rejected with `Unknown emoji`.

### GET `/api/posts`
- **Auth**: Session required
- **Query params**:
  - `type=announcements` (optional) — announcements; omitted → ordinary posts.
  - `kind=update|kudos|poll` (optional) — filter by kind.
  - `q` (optional) — case-insensitive text search over the post body (up to 80 characters).
  - `mentioned=me` (optional) — only posts that tag the caller.
  - `pinned=false` (optional) — exclude pinned announcements (used to page past the pinned ones the first page already returned).
  - `before` (optional) — ISO timestamp; returns posts created strictly before it.
- **Success (200)**: `{ "data": FeedPost[], "has_more": boolean }` — pinned first, then newest first, 10 per page
- **Errors**: `401`, `500`

### POST `/api/posts`
- **Auth**: Session required. `is_announcement: true` is **Admin/HR only** (re-checked server-side and by RLS).
- **Body (JSON)**:
  ```json
  {
    "content": "1-2000 characters (the question, for a poll)",
    "kind": "update",
    "is_announcement": false,
    "kudos_recipient_id": "uuid (kudos only)",
    "kudos_value": "teamwork | ownership | innovation | extra_mile | helpfulness | customer_focus | learning (kudos only)",
    "poll_options": ["2 to 5 distinct options, up to 100 characters each (poll only)"],
    "media": [{ "kind": "image", "path": "<your-user-id>/<file>.png", "mime_type": "image/png", "size_bytes": 120394 }]
  }
  ```
- **Attachments** are uploaded by the client **directly to Supabase Storage first** (bucket `post-images`, max **3 MB**: JPEG/PNG/WebP/GIF; or `post-videos`, max **20 MB**: MP4/WebM/MOV), under a `<your-user-id>/` folder, and then referenced in `media`. A post takes up to **4 photos or 1 video**, not both. Storage enforces the size and type caps itself; this endpoint re-validates the metadata and that every path is inside the caller's own folder. Polls can't have attachments; announcements can't be kudos or polls.
- **Success (201)**: `{ "data": FeedPost }`
- **Errors**:
  - `400` — empty/too long content; unknown kind; attachment too large, wrong type, wrong folder, or a bad photo/video mix; kudos without a valid colleague/value or to yourself; poll without 2–5 distinct options; more than 5 tags or a tagged person who doesn't exist
  - `401` — not logged in
  - `403` — `is_announcement: true` from an Employee account
  - `429` — rate limited (10 requests / 10 s per employee, when Redis is configured)
  - On any `4xx` after upload, the files referenced in `media` are deleted from Storage.

### PATCH `/api/posts/{id}`
- **Auth**: **Admin or HR** — pins or unpins an announcement.
- **Body (JSON)**: `{ "is_pinned": true }`
- **Success (200)**: `{ "data": { "id": "uuid", "is_pinned": true } }`
- **Errors**: `400` — not an announcement, or already 3 pinned; `401`; `403`; `404`

### DELETE `/api/posts/{id}`
- **Auth**: Session required — the post's author, or **Admin** (not HR). Removes the post's comments, reactions, poll data, attachments (rows **and** Storage files).
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**: `401`; `403` — someone else's post and the caller isn't Admin; `404`

### GET `/api/posts/{id}/comments`
- **Auth**: Session required
- **Success (200)**: `{ "data": PostComment[] }` — oldest first, capped at 200; each is `{ id, post_id, content, created_at, author, reactions }`. An unknown post id returns an empty list.

### POST `/api/posts/{id}/comments`
- **Auth**: Session required
- **Body (JSON)**: `{ "content": "up to 500 displayed characters, may contain @[Name](uuid) tags; may be empty when media is set", "media": CommentMediaInput | null }`
- **Attachments**: at most **one per comment**, kept small: a **photo up to 1 MB** (JPEG/PNG/WebP) or a **clip up to 5 MB** (MP4/WebM/MOV), uploaded by the client straight to the `comment-images` / `comment-videos` bucket under `<your-user-id>/` and referenced as `{ "kind": "image" | "video", "path", "mime_type", "size_bytes" }`; or a **GIF** from `GET /api/gifs` referenced as `{ "kind": "gif", "url": "https://media*.giphy.com/..." }`. Only GIPHY's own hosts are accepted for GIF links.
- **Success (201)**: `{ "data": PostComment }` — a `PostComment` now also carries `media: { kind: "image" | "video" | "gif", url } | null`
- **Errors**: `400` — no text and no attachment, too long, more than 5 tags or an unknown tagged person, an oversize/unsupported/foreign-folder attachment, or a GIF link that isn't from GIPHY; `401`; `404` — post doesn't exist; `429`. A rejected request also deletes any file it referenced, and deleting a comment (or its post) deletes its file.

### DELETE `/api/posts/{id}/comments/{commentId}`
- **Auth**: Session required — the comment's author, or **Admin** (not HR)
- **Success (200)**: `{ "data": { "id": "<deleted-uuid>" } }`
- **Errors**: `401`; `403`; `404`

### POST `/api/posts/{id}/reactions` · POST `/api/posts/{id}/comments/{commentId}/reactions`
- **Auth**: Session required
- **Body (JSON)**: `{ "emoji": "👍" }`
- **Behavior**: adds the caller's reaction. Adding one they already have is a no-op success.
- **Success (200)**: `{ "data": { "emoji": "👍" } }`
- **Errors**: `400` — emoji not in the allowed set; `401`; `404` — post/comment doesn't exist

### DELETE `/api/posts/{id}/reactions?emoji=👍` · DELETE `/api/posts/{id}/comments/{commentId}/reactions?emoji=👍`
- **Auth**: Session required
- **Behavior**: removes the caller's own reaction with that emoji. Succeeds even if there was none.
- **Success (200)**: `{ "data": { "emoji": "👍" } }`
- **Errors**: `400` — unknown emoji; `401`

### POST `/api/posts/{id}/vote`
- **Auth**: Session required
- **Body (JSON)**: `{ "option_id": "uuid" }`
- **Behavior**: casts or changes the caller's vote (one per person per poll). Votes are **not anonymous**.
- **Success (200)**: `{ "data": { "post_id": "uuid", "option_id": "uuid" } }`
- **Errors**: `400` — option isn't part of this poll; `401`

---

## 14. Notifications — `/api/notifications`

In-app notifications, each readable only by its recipient (not even Admin). Created server-side for:
the **tagged person** when a post, announcement, poll, kudos message or comment contains an `@tag`;
the colleague **receiving kudos**; a **post's or comment's author when someone else comments on or
reacts to it**; and a person **wished a happy birthday or work anniversary**. Nobody else is notified
(no broadcast), and acting on your own content notifies no one. Reactions follow the same
anti-spam rules as comments: while a person's earlier reaction alert on the same post (or comment)
is unread they add no new one, and taking the reaction back withdraws an unread alert. If the author is
also tagged in the comment they get just the tag notification; and while someone's earlier comment
notification on a post is still unread, their further comments add no new one.
There is no insert endpoint: notifications are written by the API through the service-role client,
so a user can never forge one. They're deleted with their post/comment, and by the daily cleanup
cron after 30 days.

An `AppNotification` is:
```json
{
  "id": "uuid",
  "type": "mention",
  "context": "poll",
  "post_id": "uuid",
  "comment_id": null,
  "preview": "Which day works for the offsite, @Jane Doe?",
  "read_at": null,
  "created_at": "2026-10-08T09:30:00.000Z",
  "actor": { "id": "uuid", "full_name": "Rahim Uddin", "designation": "Engineer", "avatar_url": null }
}
```
`type` is `"mention" | "kudos" | "comment" | "reaction" | "wish"`; `context` is
`"post" | "announcement" | "poll" | "kudos" | "comment" | "birthday" | "milestone"`. For `comment` and
`reaction` it is the kind of post involved (or `"comment"` for a reaction on a comment); for `wish` it is
the occasion. `emoji` is set for reactions. `post_id` is `null` for wishes, which instead carry
`occasion_date` (the celebrated day) and open the wishes card at `/engagement?wishes={date}&occasion={context}`.
The UI opens `/engagement/posts/{post_id}` (adding `?comment={comment_id}` for comment tags and comment notifications) — a page
showing only that post, comments open, the tagged comment highlighted.

### GET `/api/notifications`
- **Auth**: Session required
- **Query params**: `limit` (1–50, default 20), `before` (ISO timestamp, for the next page), `unread=1` (only unread — the Unread tab)
- **Success (200)**: `{ "data": AppNotification[], "has_more": boolean, "unread_count": number }` — newest first
- **Errors**: `401`, `500`

### GET `/api/notifications/unread-count`
- **Auth**: Session required
- **Success (200)**: `{ "data": { "count": number } }` — what the navbar bell polls (every 60 s while the tab is visible, and on focus)

### PATCH `/api/notifications/{id}`
- **Auth**: Session required — marks one of **your own** notifications as read, or unread with body `{ "read": false }`. Someone else's id, or one already in that state, is a no-op success.
- **Success (200)**: `{ "data": { "id": "uuid", "read": true } }`
- **Errors**: `401`, `404` — not a valid id

### DELETE `/api/notifications/{id}`
- **Auth**: Session required — removes one of **your own** notifications from your list (someone else's id matches nothing)
- **Success (200)**: `{ "data": { "id": "uuid" } }`
- **Errors**: `401`, `404` — not a valid id

**In the UI:** unread "commented on" and "reacted to" notifications about the same post (or comment), and
wishes for the same celebration, collapse into one row ("Jane, Rahim and 2 others reacted to your post")
that is read or removed as a unit — that
grouping is done client-side, so the API still returns one row per comment. The bell also shows a
toast ("Jane tagged you in a post · View") when a new one arrives while the app is open.

### POST `/api/notifications/read-all`
- **Auth**: Session required — marks all of your unread notifications as read
- **Success (200)**: `{ "data": { "ok": true } }`

---

## 15. Celebration wishes — `/api/wishes`

Wishes, comments and reactions on a **card**. Every celebration has one: a `birthday`, a work
`milestone` (3, 5, 10, then every 5 years), an ordinary `anniversary` (any other year), or a
`new_joiner` welcome card (open for 14 days after joining). Teammates sign it once each. **Birthdays are private:** the date of birth is stored in its own table readable only by
its owner (never in `profiles`, never in the Directory or any API response), set from
**Settings → Birthday**. Teammates only ever see the day and month of people who left sharing on,
computed server-side. Anniversaries are counted from `profiles.joined_date`. A card is open on the day itself and for **3 days after** (new joiners: 14 days from joining).

A wish is `{ id, recipient_id, occasion: "birthday" | "milestone", occasion_date, years, message, created_at, sender }`.

### GET `/api/wishes?recipient={id}&occasion={birthday|milestone}&date={YYYY-MM-DD}`
- **Auth**: Session required — everything on that celebration's card (visible to the whole team)
- **Success (200)**: `{ "data": Wish[], "comments": CardComment[], "reactions": ReactionSummary[] }` — wishes newest first, comments oldest first. A `CardComment` is `{ id, content, created_at, author }`; comments may contain `@[Name](uuid)` tags
- **Errors**: `400` — missing or malformed parameters; `401`

### POST `/api/wishes`
- **Auth**: Session required
- **Body (JSON)**: `{ "recipient_id": "uuid", "occasion": "birthday", "occasion_date": "2026-10-08", "message": "1-200 characters" }`
- **Behavior**: the server confirms it really is that person's birthday (they must be sharing it) or milestone anniversary, and that today is within the 3-day window, then writes the wish with the service-role client (wishes have no insert policy, so a client can never create one for a celebration that isn't happening) and notifies the recipient. One wish per sender per celebration.
- **Success (201)**: `{ "data": Wish }`
- **Errors**: `400` — wishing yourself, empty or over-long message, a day that isn't their birthday/anniversary, outside the 3-day window, a non-milestone year, someone not sharing a birthday (same message as "none on file", so it can't be used to probe), or a duplicate; `401`; `429` — rate limited

### POST `/api/wishes/comments`
- **Auth**: Session required. Comment on a card; works while the card is open (the day itself and 3 days after).
- **Body (JSON)**: `{ "recipient_id": "uuid", "occasion": "birthday", "occasion_date": "2026-10-08", "content": "up to 500 displayed characters, may contain @[Name](uuid) tags (may be empty when media is set)", "media": CommentMediaInput | null }` — same one-small-attachment rule as post comments
- **Behavior**: the celebrant is notified ("commented on your birthday card") unless they are the commenter or are tagged; anyone tagged is notified ("tagged you on a birthday card"). Written with the service-role client after the celebration is verified.
- **Success (201)**: `{ "data": CardComment }`
- **Errors**: `400` — no text and no attachment, too long, more than 5 tags or an unknown tagged person, a bad attachment, or the card is closed/not real (message starts "This card is closed."); `401`; `429`

### DELETE `/api/wishes/comments/{id}`
- **Auth**: Session required — the comment's author, or **Admin**
- **Success (200)**: `{ "data": { "id": "uuid" } }`; **Errors**: `401`, `403`, `404`

### POST / DELETE `/api/wishes/reactions/{recipient}/{occasion}/{date}`
- **Auth**: Session required. `POST` body `{ "emoji": "🎉" }` adds your reaction (same allowed emoji set as posts; repeating is a no-op); `DELETE ?emoji=🎉` removes yours. Adding needs the card to be open; removing always works.
- **Behavior**: the celebrant is notified ("reacted 🎉 to your birthday card"), with the same grouping and withdrawal rules as post reactions.
- **Errors**: `400` — unknown emoji or closed card; `401`

### DELETE `/api/wishes/{id}`
- **Auth**: Session required — the sender, or **Admin** (every removal is written to the Audit Log)
- **Success (200)**: `{ "data": { "id": "uuid" } }`
- **Errors**: `401`; `403` — someone else's wish and the caller isn't Admin; `404`

---

## 16. GIF search — `/api/gifs`

GIF search for comments, backed by **GIPHY** (Google shut Tenor's API down on 30 June 2026). The API
key (`GIPHY_API_KEY`, server-only) is never sent to the browser. GIPHY's free key allows about **100
calls per hour**, so each search (and the trending list) is cached on the server for an hour: the same
query costs one call, not one per person. Results are G-rated.

### GET `/api/gifs?q={text}&offset={n}`
- **Auth**: Session required. `q` is optional (up to 50 characters); empty returns what's trending. `offset` pages through results (18 per page).
- **Success (200)**: `{ "data": [{ "id", "title", "url", "preview", "width", "height" }], "next_offset": number | null }`
- **Errors**: `401`; `429` — you are searching too fast; `502` — GIPHY is unavailable; `503` — no `GIPHY_API_KEY` is configured on the server, or GIPHY's hourly limit was hit

---

## 17. Account activity — `/api/admin/*` (Admin only)

Backs the `/account-activity` page. **Admin only**, re-checked from the session on every route (HR and
Employees get `403`), and the event table's own RLS policy allows nobody else to read it.

**What is recorded.** The People tab is derived live from Supabase Auth and `profiles.password_set_at`
(no endpoint; the page reads it on the server). The Activity tab reads `auth_events`, written by the API at
the moment each thing happens and kept **90 days**: `signup_requested`, `signup_approved`, `signup_rejected`,
`invite_sent`, `invite_resent`, `password_set` (first password), `password_reset_requested`,
`password_reset_unknown_email`, `password_reset_completed`, `password_changed`. An event is only written when
the thing really happened (an invite whose email failed to send is not logged), and never contains a password,
token or link. No endpoint can create, change or delete an event.

### GET `/api/admin/auth-events`
- **Auth**: Admin only
- **Query params**: `type` (one of the event names above; unknown values are ignored), `q` (partial email, literal match), `before` (ISO timestamp, for the next page)
- **Success (200)**: `{ "data": AuthEvent[], "has_more": boolean }` — newest first, 25 per page; an `AuthEvent` is `{ id, event, user_id, email, actor_id, detail, ip, user_agent, created_at }`
- **Errors**: `401`; `403` — not an Admin; `400` — malformed `before`

### POST `/api/admin/account-activity/resend-invite`
- **Auth**: Admin only
- **Body (JSON)**: `{ "user_id": "uuid" }`
- **Behavior**: sends the "set your password" email again. Only for accounts that have **not** set a password yet, so it can't be used to trigger reset emails for active people. Records an `invite_resent` event and an Audit Log entry.
- **Success (200)**: `{ "data": { "sent": true } }`
- **Errors**: `400` — missing/invalid id, the person already has a password, or the email provider's own limit on how often one address can be emailed; `401`; `403`; `404` — no such employee; `429` — rate limited

Routes that now write events (their own responses are unchanged): `POST /api/signup-requests`,
`PATCH /api/signup-requests/{id}`, `POST /api/employees`, `POST /api/auth/forgot-password`,
`POST /api/auth/password-set`, `POST /api/settings/password-changed`.

---

## Quick reference table

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/employees` | Admin/HR | List all employees |
| POST | `/api/employees` | Admin/HR | Create employee |
| GET | `/api/employees/{id}` | Admin/HR | Get one employee |
| PATCH | `/api/employees/{id}` | Admin/HR | Update employee |
| DELETE | `/api/employees/{id}` | Admin/HR | Delete employee |
| GET | `/api/leave` | Session | List leave requests (own, or all with `?scope=all` for staff) |
| POST | `/api/leave` | Session | Apply for leave (or file on behalf of another employee, staff only) — rejected if it would exceed the remaining balance |
| PATCH | `/api/leave/{id}` | Admin/HR (`status` body) or Session (owner, edit body) | Approve/reject a pending request (approval re-checks the balance first), or self-edit your own pending request |
| DELETE | `/api/leave/{id}` | Session | Delete own pending request (or staff) |
| GET | `/api/holidays` | Session | List holidays |
| POST | `/api/holidays` | Admin/HR | Create holiday |
| PATCH | `/api/holidays/{id}` | Admin/HR | Update holiday |
| DELETE | `/api/holidays/{id}` | Admin/HR | Delete holiday |
| POST | `/api/holidays/seed-defaults` | Session | Seed default BD public holidays for a year |
| GET | `/api/attendance` | Session | List attendance (own, or all/by-date with query params for staff) |
| POST | `/api/attendance` | Session | Check in for today (idempotent) |
| PATCH | `/api/attendance/{id}` | Session | Quick check-out, or manual override of check-in/out |
| DELETE | `/api/attendance/{id}` | Session | Delete own attendance record, today only |
| GET | `/api/overtime` | Session | List overtime entries (own, or all with `?scope=all` for staff) |
| POST | `/api/overtime` | Session | Log overtime (self-entry only) |
| PATCH | `/api/overtime/{id}` | Admin only (`status` body) or Session (owner, edit body) | Approve/reject a pending entry, or self-edit your own pending entry |
| DELETE | `/api/overtime/{id}` | Session | Delete own pending overtime entry (or Admin) |
| GET | `/api/posts` | Session | List feed posts, or announcements with `?type=announcements`; filter `?kind=`, page with `?before=` — see §13 |
| POST | `/api/posts` | Session (announcements: Admin/HR) | Create a post, announcement, kudos or poll, with optional photo/video attachments and @tags |
| PATCH | `/api/posts/{id}` | Admin/HR | Pin or unpin an announcement |
| DELETE | `/api/posts/{id}` | Session (author, or Admin) | Delete a post with its comments, reactions, poll data and attachments |
| GET | `/api/posts/{id}/comments` | Session | List a post's comments |
| POST | `/api/posts/{id}/comments` | Session | Comment on a post |
| DELETE | `/api/posts/{id}/comments/{commentId}` | Session (author, or Admin) | Delete a comment |
| POST / DELETE | `/api/posts/{id}/reactions` | Session | Add / remove your emoji reaction on a post |
| POST / DELETE | `/api/posts/{id}/comments/{commentId}/reactions` | Session | Add / remove your emoji reaction on a comment |
| POST | `/api/posts/{id}/vote` | Session | Vote in (or change your vote on) a poll |
| GET | `/api/wishes` | Session | The wishes on one birthday / milestone card — see §15 |
| POST | `/api/wishes` | Session | Sign a birthday or work-anniversary card (server verifies it is their day) |
| DELETE | `/api/wishes/{id}` | Session (sender, or Admin) | Remove a wish |
| GET | `/api/admin/auth-events` | Admin only | Account security event history (90 days), filterable and paged — see §17 |
| POST | `/api/admin/account-activity/resend-invite` | Admin only | Resend the invite email to someone who hasn't set a password |
| GET | `/api/gifs` | Session | Search GIFs (GIPHY) for comments; trending when `q` is empty — see §16 |
| POST | `/api/wishes/comments` | Session | Comment on a celebration card (supports @tags and one small photo / clip / GIF) |
| DELETE | `/api/wishes/comments/{id}` | Session (author, or Admin) | Delete a card comment |
| POST / DELETE | `/api/wishes/reactions/{recipient}/{occasion}/{date}` | Session | React to / un-react from a card |
| GET | `/api/notifications` | Session | Your notifications (newest first, paged with `?before=`) plus `unread_count` — see §14 |
| GET | `/api/notifications/unread-count` | Session | Your unread count (what the bell polls) |
| PATCH | `/api/notifications/{id}` | Session | Mark one of your notifications read (or unread with `{ "read": false }`) |
| DELETE | `/api/notifications/{id}` | Session | Remove one of your notifications |
| POST | `/api/notifications/read-all` | Session | Mark all of your notifications as read |
| POST | `/api/admin/clear-database` | System Admin only | Wipe leave/holiday/attendance/overtime/engagement data (including uploaded photos/videos) (not accounts), then re-seed fresh leave balances |
| POST | `/api/admin/clear-audit-logs` | Admin only | Wipe all audit log history |
| GET | `/api/signup-requests` | Admin only | List pending sign-up/access requests |
| POST | `/api/signup-requests` | None (public) | Submit a self-service access request from `/signup` |
| PATCH | `/api/signup-requests/{id}` | Admin only | Approve (creates account + sends invite email) or reject a request |
| — | `/settings` (no API route for the mutation) | Session | Server Action + direct Supabase Auth calls — see §8 |
| POST | `/api/settings/password-changed` | Session | Audit-log-only hook, fired after a client-side password change succeeds — see §8 |
| — | `/directory` (no API route) | Session | Reads `profiles` (+ today's approved leave, for the "on leave today" indicator) directly via Supabase — see §9 |
| DELETE | `/api/account` | Session | Delete your own account (all roles) — see §10 |
| — | `/audit-log` (no API route) | Session | Reads `audit_logs` directly via Supabase, RLS-scoped — see §11 |
| POST | `/api/auth/login` | None (public) | Sign in — sets the session cookie **and** returns `access_token`/`refresh_token` in the body — see §12 |
| GET | `/api/auth/me` | Session | Verify a token and return the caller's user + profile (role) — see §12 |
| POST | `/api/auth/refresh` | Refresh token | Exchange a refresh token for a fresh access token — see §12 |
| POST | `/api/auth/logout` | Session | Revoke the caller's session — see §12 |
| POST | `/api/auth/forgot-password` | None (public) | Check an email against real accounts and send a reset link — see §12 |
| POST | `/api/auth/password-set` | Session (recovery link) | Log "joined" (first-ever password) or a password reset from `/reset-password` — see §12 |
| GET | `/api/cron/audit-log-cleanup` | `CRON_SECRET` bearer token (Vercel Cron only) | Daily hard-delete of audit logs older than 10 days (notifications older than 30, and security events older than 90) — see §11 |
