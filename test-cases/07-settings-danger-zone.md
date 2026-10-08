# Test Cases — Settings, Danger Zone & Delete Account

App URL: https://peoplix-hr.vercel.app/settings

## Profile settings

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Settings page | Any valid account | "Your profile" card shows Email (read-only), Full name, Department, Designation, and Mobile fields |
| 2 | Attempt to edit the Email field | Click into the Email input | Field is disabled, shows a "Email can't be changed." note, and cannot be edited from this page |
| 3 | Update the Department field and click "Save changes" | Department: "Updated Test Department" | Value is saved and persists after a page refresh |
| 3a | Update the Designation field and click "Save changes" | Designation: "Updated Test Title" | Value is saved and persists after a page refresh |
| 4 | Update the Full name field and click "Save changes" | Full name: "Updated Test Name" | Confirmation of save (page reflects new name); sidebar/navbar display name updates to match |
| 5 | Update the Mobile field and click "Save changes" | Mobile: "+8801XXXXXXXXX" (test value) | Value is saved and persists after a page refresh |
| 5a | Type letters into the Mobile field | Mobile: "abc123" | Non-digit characters (other than a leading "+") are stripped as typed; the field's native validation bubble shows "Only numbers are allowed" |
| 6 | Clear the required Full name field entirely and try to save | Full name: (blank) | Browser's required-field validation blocks submission |
| 7 | Log in as a different role (Employee, HR, Admin) and open Settings | Each role in turn | All three roles can view and edit their own profile identically (including Department/Designation); no role-specific profile fields differ |
| 7a | Resize the browser to a mobile width (e.g. 375px) while on Settings | Viewport resize | Department/Designation fields stack into a single column (from a two-column layout on wider screens); no overlapping content or horizontal scroll |

## Profile photo

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 7h | Open Settings with no photo set | Account with `avatar_url` unset | "Profile photo" card sits beside "Your profile" (below it on narrow/mobile widths), showing a rounded initials placeholder and an "Upload photo" button |
| 7i | Select a valid image under 1MB | A `.png`, `.jpg`/`.jpeg`, or `.webp` file under 1MB | A round-crop dialog opens showing the selected image with a zoom slider |
| 7j | Attempt to select a file over 1MB | Any image file larger than 1MB | Selection is rejected with an error toast; no crop dialog opens |
| 7k | Attempt to select a non-image file (or unsupported image type) | e.g. a `.pdf` or `.gif` | Selection is rejected with an error toast naming the accepted formats; no crop dialog opens |
| 7l | In the crop dialog, drag to reposition and use the zoom slider, then click "Save photo" | Any valid image from 7i | Dialog closes; avatar updates to the cropped photo; success toast ("Profile photo updated."); button label switches to "Change photo" and a "Delete photo" option appears |
| 7m | Cancel out of the crop dialog instead of saving | Click "Cancel" mid-crop | Dialog closes; no photo is uploaded; the previous avatar/placeholder is unchanged |
| 7n | After a successful upload, check the navbar user menu and the Team Directory listing for this account | Same account | The new photo appears in both places (not just the Settings page) without a manual page refresh |
| 7o | Click "Change photo" on an account that already has one set | Select a new valid image | New crop dialog opens; saving replaces the existing photo (same behavior as 7l) |
| 7p | Click "Delete photo" on an account with a photo set | N/A | Button shows a spinner and "Deleting..." while in flight; on success, avatar reverts to the initials placeholder, "Delete photo" disappears, and a success toast appears ("Profile photo deleted.") |
| 7q | Confirm the delete synced correctly | Same account, after 7p | Navbar and Team Directory both show the initials placeholder again without a manual refresh; refreshing the Settings page also shows no photo (persisted, not just local UI state) |
| 7r | Check the Audit Log after uploading and after deleting a photo | See [`11-audit-log.md`](11-audit-log.md) | Two separate entries appear: "Updated profile photo" and "Removed profile photo" |
| 7s | Log in as a different role (Employee, HR, Admin) | Each role in turn | Upload/change/delete all work identically for every role — profile photo is not gated by role |
| 7t | Resize the browser to a mobile width (e.g. 375px) on Settings | Viewport resize | "Profile photo" card renders directly below "Your profile" (not pushed after Change password/other cards), full-width and centered, matching the rest of the mobile layout |

