# Test Cases — Dashboard

App URL: https://peoplix-hr.vercel.app/ (post-login landing page)

## Widgets & layout

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in and land on the dashboard | Valid Employee account | Stat tiles are displayed for leave balance, attendance, holidays, and account role, each with a label and a value |
| 2 | Log in as an Employee and inspect the "Role" stat tile | Valid Employee account | Tile shows "Employee" as the role value |
| 3 | Log in as HR and inspect the "Role" stat tile | Valid HR account | Tile shows "HR" as the role value |
| 4 | Log in as Admin and inspect the "Role" stat tile | Valid Admin account | Tile shows "Admin" as the role value |
| 5 | Inspect the leave balance widget for a user with some leave already used | Account with at least one approved leave request this year | Widget shows remaining vs. total days per leave type (casual, sick, annual), visually distinct from a full balance |
| 6 | Inspect the leave balance widget for a brand-new user with no leave taken | Freshly created employee account | Widget shows full/untouched balances for each leave type, no negative or error values |
| 7 | Inspect the weekly attendance chart | Account with check-in/check-out history for the current week | Chart renders bars/points for each day with attendance data; days with no record are visually distinct (not mistaken for zero hours) |
| 8 | Inspect the weekly attendance chart for a brand-new user | Freshly created employee account with no attendance history | Chart displays an empty state message instead of a broken/blank chart |
| 9 | Inspect the "Upcoming holidays" widget when holidays exist in the current year | At least one holiday dated in the future | Widget lists the next upcoming holiday(s) with name and date, ordered soonest-first |
| 10 | Inspect the "Upcoming holidays" widget when no holidays are seeded | Database with holidays table empty (e.g. right after Clear Database) | Widget shows an empty-state message, not a blank space or error |
| 11 | Hover over a data point/bar in the attendance chart | Mouse hover | A tooltip appears showing the exact date and duration for that point |
| 12 | Resize the browser to a mobile width (e.g. 375px) | Viewport resize / mobile device | Stat tiles and widgets stack vertically in a single column; no horizontal scrolling or overlapping content |
| 13 | Reload the dashboard page | Browser refresh (F5) | A loading/spinner state briefly displays, then all widgets reload with current data (no stale/duplicate content) |
| 14 | Navigate from the dashboard to another page and back | Click Leave → click Dashboard (sidebar) | Page-transition loader briefly appears; dashboard widgets reflect any changes made in the interim |
