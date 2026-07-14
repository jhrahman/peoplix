# Test Cases — Settings, Danger Zone & Delete Account

App URL: https://peoplix-hr.vercel.app/settings

## Profile settings

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Settings page | Any valid account | "Your profile" card shows Email (read-only), Full name, Department, Designation, and Phone fields |
| 2 | Attempt to edit the Email field | Click into the Email input | Field is disabled, shows a "Email can't be changed." note, and cannot be edited from this page |
| 3 | Update the Department field and click "Save changes" | Department: "Updated Test Department" | Value is saved and persists after a page refresh |
| 3a | Update the Designation field and click "Save changes" | Designation: "Updated Test Title" | Value is saved and persists after a page refresh |
| 4 | Update the Full name field and click "Save changes" | Full name: "Updated Test Name" | Confirmation of save (page reflects new name); sidebar/navbar display name updates to match |
| 5 | Update the Phone field and click "Save changes" | Phone: "+8801XXXXXXXXX" (test value) | Value is saved and persists after a page refresh |
| 6 | Clear the required Full name field entirely and try to save | Full name: (blank) | Browser's required-field validation blocks submission |
| 7 | Log in as a different role (Employee, HR, Admin) and open Settings | Each role in turn | All three roles can view and edit their own profile identically (including Department/Designation); no role-specific profile fields differ |
| 7a | Resize the browser to a mobile width (e.g. 375px) while on Settings | Viewport resize | Department/Designation fields stack into a single column (from a two-column layout on wider screens); no overlapping content or horizontal scroll |

## Change password

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 7b | Open the "Change password" card | Any valid account | Card shows New password and Confirm password fields and an "Update password" button; no current-password field is required since the user already has an active session |
| 7c | Submit a new password shorter than 8 characters | New password: "abc123" | Inline error: "Password must be at least 8 characters."; no request is sent |
| 7d | Submit mismatched New password / Confirm password values | New password: "TestPass123", Confirm: "TestPass124" | Inline error: "Passwords don't match."; no request is sent |
| 7e | Submit matching, valid-length passwords | New password/Confirm: "TestPass123" (8+ chars, matching) | Button shows "Updating..." while in flight, then a success toast ("Password updated."); both fields clear |
| 7f | Log out and log back in using the new password | Email + newly set password | Login succeeds with the new password |

## Danger Zone — visibility & access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 8 | Log in as an Employee and scroll to the Danger Zone section | Valid Employee account | "Clear Database" button is visible but disabled; hovering shows an "Admin only" tooltip |
| 9 | Log in as HR and view the Danger Zone section | Valid HR account | "Clear Database" button is disabled with the same "Admin only" tooltip |
| 10 | Log in as Admin and view the Danger Zone section | Valid Admin account | "Clear Database" button is enabled and clickable |
| 11 | As a non-admin, attempt to trigger the clear-database API directly (e.g. via dev tools/API client) | Employee or HR session token | Server rejects the request (403/401), independent of the disabled UI button |

## Danger Zone — clearing data

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | As Admin, click "Clear Database" | N/A | Confirmation dialog opens warning that leave requests, balances, holidays, attendance, and overtime records will be permanently deleted, and that accounts are never touched |
| 13 | In the confirmation dialog, leave the confirmation input empty and try to confirm | Confirmation input: (blank) | "Clear Database" action button in the dialog remains disabled |
| 14 | Type an incorrect confirmation phrase | Input: "delete all data" (wrong case) or "DELETE" (incomplete) | Action button remains disabled; phrase must match exactly |
| 15 | Type the exact required phrase "DELETE ALL DATA" | Input: `DELETE ALL DATA` | Action button becomes enabled |
| 16 | Click "Cancel" instead of confirming | N/A | Dialog closes; no data is deleted; confirmation input resets |
| 17 | Confirm the clear-database action with the correct phrase | Confirm click | All leave requests, leave balances, holidays, attendance, and overtime records are deleted; Employee/HR/Admin accounts and profiles remain fully intact and able to log in |
| 18 | After clearing, revisit the Dashboard, Leave, Holidays, Attendance, and Overtime pages | N/A | Each page shows correct empty states (no stale data, no errors) rather than leftover cached records |
| 19 | After clearing, use "Generate default BD holidays" on the Holidays page to recover | N/A | Default holiday set is restored successfully |
| 20 | Trigger "Clear Database" a second time immediately after a successful clear | Repeat steps 12–17 | Operation completes without error even with already-empty tables (idempotent) |

## Delete Account — visibility & confirmation

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 21 | Log in as an Employee and scroll to the "Delete Account" section | Valid Employee account | "Delete Account" button is visible and enabled (unlike Clear Database, this is not Admin-only) |
| 22 | Log in as HR or Admin and view the "Delete Account" section | Valid HR/Admin account | Button is equally visible and enabled for every role |
| 23 | Click "Delete Account" | N/A | Confirmation dialog opens warning that the account and all associated data (leave requests, balances, attendance, overtime records) will be permanently deleted |
| 24 | In the confirmation dialog, leave the confirmation input empty and try to confirm | Confirmation input: (blank) | "Delete Account" action button in the dialog remains disabled |
| 25 | Type an incorrect confirmation phrase | Input: "delete my account" (wrong case) or "DELETE" (incomplete) | Action button remains disabled; phrase must match exactly |
| 26 | Type the exact required phrase "DELETE MY ACCOUNT" | Input: `DELETE MY ACCOUNT` | Action button becomes enabled |
| 27 | Click "Cancel" instead of confirming | N/A | Dialog closes; account is not deleted; confirmation input resets |

## Delete Account — deleting the account

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 28 | Confirm deletion with the correct phrase | Use a disposable test account (not a protected/seed account) | Action button shows "Deleting Account..." while in flight; on success the browser is redirected to `/login` |
| 29 | Attempt to log back in with the deleted account's credentials | Same email/password used in step 28 | Login fails — the account no longer exists |
| 30 | As Admin, check the Employees list after another role's account self-deletes | N/A | The deleted account no longer appears in the Employees directory (profile row cascaded on delete) |
| 31 | Confirm cascade cleanup after a self-delete | Account had leave requests, attendance, and/or overtime records before deleting | Those records no longer appear anywhere (e.g. staff "all" views) — deleted via `on delete cascade`, not left orphaned |
| 32 | Attempt to trigger `DELETE /api/account` directly without a session (e.g. via dev tools/API client, logged out) | No session/cookie | Server rejects the request (`401`) |
| 33 | Log in as a protected account (see `lib/protected-employees.ts`) and attempt self-deletion | Protected account's session | Server rejects the request (`403`), independent of the client-side dialog |
