# Peoplix — API Endpoints Reference

Base URL (local): `http://localhost:3000`
Base URL (production): `https://peoplix-hr.vercel.app`

All endpoints are Next.js API Routes under `/api/*`. None of them accept an API key in headers — auth is via the **Supabase session cookie** set when you log in through the web app (`/login`). For API-client testing (Postman/Insomnia/curl), log in through the browser first and copy the session cookies from dev tools, or drive the requests through a script that first calls Supabase's `signInWithPassword` and reuses the resulting cookies.

Do not put real passwords, service-role keys, or production secrets in this file or in any test collection — reference environment variables instead.

## Conventions used below

- **Auth**: `Session required` = any logged-in user; `Admin/HR` or `Admin only` = role is re-checked server-side, not just hidden in the UI.
- **Success shape**: `{ "data": ... }`
- **Error shape**: `{ "error": "message" }`
- Common status codes: `401 Unauthorized` (no session), `403 Forbidden` (session okay, role not allowed), `400 Bad Request` (validation), `404 Not Found`, `500 Internal Server Error`.
- `UserRole` = `"admin" | "hr" | "employee"`
- `LeaveType` = `"casual" | "sick" | "annual"`
- `LeaveStatus` = `"pending" | "approved" | "rejected"`
- `OvertimeStatus` = `"pending" | "approved" | "rejected"`
- `SignupRequestStatus` = `"pending" | "approved" | "rejected"`
- `AuditAction` = `"create" | "update" | "delete" | "cancel" | "approve" | "reject"`
- `AuditEntity` = `"leave_request" | "overtime_request" | "attendance" | "employee" | "signup_request" | "profile" | "password" | "account"`

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
- **Validation**: `end_date` must be on/after `start_date`; `employee_email` must match an existing profile.
- **Success (201)**: `{ "data": LeaveRequest }`, `status: "pending"`
- **Errors**:
  - `400` — missing fields, invalid date range, or unknown `employee_email`
  - `401` — not logged in
  - `403` — non-staff caller passed `employee_email`

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
- **Behavior**: Only a `pending` request can be reviewed. On `"approved"`, increments the matching leave-balance `*_used` column by the requested day count (creating the year's balance row first if missing).
- **Success (200)**: `{ "data": LeaveRequest }` (updated row, with `reviewed_by`/`reviewed_at` set)
- **Errors**:
  - `400` — invalid `status` value, or request is not currently `pending`
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
- **Errors**: `400` (insert failed), `401`

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
- **Behavior**: Permanently deletes **all rows** from `leave_requests`, `leave_balances`, `holidays`, `attendance`, and `overtime_requests`. Never touches `profiles` or Supabase Auth users — no accounts are affected.
- **Success (200)**: `{ "data": { "cleared": ["leave_requests", "leave_balances", "holidays", "attendance", "overtime_requests"] } }`
- **Errors**:
  - `401` — not logged in
  - `403` — logged in but not the System Admin account (includes every other Admin and HR account)
  - `500` — deletion failed partway through (message names which table)

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
Supabase session and must call these through the Supabase client SDK/REST directly.

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
the logged-in user's access token — there is nothing under `/api/` to call for this feature.

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
  history. The page adds a client-side, real-time search box (name/email/comment) for Admin only —
  everything else (the date-range filter) is available to every role and filters entirely client-side
  over already-fetched rows.
- **Retention**: every query (regardless of role) is clamped to the last **10 days**
  (`AUDIT_LOG_RETENTION_DAYS` in `lib/audit.ts`) — rows older than that are never shown, even if the
  daily cleanup cron (below) hasn't caught up to physically delete them yet.

If you need to exercise the read side via an API client rather than the UI, query Supabase's
PostgREST endpoint directly (`GET {SUPABASE_URL}/rest/v1/audit_logs`) with the logged-in user's
access token — there is nothing under `/api/` to call for reading audit logs. See §6 above for the
one write route this feature does have (`POST /api/admin/clear-audit-logs`, Admin-only).

**Retention cleanup (internal, not user-callable)**: `GET /api/cron/audit-log-cleanup` is hit daily
by Vercel Cron (`vercel.json`), not by any client. It requires an `Authorization: Bearer <CRON_SECRET>`
header matching the `CRON_SECRET` env var — Vercel sends this automatically when invoking the cron;
any other caller gets `401`. It hard-deletes every `audit_logs` row older than the 10-day retention
window and returns `{ "data": { "deleted": <count> } }`.

---

## 12. Auth — `/api/auth/forgot-password`

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
| POST | `/api/leave` | Session | Apply for leave (or file on behalf of another employee, staff only) |
| PATCH | `/api/leave/{id}` | Admin/HR (`status` body) or Session (owner, edit body) | Approve/reject a pending request, or self-edit your own pending request |
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
| POST | `/api/admin/clear-database` | System Admin only | Wipe leave/holiday/attendance/overtime data (not accounts) |
| POST | `/api/admin/clear-audit-logs` | Admin only | Wipe all audit log history |
| GET | `/api/signup-requests` | Admin only | List pending sign-up/access requests |
| POST | `/api/signup-requests` | None (public) | Submit a self-service access request from `/signup` |
| PATCH | `/api/signup-requests/{id}` | Admin only | Approve (creates account + sends invite email) or reject a request |
| — | `/settings` (no API route for the mutation) | Session | Server Action + direct Supabase Auth calls — see §8 |
| POST | `/api/settings/password-changed` | Session | Audit-log-only hook, fired after a client-side password change succeeds — see §8 |
| — | `/directory` (no API route) | Session | Reads `profiles` directly via Supabase — see §9 |
| DELETE | `/api/account` | Session | Delete your own account (all roles) — see §10 |
| — | `/audit-log` (no API route) | Session | Reads `audit_logs` directly via Supabase, RLS-scoped — see §11 |
| POST | `/api/auth/forgot-password` | None (public) | Check an email against real accounts and send a reset link — see §12 |
| GET | `/api/cron/audit-log-cleanup` | `CRON_SECRET` bearer token (Vercel Cron only) | Daily hard-delete of audit logs older than 10 days — see §11 |
