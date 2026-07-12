# Test Cases — Holidays Page

App URL: https://peoplix-hr.vercel.app/holidays

## Viewing & access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as an Employee and open the Holidays page | Valid Employee account | Holiday list is visible (read-only); "Add holiday" and Import/Export controls are not shown; "Generate default BD holidays" button is visible |
| 2 | Log in as HR or Admin and open the Holidays page | Valid HR/Admin account | Holiday list is visible along with "Add holiday", Import/Export, and "Generate default BD holidays" controls |
| 3 | View the holiday list with existing entries | Holidays seeded for the current year | Holidays are listed ordered by date ascending, each showing name and date |
| 4 | View the holiday list when the table is empty | Empty holidays table (e.g. right after Clear Database) | An empty-state message is shown instead of a blank list |

## Add / Edit holiday (HR/Admin)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 5 | Click "Add holiday" | N/A | Dialog opens with Name, Date, and a "Repeats every year" checkbox |
| 6 | Submit with Name and Date left empty | (blank) | Browser's required-field validation blocks submission |
| 7 | Submit a valid new holiday without checking "Repeats every year" | Name: "Test Holiday", Date: 2026-12-25, Recurring: unchecked | New holiday appears in the list at the correct sorted position |
| 8 | Submit a valid new holiday with "Repeats every year" checked | Name: "Test Recurring Holiday", Date: 2026-11-01, Recurring: checked | New holiday appears in the list, visually indicated as recurring |
| 9 | Edit an existing holiday's date | Change date to a different valid date | List re-sorts to reflect the new date; row shows updated value |
| 10 | Edit an existing holiday's name | Change name to "Renamed Holiday" | Row updates immediately to the new name |
| 11 | Attempt to add a holiday as a logged-in Employee via the page (control should not be visible) | Valid Employee account | "Add holiday" button/control is absent from the page entirely |

## Delete holiday (HR/Admin)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 12 | Delete an existing holiday | Select a test holiday | Holiday is removed from the list (with or without a confirmation step — verify actual behavior) |

## Generate default Bangladesh holidays

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 13 | Click "Generate default BD holidays" when the list is empty | Empty holidays table | The standard set of Bangladesh public holidays for the current year is added and displayed in the list |
| 14 | Click "Generate default BD holidays" a second time when defaults are already present | Holidays already seeded | Duplicate entries are not created (button is idempotent) |
| 15 | Click "Generate default BD holidays" as a plain Employee | Valid Employee account | Action succeeds (button is available to all authenticated roles per product design) and the shared holiday list updates for everyone |

## Import / Export

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 16 | As HR/Admin, click "Export" and choose CSV | N/A | A `.csv` file downloads with all holidays currently listed |
| 17 | As HR/Admin, click "Export" and choose XLSX | N/A | A `.xlsx` file downloads with all holidays currently listed |
| 18 | Download the import template and inspect its columns | N/A | Template includes Name, Date, and recurring-flag columns with one example row |
| 19 | Import a valid CSV with 2 new holidays | CSV matching the template | Both rows marked "Ready" then "Imported"; both appear in the list |
| 20 | Import a CSV row with an invalid date format | Row with Date: "not-a-date" | Row is flagged with a validation error in the preview and is not imported |
| 21 | Upload a non-spreadsheet file | `.txt` file | Dialog shows a file-read error; no rows are parsed |
