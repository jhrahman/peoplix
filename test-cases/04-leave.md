# Test Cases — Leave Page

App URL: https://peoplix-hr.vercel.app/leave

## Leave balance display

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in and open the Leave page | Any valid account | Leave balance cards display for Casual, Sick, and Annual leave types with remaining/total days |
| 2 | Log in as a brand-new employee with no leave usage | Freshly created account | Balance cards show full allotment for each leave type (no negative values, no errors) |

## Apply for leave

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 3 | Click "Apply for leave" | N/A | Dialog opens with Leave type dropdown (Casual/Sick/Annual), Start date, End date (calendar popovers), and optional Reason field |
| 4 | Submit with Start date and End date left empty | Dates: (blank) | Submit button is disabled until both dates are picked; attempting to submit anyway shows "Start date and end date are required" |
| 5 | Open the Start date calendar with an End date already picked (or vice versa) | Start: (picker), End: 2026-08-05 already set | Any day after the picked End date is greyed out and cannot be selected in the Start date calendar (and mirrored for End date against Start date) — an invalid range can't be picked in the first place |
| 5a | Open either the Start date or End date calendar | N/A | Every Saturday and Sunday is greyed out and cannot be selected — leave can only start/end on a weekday |
| 6 | Select a valid single-day range | Start: 2026-08-10 (Mon), End: 2026-08-10 (Mon) | Helper text reads "1 day of leave" |
| 7 | Select a valid multi-day range spanning a weekend | Start: 2026-08-10 (Mon), End: 2026-08-14 (Fri) | Helper text reads "5 days of leave" — Saturday/Sunday within the range are excluded from the count |
| 8 | Submit a valid leave request within available balance | Leave type: Casual, valid date range, Reason: "Family event" | Dialog closes; new row appears in "My leave requests" table with status "Pending" |
| 9 | Submit a leave request that exceeds the remaining balance for that leave type | Leave type with 0 or few days left, request exceeding remaining days | Request is either rejected with a clear error message or flagged for review — verify actual product behavior (balance should never go negative without explicit approval) |
| 10 | Submit a leave request with the Reason field left blank | Reason: (blank) | Request is submitted successfully since Reason is optional |
| 11 | Submit two overlapping leave requests for the same employee | Two requests with overlapping date ranges | Verify whether the system allows, warns, or blocks overlapping requests (document actual behavior) |
| 12 | View "My leave requests" table after submitting multiple requests | 2+ submitted requests | Table lists all requests with type, dates, day count, and current status, most recent first |

## Edit / override a pending request

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 13 | Hover over the edit (pencil) icon on a pending request | Mouse hover | Cursor displays as a pointer/hand, not the default arrow |
| 14 | Click the edit (pencil) icon on a Pending request | Select a pending request | Dialog opens titled "Edit leave request" with Leave type, Start date, End date, and Reason pre-filled with the request's current values |
| 15 | Check for an edit (pencil) icon on an Approved or Rejected request | Request with status Approved or Rejected | No edit icon is shown — only Pending requests can be edited |
| 16 | Change the Leave type and Reason in the edit dialog, then save | Leave type: Sick (was Casual), Reason: "Corrected — actually sick leave" | Dialog closes; the same row updates in place with the new type and reason, status remains "Pending" |
| 17 | Change the Start/End dates in the edit dialog to fix a typo, then save | Start: 2026-08-11 (was 2026-08-10) | Row updates with the corrected dates and recalculated (weekday-only) day count |
| 18 | Clear the Start/End dates in the edit dialog and try to save | Dates: (blank) | Save button is disabled until both dates are set again |
| 19 | Attempt to edit another employee's leave request via direct API call (bypassing the UI) | `PATCH /api/leave/{id}` with an edit-shaped body, using a different employee's request id | Server rejects with `403 Forbidden` ("You can only edit your own requests") |
| 20 | Attempt to edit a request after it has been Approved or Rejected via direct API call | `PATCH /api/leave/{id}` with an edit-shaped body, on an already-reviewed request | Server rejects with "Only pending requests can be edited" |
| 21 | Open the edit dialog, then click outside/close without saving | N/A | No changes are applied; row remains as it was before opening |

## Cancel a pending request

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 21a | Click "Cancel" on a Pending request | Select a pending request | Button shows "Cancelling..." and stays disabled until the row is confirmed removed from the table — it never flashes back to "Cancel" for a moment before the row disappears |
| 21b | Check for a "Cancel" action on an Approved or Rejected request | Request with status Approved or Rejected | No "Cancel" action is available for non-pending requests |
| 21c | Attempt to cancel another employee's pending request via direct API call | `DELETE /api/leave/{id}` on a different employee's pending request, as a plain Employee | Server rejects (`404` — "not yours, or no longer pending"), independent of the UI |
| 21d | As HR/Admin, cancel an employee's pending request from the Approvals view (if supported) | Select a pending request belonging to another employee | Request is removed; the owning employee's "My leave requests" table no longer shows it |

## Approvals (HR/Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 13 | Log in as an Employee and check for an "Approvals" section | Valid Employee account | Approvals section is not visible/present on the page |
| 14 | Log in as HR or Admin with at least one pending request | Valid HR/Admin account | "Approvals" table is visible listing all pending requests across all employees with employee name, type, dates, days, and reason |
| 15 | Click "Approve" on a pending request | Select a pending request | Request status changes to "Approved"; it disappears from the Approvals table; the requesting employee's leave balance decreases by the correct number of days |
| 16 | Click "Reject" on a pending request | Select a pending request | Request status changes to "Rejected"; it disappears from the Approvals table; the employee's leave balance remains unchanged |
| 17 | View "My leave requests" as the employee after their request was approved | Employee whose request was just approved | Status shown as "Approved" in the employee's own table |
| 18 | Attempt to approve/reject the same request twice in quick succession (double-click) | Rapid double-click on Approve | Only one status transition occurs; balance is not double-deducted |
| 19 | View "All balances" card as HR/Admin | Valid HR/Admin account | Card lists every employee's leave balances for the current year, correctly attributed by name |

## Import / Export

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 20 | As HR/Admin, click "Export" on the Approvals section and choose CSV | N/A | A `.csv` file downloads with the currently visible pending requests |
| 21 | As HR/Admin, click "Export" and choose XLSX | N/A | A `.xlsx` file downloads with the currently visible pending requests |
| 22 | As HR/Admin, download the import template and inspect columns | N/A | Template includes an employee-identifying column (e.g. employee email) alongside leave type/dates/reason |
| 23 | Import a valid CSV of leave requests on behalf of multiple employees | CSV with 2+ valid rows, each with a valid employee email | Each row is marked "Ready" then "Imported"; requests appear correctly attributed to each named employee |
| 24 | Import a CSV row referencing an email that doesn't match any employee | Row with an unregistered email | Row is marked "Failed" with a descriptive error; no request is created |
| 25 | Attempt to access the leave Import/Export controls as a plain Employee | Valid Employee account | Import/Export controls for the Approvals section are not visible (section itself is hidden) |