## Change password

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 7b | Open the "Change password" card | Any valid account | Card shows New password and Confirm password fields and an "Update password" button; no current-password field is required since the user already has an active session |
| 7c | Submit a new password shorter than 8 characters | New password: "abc123" | Inline error: "Password must be at least 8 characters."; no request is sent |
| 7d | Submit mismatched New password / Confirm password values | New password: "TestPass123", Confirm: "TestPass124" | Inline error: "Passwords don't match."; no request is sent |
| 7e | Submit matching, valid-length passwords | New password/Confirm: "TestPass123" (8+ chars, matching) | Button shows "Updating..." while in flight, then a success toast ("Password updated."); both fields clear |
| 7f | Log out and log back in using the new password | Email + newly set password | Login succeeds with the new password |
| 7g | Check the Audit Log after changing your password from Settings | See [`11-audit-log.md`](11-audit-log.md) | A password-update entry appears, attributed to your own account |

## Danger Zone — visibility & access control

The Danger Zone is restricted to a single, hardcoded **System Admin** account
(`lib/protected-employees.ts` → `isSystemAdmin()`), not every account with `role = admin`.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 8 | Log in as an Employee and open Settings | Valid Employee account | No Danger Zone section appears anywhere on the page — not visible, not disabled, not in the page DOM at all |
| 9 | Log in as HR and open Settings | Valid HR account | Same as above — no Danger Zone section |
| 9a | Log in as an Admin account that is **not** the designated System Admin | An Admin-role account whose email isn't the System Admin's | Same as above — no Danger Zone section, even though the role is Admin |
| 10 | Log in as the designated System Admin account and view Settings | The System Admin's account | Danger Zone section is visible with an enabled "Clear Database" button |
| 11 | As any non-System-Admin account, attempt to trigger the clear-database API directly (e.g. via dev tools/API client) | Employee, HR, or a non-System-Admin Admin session token | Server rejects the request (`403`/`401`) independent of the UI — the route checks `role === 'admin'` first, then separately checks the account is the System Admin |

## Danger Zone — clearing data

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | As the System Admin, click "Clear Database" | N/A | Confirmation dialog opens warning that leave requests, balances, holidays, attendance, overtime records, and every engagement post, comment, and reaction will be permanently deleted, and that accounts are never touched |
| 13 | In the confirmation dialog, leave the confirmation input empty and try to confirm | Confirmation input: (blank) | "Clear Database" action button in the dialog remains disabled |
| 14 | Type an incorrect confirmation phrase | Input: "delete all data" (wrong case) or "DELETE" (incomplete) | Action button remains disabled; phrase must match exactly |
| 15 | Type the exact required phrase "DELETE ALL DATA" | Input: `DELETE ALL DATA` | Action button becomes enabled |
| 16 | Click "Cancel" instead of confirming | N/A | Dialog closes; no data is deleted; confirmation input resets |
| 17 | Confirm the clear-database action with the correct phrase | Confirm click | All leave requests, leave balances, holidays, attendance, and overtime records are deleted — including attendance history belonging to **other** employees, not just the System Admin's own — accounts and profiles remain fully intact and able to log in |
| 18 | After clearing, revisit the Dashboard, Leave, Holidays, Attendance, Overtime, and Engagement pages | N/A | Each page shows correct empty states for holidays/attendance/overtime and for the Engagement feed and announcements (no stale data, no errors); the Leave page's "All balances" table shows every current employee with a fresh 10/14/15 balance immediately, not an empty table |
| 18b | Before clearing, create posts, comments, reactions, a poll with votes, and a post with photos and a video | Several engagement items from different accounts, including uploaded files | After Clear Database, `/engagement` is empty, related notifications are gone, and the uploaded files no longer exist in the `post-images` and `post-videos` Storage buckets (the cleanup covers files, not only database rows) |
| 18a | Before clearing, note an attendance history entry belonging to an employee other than the System Admin | e.g. another employee's past check-in/out row | After confirming Clear Database, that row is gone too — not just the System Admin's own **today's** row (attendance's normal delete rule only allows deleting your own today's row, but this action is exempt from that since it uses a service-role bypass) |
| 19 | After clearing, use "Generate default BD holidays" on the Holidays page to recover | N/A | Default holiday set is restored successfully |
| 20 | Trigger "Clear Database" a second time immediately after a successful clear | Repeat steps 12–17 | Operation completes without error even with already-empty tables (idempotent) |

