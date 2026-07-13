# Test Cases — Attendance Page

App URL: https://peoplix-hr.vercel.app/attendance

## Check-in / Check-out

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Open the Attendance page before checking in for the day | Account with no attendance record for today | "Today" card shows "You haven't checked in yet." with a "Check In" button |
| 2 | Click "Check In" | N/A | Button briefly shows "Checking in..." then a checkmark ("Checked in") for ~1.2s before the card updates to show "Checked in at [time]" with a "Check Out" button; the stamped time comes from the server, not the browser clock |
| 3 | Refresh the page after checking in but before checking out | Browser refresh | Card still shows the "Checked in at [time]" state (not reset to "not checked in") |
| 4 | Click "Check In" again after already checked in today | N/A | Duplicate check-in is not created for the same day (button/state no longer offers "Check In") |
| 5 | Click "Check Out" | N/A | Button briefly shows "Checking out..." then a checkmark ("Checked out") for ~1.2s; card updates to show total duration worked and both check-in/check-out times |
| 6 | Refresh the page after checking out for the day | Browser refresh | Card continues to show the completed duration for today, not a re-offer to check in/out |
| 7 | View "My history" table after several days of check-in/out | Account with 2+ days of attendance | Table lists date, check-in time, check-out time, and computed duration for each day, most recent first |
| 8 | View "My history" table for a brand-new account | Freshly created employee, no history | Table shows an empty-state message ("No attendance history yet.") |
| 25 | Trigger a failed check-in or check-out (e.g. simulate a server error) | N/A | A toast error appears (not a silently-reset button); button returns to its normal clickable state |

## Delete today's attendance

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 26 | After checking in (or out) today, open "My history" and find today's row | Any role | A trash-can delete icon is visible only on today's row — no other row has it |
| 27 | Click the delete icon on today's row and confirm in the dialog | Confirm | Today's row is removed from the table, and the "Today" card resets to "You haven't checked in yet." with the Check In button |
| 28 | Click the delete icon on today's row and cancel the confirmation dialog | Cancel | Row and "Today" card state remain unchanged |
| 29 | Look for a delete icon on any past (non-today) row | Any role, including Admin | No delete icon is present on past rows — history is permanent once the day has passed |
| 30 | Attempt to delete a past attendance record via direct API call (`DELETE /api/attendance/{id}`) | Any role, including Admin, targeting a record dated before today | Request is rejected (`403`) — server-side check blocks it even though the UI never exposes this action |
| 31 | Attempt to delete another employee's today record via direct API call | Employee account, another user's today record ID | Request is rejected (`403`) — only the record's own owner can delete it |

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

## Time format (Bangladesh Standard Time)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 19 | View any check-in/check-out time in the "Today" card or "My history" table | Any recorded time | Time is displayed in **12-hour format with AM/PM** (e.g. "10:00 AM"), in Bangladesh Standard Time (UTC+6) — regardless of the viewer's own device timezone or locale settings |
| 20 | View the same attendance record from a browser/device set to a different timezone (e.g. UTC or US Eastern) | Same record, different viewer timezone | The displayed time is identical to test 19 — it does not shift with the viewer's local timezone |
| 21 | Open the manual override/correction dialog (edit pencil icon) | Select an existing history row | A note reads "Times are in Bangladesh Standard Time (UTC+6)." above the Check in/Check out fields |
| 22 | Compare the pre-filled Check in/Check out values in the edit dialog against the same row's displayed time in the history table | Any record with both times set | Values match exactly — the edit dialog pre-fills using the same Bangladesh-time value shown in the table (front-end and backend stay in sync) |
| 23 | Save an edited time in the override dialog, then re-open the dialog for that same row | Set Check out to 18:00, save, reopen | Reopening shows 18:00 pre-filled again — the round-trip through the backend does not shift the time |
| 24 | Check in shortly after midnight Bangladesh time (e.g. 00:15 BST) | Check-in performed at 00:15 Bangladesh time | The record's "date" is today's Bangladesh calendar date, not the previous UTC day |

## Search / filter history by date

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 32 | Open "My history" with no filter applied | Account with 30+ days of history | Table shows the most recent 30 records; filter button reads "Filter by date" |
| 33 | Click the filter button, then click a start date and an end date on the calendar | e.g. select a 5-day range | Popover stays open between picking the start and end date (does not close after the first click); once both are picked, it closes automatically and the table updates to only that range |
| 34 | Compare the URL after applying a range | N/A | URL contains `?from=YYYY-MM-DD&to=YYYY-MM-DD` matching the selected range |
| 35 | Refresh the page (F5) after applying a date range | Browser refresh | The same filtered range is still applied — table and filter button label are unchanged after reload |
| 36 | Click the X (clear) button next to the filter | N/A | Clear icon briefly shows a spinner while clearing, then the filter is removed, the URL query params are gone, and the table reverts to the default (most recent 30 records) — same as a fresh, unfiltered view |
| 37 | Apply a date range that has no attendance records | A range with no history | Table shows "No attendance history for this range." |
| 38 | Apply a filter, then navigate away and back to `/attendance` via a bookmarked/shared URL with `from`/`to` params | Direct URL with query params | Page loads pre-filtered to that range |

## Team attendance (HR/Admin only)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 16 | Log in as an Employee and check for a "Team attendance today" section | Valid Employee account | Section is not visible |
| 17 | Log in as HR or Admin and open the Attendance page | Valid HR/Admin account | "Team attendance today" table is visible, listing every employee's check-in/out status for the current day |
| 18 | View "Team attendance today" when some employees haven't checked in yet | Mixed check-in states across employees | Employees without a record for today are handled gracefully (omitted or shown as "not checked in", not as an error row) |
