# Test Cases — Dashboard

App URL: https://peoplix-hr.vercel.app/ (post-login landing page)

## Widgets & layout

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in and land on the dashboard | Valid Employee account | Stat tiles are displayed for hours this week, overtime this month, leave balance, holidays, and account role, each with a label and a value |
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

## Overtime widget

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 15 | View the "Overtime this month" stat tile with no pending entries | Account with 0 pending overtime entries | Sublabel reads "Approved hours"; value shows total approved hours for the current calendar month |
| 16 | View the "Overtime this month" stat tile with pending entries | Account with 1+ pending overtime entries | Sublabel reads "N pending review" instead of "Approved hours" |
| 17 | Log in as Admin and view the stat tile row below "Pending approvals" / "Checked in today" | Valid Admin account, 1+ pending overtime entries across employees | A third "Overtime approvals" tile is shown with the correct pending count |
| 18 | Log in as HR and check for the "Overtime approvals" tile | Valid HR account | Tile is not shown — only Admin sees it, since only Admin can approve overtime |

## Access requests widget (Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 19 | Log in as Admin with 1+ pending sign-up requests, in the top stat-tile row beside "Hours this week" | Valid Admin account, 1+ pending `signup_requests` | An "Access requests" tile is shown with an orange gradient icon chip, correct pending count, and sublabel "Sign-up requests pending"; the top row widens to 5 columns on large screens to fit it |
| 20 | Log in as HR or Employee and check for the "Access requests" tile | Valid HR or Employee account | Tile is not shown — Admin only, and the top row stays at its normal 4-column layout |
| 21 | Log in as Admin with zero pending sign-up requests | Valid Admin account, no pending `signup_requests` rows | Tile still shows, with value "0" |
| 22 | From the "Access requests" tile, navigate to the Employees page and approve/reject a pending request, then return to the Dashboard | Approve or reject one pending request | Tile's count decreases by one, reflecting the change without a stale cached value |