## Audit Log Cleanup — visibility & access control

Unlike Danger Zone, this is gated to **any** Admin account (`role = admin`), not narrowed to the
System Admin — clearing log history is lower-stakes than wiping operational data. For the Audit Log
page itself (viewing, search, date filter, retention), see
[`11-audit-log.md`](11-audit-log.md).

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 20a | Log in as an Employee or HR and open Settings | Valid Employee/HR account | No "Audit Log Cleanup" section appears |
| 20b | Log in as any Admin (including a non-System-Admin one) and open Settings | Any Admin-role account | "Audit Log Cleanup" section is visible with a "Delete All Audit Logs" button — unlike Danger Zone, this does not require being the System Admin |
| 20c | Click "Delete All Audit Logs" | N/A | Confirmation dialog opens warning that all audit log entries for every employee will be permanently deleted, and that it doesn't affect leave/overtime/attendance/employee records |
| 20d | Click "Cancel" instead of confirming | N/A | Dialog closes; no logs are deleted |
| 20e | Confirm the deletion | Confirm click | Button shows "Deleting..." while in flight; on success, the Audit Log page shows no entries for any employee |
| 20f | As a non-Admin, attempt to trigger the clear-audit-logs API directly (e.g. via dev tools/API client) | Employee or HR session token | Server rejects the request (`403`/`401`), independent of the UI |

## Delete Account — visibility & confirmation

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 21 | Log in as an Employee and scroll to the "Delete Account" section | Valid Employee account | "Delete Account" button is visible and enabled (unlike Clear Database, this is not Admin-only) |
| 22 | Log in as HR or Admin and view the "Delete Account" section | Valid HR/Admin account | Button is equally visible and enabled for every role |
| 23 | Click "Delete Account" | N/A | Confirmation dialog opens warning that the account and all associated data (leave requests, balances, attendance, overtime records) will be permanently deleted, along with their posts, comments, and reactions |
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
| 31a | Confirm engagement cleanup after a self-delete | Account had posts, comments, reactions, poll votes, notifications, and uploaded photos/videos | Their posts and comments disappear from `/engagement`, their reactions and votes are removed from the counts, notifications involving them are gone, and their files are removed from the `post-images` and `post-videos` Storage buckets |
| 32 | Attempt to trigger `DELETE /api/account` directly without a session (e.g. via dev tools/API client, logged out) | No session/cookie | Server rejects the request (`401`) |
| 33 | Log in as a protected account (see `lib/protected-employees.ts`) and attempt self-deletion | Protected account's session | Server rejects the request (`403`), independent of the client-side dialog |

## Birthday (date of birth)

