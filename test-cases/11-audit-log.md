# Test Cases — Audit Log

App URL: https://peoplix-hr.vercel.app/audit-log
Access: every role (Admin, HR, Employee).

> The Admin-only "Delete All Audit Logs" cleanup action lives on the **Settings** page, not here —
> see [`07-settings-danger-zone.md`](07-settings-danger-zone.md) § Audit Log Cleanup.

## Visibility & access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as an Employee and open `/audit-log` | Valid Employee account | Page loads (not redirected away); only shows entries where this employee is the actor |
| 2 | Log in as HR and open `/audit-log` | Valid HR account | Page loads; only shows this HR account's own entries — **not** every employee's, even though HR can see all leave/overtime/attendance elsewhere |
| 3 | Log in as Admin and open `/audit-log` | Valid Admin account | Page loads showing entries from **every** employee, not just the Admin's own |
| 4 | As an Employee/HR, attempt to read another employee's logs directly (e.g. via Supabase REST/dev tools) | Employee/HR session token | Row Level Security rejects rows where `actor_id` isn't the caller's own id, regardless of any query parameter |

## Retention notice

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 5 | Open `/audit-log` as any role | N/A | A banner near the top states logs are kept for 10 days and then automatically removed |
| 6 | Check the oldest visible entry's timestamp against today's date | N/A | No entry is ever older than 10 days, regardless of role or filters applied |

## Search (Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 7 | As Admin, type a full or partial employee name into the search box | An existing employee's name | List filters in real time to entries whose actor name matches |
| 8 | As Admin, search by a partial email | A substring of a known employee's email | Matching entries remain visible |
| 9 | As Admin, search by comment text | A word likely to appear in a comment, e.g. "leave" or "overtime" | Entries whose comment contains that text remain visible |
| 9a | As Admin, search by action label | e.g. "Created", "Updated", "Joined", "Approved" | **Every** entry with that action is shown, not just the entries whose comment text happens to contain the word — search matches against the action label itself, not only the comment |
| 10 | As Admin, search for something that matches nothing | Random string, e.g. "zzzznotreal" | List shows "No audit logs match your filters." |
| 11 | Log in as Employee or HR and check the Audit Log page | Valid Employee/HR account | No search box is shown at all — only the date filter is available |

## Date filter (all roles)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | Set only the "From" date to a day with known entries | A date within the last 10 days | List narrows to entries on/after that date |
| 13 | Set only the "To" date | A date within the last 10 days | List narrows to entries on/before that date |
| 14 | Set both "From" and "To" to bracket a known entry's date | A tight range around one entry | Only entries within that range are shown |
| 15 | Try to pick a "To" date earlier than the already-selected "From" date | From: a later date, then try to set To to an earlier date | The date picker itself prevents selecting an invalid "To" (native `min`/`max` on the input); if bypassed, the app clamps the other field so the range stays valid rather than showing nothing or erroring |
| 16 | Try to pick a "From" date later than the already-selected "To" date | To: an earlier date, then try to set From to a later date | Same as above, mirrored — the range self-corrects instead of going invalid |
| 17 | Clear the date filter (✕ button) | N/A | Full (role-scoped, 10-day) list reappears |
| 18 | As an Employee, confirm no way exists to look up another employee's logs via the date filter alone | Any date range | Only this employee's own entries ever appear, regardless of range picked |

## Log content & correctness

For each action below, confirm the resulting audit entry appears promptly on `/audit-log` (as the
actor, or as Admin) with the correct actor name/email, a Bangladesh-time 12-hour timestamp, the
right action label, and a comment that plainly describes what happened.

