# Test Cases — Settings & Danger Zone

App URL: https://peoplix-hr.vercel.app/settings

## Profile settings

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Settings page | Any valid account | "Your profile" card shows Email (read-only), Full name, Phone, and Department (read-only) fields |
| 2 | Attempt to edit the Email field | Click into the Email input | Field is disabled and cannot be changed from this page |
| 3 | Attempt to edit the Department field | Click into the Department input | Field is disabled and cannot be changed from this page |
| 4 | Update the Full name field and click "Save changes" | Full name: "Updated Test Name" | Confirmation of save (page reflects new name); sidebar/navbar display name updates to match |
| 5 | Update the Phone field and click "Save changes" | Phone: "+8801XXXXXXXXX" (test value) | Value is saved and persists after a page refresh |
| 6 | Clear the required Full name field entirely and try to save | Full name: (blank) | Browser's required-field validation blocks submission |
| 7 | Log in as a different role (Employee, HR, Admin) and open Settings | Each role in turn | All three roles can view and edit their own profile identically; no role-specific profile fields differ |

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
| 12 | As Admin, click "Clear Database" | N/A | Confirmation dialog opens warning that leave requests, balances, holidays, and attendance will be permanently deleted, and that accounts are never touched |
| 13 | In the confirmation dialog, leave the confirmation input empty and try to confirm | Confirmation input: (blank) | "Clear Database" action button in the dialog remains disabled |
| 14 | Type an incorrect confirmation phrase | Input: "delete all data" (wrong case) or "DELETE" (incomplete) | Action button remains disabled; phrase must match exactly |
| 15 | Type the exact required phrase "DELETE ALL DATA" | Input: `DELETE ALL DATA` | Action button becomes enabled |
| 16 | Click "Cancel" instead of confirming | N/A | Dialog closes; no data is deleted; confirmation input resets |
| 17 | Confirm the clear-database action with the correct phrase | Confirm click | All leave requests, leave balances, holidays, and attendance records are deleted; Employee/HR/Admin accounts and profiles remain fully intact and able to log in |
| 18 | After clearing, revisit the Dashboard, Leave, Holidays, and Attendance pages | N/A | Each page shows correct empty states (no stale data, no errors) rather than leftover cached records |
| 19 | After clearing, use "Generate default BD holidays" on the Holidays page to recover | N/A | Default holiday set is restored successfully |
| 20 | Trigger "Clear Database" a second time immediately after a successful clear | Repeat steps 12–17 | Operation completes without error even with already-empty tables (idempotent) |