> Privacy is the point of this section: the date of birth is stored in its own table that only its
> owner can read. Teammates only ever see the day and month, never the year, and only while sharing
> is on. See [`12-engagement.md`](12-engagement.md) § Birthdays & wishes for how it is used.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 34 | Open Settings as each role | Employee, HR, Admin | A "Birthday" card is present for every role, with a date field, a "Let teammates celebrate my birthday" checkbox (ticked by default), a privacy note, and a disabled "Save birthday" button |
| 35 | Open the date picker | Click the date field | Dates later than today cannot be chosen; dates before 1900 cannot be chosen |
| 36 | Pick a valid date of birth and save | e.g. 1994-03-15 | Button shows "Saving..."; toast "Birthday saved."; the button becomes disabled again (nothing left to save) and a "Remove" button appears |
| 37 | Reload Settings | After saving | The saved date and checkbox state are still shown |
| 38 | Change only the checkbox and save | Untick sharing | "Save birthday" enables on the change; saving succeeds; the date is unchanged |
| 39 | Try to save a date in the future by API or by editing the form | Tomorrow's date | Rejected with "Date of birth can't be in the future" |
| 40 | Try to save an implausible age | Date making the person 10 or 150 years old | Rejected with "Enter a valid date of birth" |
| 41 | Click "Remove" | After saving | Toast "Birthday removed."; the field empties, the checkbox returns to ticked, and the "Remove" button disappears |
| 42 | Check the Team Directory after saving a birthday | Any role, `/directory` | No date of birth, age, or birthday appears anywhere in the table or its search results |
| 43 | Check the Employees page and `GET /api/employees` after saving a birthday | Admin/HR | No date of birth appears in the list, the edit dialog, or the API response |
| 44 | Read another person's birthday through the database REST endpoint | `GET /rest/v1/employee_birthdays` with a different employee's token | Only your own row is returned; other people's rows are never visible, even to Admin or HR |
| 45 | Try to write someone else's birthday through the database REST endpoint | `POST`/`PATCH` with another `employee_id` | Rejected by Row Level Security |
| 46 | Check that no profile response includes a birthday | `GET /api/auth/me`, `GET /api/employees/{id}`, the Directory page source | None of them contain `date_of_birth` |
| 47 | Save a birthday, then check the Audit Log | `/audit-log` | An entry "Updated their date of birth" is recorded; the date itself is never written to the log |
| 48 | Remove a birthday, then check the Audit Log | `/audit-log` | An entry "Removed their date of birth" is recorded |
| 49 | Delete the account of someone who set a birthday | Disposable account | Their birthday row is removed with the account |

## Joining date

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 50 | Open Settings as each role | Employee, HR, Admin | "Your profile" shows a "Joining date" field with the current date, below Department/Designation |
| 51 | Read the note under the field | N/A | It says to ask HR for the confirmed joining date and that anniversaries and the 3, 5 and 10 year milestones are counted from it |
| 52 | Open the date picker | Click the field | Dates in the future cannot be chosen; dates before 1970 cannot be chosen |
| 53 | Change the date and click "Save changes" | e.g. 2021-03-15 | Toast "Profile updated."; reloading Settings shows the new date; the Dashboard role card shows it too |
| 54 | Save without changing the joining date | Edit another field only | Joining date unchanged and no joining-date audit entry |
| 55 | Clear the field and save | Empty date | The browser blocks the submit (the field is required) |
| 56 | Try a future date by editing the form or calling the action directly | Tomorrow | Rejected with "Joining date can't be in the future" |
| 57 | Try an implausible date | 1900-01-01 or "abc" | Rejected with "Enter a valid joining date" |
| 58 | Check the Audit Log after changing it | `/audit-log` | Entry "Updated their joining date from <old> to <new>" |
| 59 | See the effect on Celebrations | Set exactly 5 years ago | The Engagement page lists a 5-year milestone for you (see `12-engagement.md` rows 260 to 265) |
| 60 | HR or Admin edits the same person on the Employees page | Staff session | Unaffected by this change; both can still manage employees as before |

## Role protection

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 61 | As an Employee, try to change your own role through the database REST endpoint | `PATCH /rest/v1/profiles?id=eq.<you>` with `{ "role": "admin" }` | Rejected with an error ("Only HR or Admin can change a role"); the role is unchanged |
| 62 | As an Employee, update your name and phone the normal way | Settings form | Still works (only role changes are blocked) |
| 63 | As HR/Admin, change an employee's role from the Employees page | Staff session | Still works as before

## Clear Database and celebration data

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 64 | Before clearing, create wishes, card comments (one with a photo), and card reactions on a few cards | Several accounts | Data exists on the cards |
| 65 | Run Clear Database as the System Admin | Confirm | Wishes, card comments, card reactions, and all notifications are gone; the Celebrations list still shows who is celebrating (that comes from profiles) but every card is empty |
| 66 | Check Storage afterwards | `comment-images`, `comment-videos`, `post-images`, `post-videos` buckets | The photos and clips from post comments and card comments are removed as well as post attachments |
| 67 | Check that birthdays survive | Settings → Birthday of an employee who saved one | Dates of birth are personal profile data, not engagement content, so they are **not** cleared |
