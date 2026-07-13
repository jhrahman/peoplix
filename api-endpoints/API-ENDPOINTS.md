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

## 6. Admin — `/api/admin/clear-database`

### POST `/api/admin/clear-database`
- **Auth**: **Admin only** (not HR — stricter than the usual Admin/HR gate, matches the Danger Zone UI)
- **Body**: none
- **Behavior**: Permanently deletes **all rows** from `leave_requests`, `leave_balances`, `holidays`, `attendance`, and `overtime_requests`. Never touches `profiles` or Supabase Auth users — no accounts are affected.
- **Success (200)**: `{ "data": { "cleared": ["leave_requests", "leave_balances", "holidays", "attendance", "overtime_requests"] } }`
- **Errors**:
  - `401` — not logged in
  - `403` — logged in but not Admin (HR included)
  - `500` — deletion failed partway through (message names which table)

---

## 7. Team Directory — no dedicated API route

`/directory` is a Server Component that queries the `profiles` table directly through
Supabase (no `/api/*` route backs it). Since migration `0006_profiles_directory_select.sql`,
every authenticated user can `SELECT` all profiles (write access is unchanged — still
Admin/HR-only or self-only). If you need to exercise this via an API client rather than the
UI, query Supabase's PostgREST endpoint directly (`GET {SUPABASE_URL}/rest/v1/profiles`) with
the logged-in user's access token — there is nothing under `/api/` to call for this feature.

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
| POST | `/api/admin/clear-database` | Admin only | Wipe leave/holiday/attendance/overtime data (not accounts) |
| — | `/directory` (no API route) | Session | Reads `profiles` directly via Supabase — see §7 |
