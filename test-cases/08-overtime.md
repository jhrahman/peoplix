# Test Cases — Overtime Page

App URL: https://peoplix-hr.vercel.app/overtime

## Summary widgets

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Overtime page | Any valid account | Three summary cards are shown: "Pending review", "Approved this month", "Rejected" |
| 2 | View the "Approved this month" card after an entry is approved in the current month | Account with an approved overtime entry dated this month | Card shows the correct total hours for approved entries in the current calendar month only (Bangladesh Standard Time) |
| 3 | View the "Pending review" card with entries awaiting review | Account with 1+ pending overtime entries | Card shows the correct pending count |

## Log overtime

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 4 | Click "Log overtime" | N/A | Dialog opens with Date field, Hours dropdown, optional Reason field |
| 5 | Open the Hours dropdown | N/A | Values are listed in 0.5-hour steps (0.5, 1, 1.5, 2, ... up to 12) |
| 6 | Hover/click the ℹ️ info icon next to "Hours" | N/A | Tooltip displays: "Minimum 0.5 hours, in 30-minute increments." |
| 7 | Attempt to pick a Date field value later than today via the date picker | Try selecting a future date | Date input's max is capped at today; a future date cannot be selected through the picker |
| 8 | Submit with Date and Hours filled, Reason left blank | Date: today, Hours: 1, Reason: (blank) | Entry submits successfully since Reason is optional |
| 9 | Submit a valid entry | Date: today, Hours: 2, Reason: "Server migration support" | Dialog closes; new row appears in "My overtime entries" table with status "Pending" |
| 10 | Submit a second overtime entry for the same date already logged | Same Date as an existing entry for this account | Submission is rejected with an error like "You already logged overtime for that date." |
| 11 | Submit an entry for a date more than a day in the future via direct API manipulation (bypassing the UI cap) | date > today | Server rejects with "Cannot log overtime for a future date" |

## My overtime entries

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | View "My overtime entries" table with existing entries | Account with 1+ logged entries | Table lists Date, Hours, Reason, Status (Pending/Approved/Rejected badge), and an Actions column |
| 13 | View "My overtime entries" table for a brand-new account | Freshly created employee, no entries | Table shows "No overtime entries yet." |
| 14 | Click "Cancel" on a Pending entry | Select a pending entry | Entry is removed from the table |
| 15 | Check for a "Cancel" action on an Approved or Rejected entry | Entry with status Approved or Rejected | No "Cancel" action is available for non-pending entries |

## Approvals (Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 16 | Log in as an Employee and check for a "Pending approvals" section | Valid Employee account | Section is not visible anywhere on the page |
| 17 | Log in as HR and check for a "Pending approvals" section | Valid HR account | Section is **not** visible — unlike Leave approvals, HR cannot approve overtime |
| 18 | Log in as Admin with pending overtime entries from other employees | Valid Admin account | "Pending approvals" card is visible, listing Employee name, Date, Hours, Reason, and Approve/Reject buttons |
| 19 | As Admin, click "Approve" on a pending entry | Select a pending entry | Entry status changes to "Approved"; it disappears from the Approvals table; the owning employee's "Approved this month" figure updates accordingly (if dated this month) |
| 20 | As Admin, click "Reject" on a pending entry | Select a pending entry | Entry status changes to "Rejected"; it disappears from the Approvals table |
| 21 | As HR, attempt to call the approve/reject API directly (e.g. via dev tools/API client) | HR session, `PATCH /api/overtime/{id}` with `{ "status": "approved" }` | Server rejects with `403 Forbidden` — only Admin may approve, enforced server-side, not just hidden in the UI |
| 22 | As Admin, attempt to approve/reject the same entry twice in quick succession (double-click) | Rapid double-click on Approve | Only one status transition occurs |
| 23 | As Admin, attempt to review an already-approved or already-rejected entry | Entry with status not "pending" | Request is rejected with "Only pending requests can be reviewed" |

## Dashboard integration

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 24 | Open the Dashboard after logging overtime | Any valid account with logged entries | "Overtime this month" stat tile shows approved hours for the current month, with sublabel showing pending count if any exist |
| 25 | Open the Dashboard as Admin with pending overtime entries | Valid Admin account | An additional "Overtime approvals" stat tile shows the count of entries awaiting review across all employees |
| 26 | Open the Dashboard as HR with pending overtime entries | Valid HR account | No "Overtime approvals" stat tile is shown to HR (Admin-only tile) |
