# Test Cases — Employees Page

App URL: https://peoplix-hr.vercel.app/employees
Access: Admin and HR only.

> Admins also see a **Pending Sign Up Requests** panel at the top of this page, for reviewing
> self-service access requests submitted from `/signup`. That flow (public request form,
> Approve/Reject, resulting invite email) has its own dedicated file:
> [`10-signup-requests.md`](10-signup-requests.md).

## Access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as an Employee and directly open `/employees` | Valid Employee account | User is redirected away from the page (e.g. back to `/`); Employees page content is never shown |
| 2 | Log in as HR and open `/employees` | Valid HR account | Employees table loads with "Add employee" and Import/Export controls visible |
| 3 | Log in as Admin and open `/employees` | Valid Admin account | Employees table loads with "Add employee" and Import/Export controls visible |

## Add employee

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 4 | Click "Add employee" | N/A | Dialog opens with fields: Full name, Email, Department, Designation, Phone, Role (dropdown, defaults to "Employee") |
| 5 | Submit the form with Full name and Email left empty | Full name: (blank), Email: (blank) | Browser's required-field validation blocks submission |
| 6 | Submit the form with an already-registered email | Email of an existing employee | Form shows an inline error indicating the email is already in use; no duplicate record is created |
| 7 | Submit the form with a new, unique email and Role set to "Employee" | Full name: "Test Employee One", Email: unique test address, Role: Employee | New row appears in the Employees table with role "Employee"; a leave balance record is seeded for the current year |
| 8 | Submit the form with Role set to "HR" | Full name: "Test HR One", Email: unique test address, Role: HR | New row appears with role "HR" |
| 9 | Submit the form with Role set to "Admin" | Full name: "Test Admin One", Email: unique test address, Role: Admin | New row appears with role "Admin" |
| 10 | While the create request is in flight, observe the submit button | N/A | Button reads "Saving..." and is disabled to prevent double submission |
| 11 | Log in as the newly created employee (after completing the invite/reset-password flow) | New employee's email | Login succeeds and the dashboard reflects the assigned role |

## Edit employee

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | Open the edit dialog for an existing employee | Select an existing row | Dialog pre-fills all fields with the current values; Email field is disabled/read-only |
| 13 | Change the Full name and save | New name: "Updated Name" | Table row updates to show the new name immediately |
| 14 | Change an employee's Role from Employee to HR and save | Role: HR | Table row updates to show "HR"; that user gains access to the Employees page on next login |
| 15 | Attempt to edit your own account's role while logged in as the only Admin | Role: Employee | System either blocks the change or warns, so the account is not left with zero administrators (verify actual product behavior and flag if no safeguard exists) |

## Delete employee

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 16 | Click the delete action for an employee record | Select an existing test employee | A confirmation prompt appears before deletion proceeds |
| 17 | Confirm deletion | Confirm | Employee is removed from the table; their auth account and related records are handled per product spec (verify no orphaned data is left visible) |
| 18 | Cancel the deletion confirmation | Cancel | Employee record remains unchanged in the table |
| 18a | Log in as Admin and look for a delete action on the protected account (`tflash978@gmail.com`) | N/A | No delete icon is shown for that row — every other employee still has one |
| 18b | Attempt to delete the protected account via direct API call (`DELETE /api/employees/{id}`) | Admin session, protected account's id | Request is rejected (`403`) even though the caller is Admin — this account can never be deleted, UI-hidden or not |

## Search

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 18c | Type into the search box above the Employees table | A test employee's full name | Table filters in real time (no submit button, no page reload) to rows matching the name |
| 18d | Search by a partial email | A substring of a known employee's email | Matching row(s) remain visible; non-matching rows are filtered out |
| 18e | Search by department or designation | A known department/designation value | Rows with a matching department or designation remain visible |
| 18f | Search for a value that matches no employee | Random string, e.g. "zzzznotreal" | Table shows an empty state ("No employees match your search.") instead of an empty table with no explanation |
| 18g | Clear the search box (✕ button or manually) | N/A | Full employee list reappears |

## Import / Export

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 19 | Click "Export" and choose "Export as CSV" | N/A | A `.csv` file downloads containing all employee rows currently in the table |
| 20 | Click "Export" and choose "Export as XLSX" | N/A | A `.xlsx` file downloads containing all employee rows currently in the table |
| 21 | Click "Import" then "Download template" | N/A | A template CSV downloads with the correct column headers and one example row |
| 22 | Upload a correctly formatted CSV with 2 new valid employees | CSV matching the template, 2 unique rows | Preview table shows both rows marked "Ready"; clicking "Import" marks each row "Imported" and both appear in the Employees table |
| 23 | Upload a file with one row missing a required field | CSV with one row missing Email | Preview table flags that row with a validation error badge; only the valid rows are importable |
| 24 | Upload a file with a duplicate email already in the system | CSV row reusing an existing employee's email | Row is marked "Failed" after import attempt with a descriptive error, and no duplicate is created |
| 25 | Upload a non-spreadsheet file (e.g. a `.txt` or `.png`) | Invalid file type | Dialog shows "Couldn't read that file..." error message; no rows are parsed |
| 26 | Upload an empty spreadsheet (headers only, no data rows) | Template file with 0 data rows | Dialog shows "No rows found in that file." message |