| # | Action performed elsewhere in the app | Expected audit entry |
|---|----------------------------------------|------------------------|
| 19 | Apply for leave | Actor = applicant; action "Created"; comment mentions leave type, the weekday-only day count (e.g. "3d"), and date range |
| 20 | Self-edit a still-pending leave request | Actor = the owner; action "Updated"; comment includes the (recalculated) day count |
| 21 | Cancel a pending leave request | Actor = whoever cancelled it; action "Cancelled"; comment includes the day count |
| 22 | Admin/HR approves a leave request | Actor = the reviewer (not the employee whose leave it was); action "Approved"; comment names the employee, the day count, and leave details |
| 23 | Admin/HR rejects a leave request | Actor = the reviewer; action "Rejected"; comment includes the day count |
| 24 | Log overtime | Actor = the employee; action "Created"; comment mentions hours and date |
| 25 | Self-edit a pending overtime entry | Actor = the owner; action "Updated" |
| 26 | Cancel a pending overtime entry | Actor = whoever cancelled it; action "Cancelled" |
| 27 | Admin approves/rejects overtime | Actor = the Admin reviewer; action "Approved"/"Rejected" |
| 28 | Check in for the day | Actor = the employee; action "Created"; comment mentions the date |
| 29 | Check out | Actor = the employee; action "Updated"; comment mentions the date and the resulting duration (e.g. "8h 12m") |
| 30 | Staff manually overrides another employee's check-in/out times | Actor = the staff member (not the employee whose record it is); comment names the employee and includes the resulting duration |
| 30a | Manually correct only one of Check in/Check out, leaving the other unset | e.g. set Check in only, Check out remains empty | Comment shows "—" for the duration rather than a bogus/negative value |
| 31 | Delete today's own attendance record | Actor = the employee; action "Deleted" |
| 32 | Admin/HR creates a new employee | Actor = the creator; action "Created"; comment includes the new employee's name/email |
| 33 | Admin/HR edits an employee's profile | Actor = the editor; action "Updated"; comment includes the employee's (possibly new) name |
| 34 | Admin/HR deletes an employee | Actor = the deleter; action "Deleted"; comment includes the deleted employee's name/email |
| 35 | Admin approves/rejects a sign-up request | Actor = the Admin; action "Approved"/"Rejected"; comment includes the requester's name/email |
| 36 | Self-edit own profile in Settings, changing a single field | e.g. change only Department | Actor = self; action "Updated"; comment names the specific field, e.g. "Updated their department" |
| 36a | Self-edit multiple profile fields in one save | e.g. change Full name and Mobile together | Comment names all changed fields, e.g. "Updated their name and mobile number" |
| 36b | Click "Save changes" on the profile form without changing any field | No edits made | No new Audit Log entry is written for this save |
| 36c | Upload or change a profile photo from Settings | Any valid image | Actor = self; action "Updated"; comment reads "Updated profile photo" |
| 36d | Delete a profile photo from Settings | Account with an existing photo | Actor = self; action "Updated"; comment reads "Removed profile photo" |
| 37 | Change own password in Settings | Actor = self; action "Updated"; comment says password was changed |
| 38 | Delete own account | Actor = self; entry is visible (check as Admin, since the account/actor no longer exists to view it as) — the actor's name/email still display correctly even after the account is gone |
| 38a | A newly invited/approved employee opens the invite link and sets their password for the very first time | New account, first visit to `/reset-password` | Actor = the new employee; action **"Joined"**; comment reads exactly `"<their email> has been registered to the app"` |
| 38b | That same employee later uses "Forgot password?" and resets their password again | Same account, second time through `/reset-password` | Actor = the employee; action **"Updated"** (not "Joined" again) — only the very first password set logs as "Joined" |
| 38c | An existing employee (who has logged in normally before) uses "Forgot password?" from the login page | Existing account, `/reset-password` via the forgot-password link | Actor = the employee; action "Updated" — never "Joined", since this account already has a password set |
| 38d | As Admin, filter/search the Audit Log for a "Joined" entry | Search box: the new employee's name or email | Entry appears with action "Joined" and the exact comment text from case 38a |
| 38e | As the newly joined employee, open their own Audit Log | Their own account | Their "Joined" entry is visible to them, same as any of their other entries |

## Resilience

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 39 | Perform any loggable action while the audit-log write path is unavailable (simulated, e.g. via network throttling to Supabase if testable) | Any action, e.g. apply for leave | The primary action (leave application) still succeeds normally — a logging failure never blocks or errors out the user-facing action |
| 40 | Resize the browser to a mobile width (e.g. 375px) on `/audit-log` | Viewport resize | Table scrolls horizontally within its own container (no page-wide horizontal scroll); search box and date filters stack sensibly; no overlapping content |
| 41 | Open `/audit-log` with a slow connection or throttled network | Simulated slow load | The same spinner + "Loading…" state used across every other dashboard page (`app/(dashboard)/loading.tsx`) is shown while data fetches, instead of a blank page — Audit Log doesn't get a bespoke loading UI, for consistency with the rest of the app |
