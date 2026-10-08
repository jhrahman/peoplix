# Test Cases: Account Activity

App URL: https://peoplix-hr.vercel.app/account-activity
Access: **Admin only** (the sidebar link is shown to Admin alone, and the page and its data are re-checked on the server).

> This page answers "who has actually completed setting up their account, and what has happened with
> passwords?". It has two parts:
> - **People**: where each employee is in the journey right now. Worked out live from Supabase Auth and
>   `profiles.password_set_at`, so there is no second copy that can fall out of date.
> - **Activity**: the history of sign-up requests, invites, and password events, kept for **90 days**
>   (longer than the 10-day Audit Log) in a table only an Admin can read.
>
> Several cases need a disposable account and access to the invitee's mailbox.

## Access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as an Admin and look at the sidebar | Admin account | An "Account Activity" link (shield icon) is present, before "Audit Log" |
| 2 | Log in as HR and as an Employee and look at the sidebar | HR, Employee | No "Account Activity" link |
| 3 | Open `/account-activity` as HR or Employee by typing the URL | HR / Employee session | Redirected to the dashboard (`/`); nothing from the page is shown |
| 4 | Open `/account-activity` while logged out | No session | Redirected to `/login` |
| 5 | Call `GET /api/admin/auth-events` as HR, Employee, and logged out | Each | `403`, `403`, and `401` |
| 6 | Read the events table through the database REST endpoint as HR and as an Employee | `GET /rest/v1/auth_events` | No rows (Row Level Security allows Admin only) |
| 7 | Read it as an Admin through the REST endpoint | Admin token | Rows are returned |
| 8 | Try to insert, edit, or delete an event through the REST endpoint as an Admin | `POST`/`PATCH`/`DELETE /rest/v1/auth_events` | Rejected: there is no write policy, so not even an Admin can add, change, or erase the trail |

## Summary tiles

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 9 | Open the page | Admin account | Four tiles: Active, Not finished, Reset pending, Access requests, each with a count and a short hint |
| 10 | Check "Active" | N/A | Counts everyone who has set a password and signed in |
| 11 | Check "Not finished" | An invited person who has not set a password | Counts people still in the invite flow; the hint warns "N waiting over a week" (and the tile gets a red border) when any are that old |
| 12 | Check "Access requests" | 2 pending requests on `/signup` | Shows 2 and links to the Employees page (where requests are reviewed) |
| 13 | Check the counts add up | N/A | Active + Not finished + Reset pending equals the number of employees |

## People tab: statuses

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 14 | Admin adds a new employee (or approves an access request) and does nothing else | Disposable invitee | They appear as **Invite pending** with "Never" under Password set and Last signed in |
| 15 | The invitee clicks the email link but closes the page without choosing a password | Same invitee | Status becomes **Setup not finished** ("opened the link but hasn't set a password"). They count as signed in to Supabase at this point, which is why this state exists |
| 16 | The invitee chooses a password | Same invitee | Status becomes **Active**; "Password set" and "Last signed in" show times |
| 17 | An active employee uses "Forgot password?" and has not finished | Active account | Status becomes **Reset pending** until they sign in again |
| 18 | They finish the reset and sign in | Same | Back to **Active** |
| 19 | Wait for an invite to be over 7 days old without being accepted | Old invitee | The badge reads "Invite pending · over a week" in red |
| 20 | Resend the invite to that person | Stale invitee | The stale marker clears (the wait is counted from the most recent email) |
| 21 | Hover a status badge | Any | A tooltip explains the status in plain words |
| 22 | Look at an existing employee from before this feature | Long-standing account | **Active** (they were treated as having set a password when that tracking began) |

## People tab: filtering and actions

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 23 | Click each filter chip | Everyone, Active, Invite pending, Setup not finished, Reset pending | The table narrows to that status; each chip shows its count |
| 24 | Search by name or email | Part of a name, part of an address | Rows filter live; the clear (X) button restores the list |
| 25 | Search with no match | "zzzz" | "No one matches." |
| 26 | Look for the "Resend invite" button | Rows in each status | Only on **Invite pending** and **Setup not finished** rows; never on Active or Reset pending |
| 27 | Click "Resend invite" | Invite pending row | Button shows "Sending..."; a toast "Invite sent again to <email>"; the button then shows "Sent" and is disabled; the invitee receives the email |
| 28 | Click it again straight away for the same person | Same | Cannot (disabled); by API a second call within a minute is refused by the email provider with its own message, shown as a toast |
| 29 | Resend by API for someone who already has a password | `POST /api/admin/account-activity/resend-invite` | `400` "This person has already set a password. They can use Forgot password instead." and no email is sent |
| 30 | Resend as HR or Employee by API | Non-Admin session | `403` |
| 31 | Resend with a missing or invalid id | `{}` / `{"user_id":"abc"}` | `400` "user_id is required" |
| 32 | Resend for an id that does not exist | Random valid UUID | `404` "Employee not found" |
| 33 | Resend repeatedly | 12+ requests in 10 seconds | `429` (when Redis is configured) |
| 34 | Check what a resend writes | After a successful resend | An "Invite resent" event in Activity, and an Audit Log entry `Resent the invite email to <name> (<email>)` |
| 35 | Use the table at 375px width | Phone viewport | The table scrolls sideways inside its own container; the page itself does not |

