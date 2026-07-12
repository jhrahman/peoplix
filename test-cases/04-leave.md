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
| 3 | Click "Apply for leave" | N/A | Dialog opens with Leave type dropdown (Casual/Sick/Annual), Start date, End date, and optional Reason field |
| 4 | Submit with Start date and End date left empty | Dates: (blank) | Browser's required-field validation blocks submission |
| 5 | Select an End date earlier than the Start date | Start: 2026-08-10, End: 2026-08-05 | The "X days of leave" helper text does not display an invalid/negative day count; form either blocks submission or the day count is hidden until dates are valid |
| 6 | Select a valid single-day range | Start: 2026-08-10, End: 2026-08-10 | Helper text reads "1 day of leave" |
| 7 | Select a valid multi-day range | Start: 2026-08-10, End: 2026-08-14 | Helper text reads the correct number of days for that range |
| 8 | Submit a valid leave request within available balance | Leave type: Casual, valid date range, Reason: "Family event" | Dialog closes; new row appears in "My leave requests" table with status "Pending" |
| 9 | Submit a leave request that exceeds the remaining balance for that leave type | Leave type with 0 or few days left, request exceeding remaining days | Request is either rejected with a clear error message or flagged for review — verify actual product behavior (balance should never go negative without explicit approval) |
| 10 | Submit a leave request with the Reason field left blank | Reason: (blank) | Request is submitted successfully since Reason is optional |
| 11 | Submit two overlapping leave requests for the same employee | Two requests with overlapping date ranges | Verify whether the system allows, warns, or blocks overlapping requests (document actual behavior) |
| 12 | View "My leave requests" table after submitting multiple requests | 2+ submitted requests | Table lists all requests with type, dates, day count, and current status, most recent first |

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
