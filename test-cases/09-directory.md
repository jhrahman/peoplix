# Test Cases — Team Directory

App URL: https://peoplix-hr.vercel.app/directory
Access: Every role (unlike the Employees page, which is Admin/HR only).

## Visibility & access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as an Employee and open `/directory` | Valid Employee account | Page loads (not redirected) and lists every employee in the company, not just the signed-in user |
| 2 | Log in as HR and open `/directory` | Valid HR account | Page loads with the same full listing |
| 3 | Log in as Admin and open `/directory` | Valid Admin account | Page loads with the same full listing |
| 4 | Log in as an Employee and check for any Add/Edit/Delete controls on the page | Valid Employee account | No editing controls exist anywhere on the page — the directory is entirely read-only for every role, including Admin |

## Listing

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 5 | View the directory table with existing employees | 2+ employees in the system | Table lists Name (with initials avatar), Designation, Department, Email, and Phone columns, ordered by full name |
| 6 | View a row for an employee with no Designation/Department set | Employee profile missing those fields | Missing fields display as "—" rather than blank or "undefined" |
| 7 | View a row for an employee with no Phone set | Employee profile with no phone | Phone column shows "—" |
| 8 | Click an employee's email address | Click the email link | Opens the system's default mail client via a `mailto:` link addressed to that employee |
| 9 | View the directory when the company has no other employees yet | Single-employee database (e.g. fresh install) | Table lists the one existing profile; no error |

## Search

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 10 | Type a full or partial employee name into the search box | e.g. "Jane" | Table filters to only rows whose name contains the typed text, instantly (no page reload) |
| 11 | Search by department | e.g. "Engineering" | Table filters to only employees in that department |
| 12 | Search by designation | e.g. "Manager" | Table filters to only employees with a matching designation |
| 13 | Search by email or partial email | e.g. "jane.doe@" or the domain part | Table filters to matching employees by email |
| 14 | Search using a mixed-case query | e.g. "ENGINEERING" | Search is case-insensitive; matching rows still appear |
| 15 | Search for a term that matches no one | e.g. "zzzznotarealdept" | Table shows "No employees match your search." instead of an empty table with no explanation |
| 16 | Clear the search box after searching | Delete all text | Full employee list reappears |
| 17 | Confirm search does not trigger a network request | Type into the search box while watching dev tools' network tab | No new HTTP request fires — filtering happens entirely client-side against the already-loaded list |