## Activity tab: what gets recorded

> Open the Activity tab after each action. Newest events are first; each row shows when, the event, the
> person's email, details, and where it came from (IP; hover for the browser).

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 36 | Someone submits the access request form | `/signup` as a visitor | "Requested access" with their email, the name as detail, and their IP |
| 37 | Admin approves the request | Review in Employees | "Access approved" (detail "Approved by <admin>") followed by "Invite sent" (detail "Invite sent after <admin> approved the request") |
| 38 | Admin rejects a request | Review in Employees | "Access rejected" (detail "Rejected by <admin>") and no invite |
| 39 | Admin or HR adds an employee directly | Employees, Add | "Invite sent" (detail "Invited by <name>") |
| 40 | The invitee sets their first password | Via the email link | "Set first password" |
| 41 | An existing employee asks to reset | "Forgot password?" with their email | "Asked to reset password" |
| 42 | They complete the reset | Via the email link | "Reset password" (not "Set first password") |
| 43 | Someone enters an email nobody has registered | "Forgot password?" with an unknown address | "Reset asked for unknown email", highlighted in red with a warning icon, and the address they typed |
| 44 | An employee changes their password in Settings | Settings, Change password | "Changed password" |
| 45 | An invite email fails to send | Simulated provider error | **No** "Invite sent" event is written (an event means it really happened) |
| 46 | A rejected or invalid action | E.g. an invalid reset request | No event is written |
| 47 | Check that nothing sensitive is recorded | Read every event | Only email, a short detail, IP, and browser: never a password, token, or reset link |
| 48 | Events use the right time | Compare with the clock | Times are shown relative ("5 minutes ago") with the exact Bangladesh time on hover |

## Activity tab: filtering and paging

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 49 | Filter by event type | Pick "Asked to reset password" | Only those events; "All events" restores everything |
| 50 | Search by email | Part of an address | Matching events after a short pause; the clear (X) button resets it |
| 51 | Search for text containing `%` or `_` | "50%" | Treated as plain characters, not wildcards |
| 52 | Combine a type and a search | Both | Both apply |
| 53 | Scroll past the first page | More than 25 events | A "Show older" button loads the next 25 without repeating any; it disappears at the end |
| 54 | Type quickly in the search box | Several characters in a row | Only the final search's results are shown (an earlier slow response never overwrites a later one) |
| 55 | No events yet / no match | Fresh database / odd filter | "Nothing has happened yet." / "No events match." |
| 56 | Ask for an unknown event type by API | `?type=hacked` | Ignored (returns the unfiltered list), never an error or injection |

## Retention and lifecycle

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 57 | Run the daily cleanup job with the correct secret | `GET /api/cron/audit-log-cleanup` with the bearer token | The response includes `authEventsDeleted`; events older than 90 days are removed, newer ones stay |
| 58 | Compare with the Audit Log | An event 20 days old | Gone from the Audit Log (10 days) but still on this page (90 days) |
| 59 | Delete an employee whose account has events | Disposable account | Their events remain, showing the email as it was, so the history outlives the account |
| 60 | Run Clear Database as the System Admin | See `07-settings-danger-zone.md` | This security trail is **not** wiped (it is not HR data, and the wipe is not meant to erase an audit trail) |

## Privacy and appearance

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 61 | Confirm only Admin ever sees IP addresses and browsers | HR/Employee | They cannot reach any of it (cases 3, 5, 6) |
| 62 | Use the page in dark mode | Dark theme | Tiles, badges, the red stale/attention styling, and tables stay readable |
| 63 | Use the page on a phone | 375px width | Tiles stack, filter chips scroll sideways, and the tabs and search fit without sideways page scroll |
| 64 | Use the keyboard | Tab through the page | Tabs, chips, search, and buttons all take focus with a visible ring |
| 65 | The page fails to load Supabase Auth data | Simulated error | A friendly "Couldn't load account activity right now" message instead of a crash |
