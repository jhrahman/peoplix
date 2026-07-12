# Test Cases — Attendance Page

App URL: https://peoplix-hr.vercel.app/attendance

## Check-in / Check-out

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Attendance page before checking in for the day | Account with no attendance record for today | "Today" card shows "You haven't checked in yet." with a "Check In" button |
| 2 | Click "Check In" | N/A | Button briefly shows "Checking in..."; card updates to show "Checked in at [time]" with a "Check Out" button |
| 3 | Refresh the page after checking in but before checking out | Browser refresh | Card still shows the "Checked in at [time]" state (not reset to "not checked in") |
| 4 | Click "Check In" again after already checked in today | N/A | Duplicate check-in is not created for the same day (button/state no longer offers "Check In") |
| 5 | Click "Check Out" | N/A | Button briefly shows "Checking out..."; card updates to show total duration worked and both check-in/check-out times |
| 6 | Refresh the page after checking out for the day | Browser refresh | Card continues to show the completed duration for today, not a re-offer to check in/out |
| 7 | View "My history" table after several days of check-in/out | Account with 2+ days of attendance | Table lists date, check-in time, check-out time, and computed duration for each day, most recent first |
| 8 | View "My history" table for a brand-new account | Freshly created employee, no history | Table shows an empty-state message ("No attendance history yet.") |

## Manual override / correction

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 9 | Click the edit (pencil) icon on a past attendance row | Select an existing history row | Dialog opens titled "Edit attendance — [date]" with Check in and Check out time fields pre-filled |
| 10 | Change the Check out time to a later, correct time and save | Check out: 18:00 | Row updates with the new check-out time; duration recalculates correctly |
| 11 | Change the Check in time to an earlier, correct time and save | Check in: 09:00 | Row updates with the new check-in time; duration recalculates correctly |
| 12 | Clear the Check out time entirely and save | Check out: (empty) | Row updates to show no check-out time / duration as incomplete for that day |
| 13 | Set Check out earlier than Check in | Check in: 18:00, Check out: 10:00 | Verify the system rejects this with a clear error or handles it sensibly — a negative duration must never be displayed |
| 14 | Perform an override correction as a plain Employee on their own record | Valid Employee account, own attendance row | Edit succeeds without requiring HR/Admin approval (self-service correction, per product design) |
| 15 | Attempt to edit another employee's attendance record via direct API/URL manipulation as a plain Employee | Employee account, another user's record ID | Request is rejected server-side (not just hidden in the UI) |

## Team attendance (HR/Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 16 | Log in as an Employee and check for a "Team attendance today" section | Valid Employee account | Section is not visible |
| 17 | Log in as HR or Admin and open the Attendance page | Valid HR/Admin account | "Team attendance today" table is visible, listing every employee's check-in/out status for the current day |
| 18 | View "Team attendance today" when some employees haven't checked in yet | Mixed check-in states across employees | Employees without a record for today are handled gracefully (omitted or shown as "not checked in", not as an error row) |
