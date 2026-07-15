# Test Cases — Login & Authentication

App URL: https://peoplix-hr.vercel.app/login

Note: Use only test/sandbox accounts when executing these cases. Do not record real credentials in this file or in any test report.

## Login form

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Navigate to the app root while logged out | N/A | Browser is redirected to `/login`; the login form is displayed |
| 2 | Load the `/login` page | N/A | Page shows Email field, Password field, "Forgot password?" link, and a "Sign in" button |
| 3 | Submit the form with both fields empty | Email: (blank), Password: (blank) | Browser's native "required field" validation prevents submission; no network request is sent |
| 4 | Submit the form with an invalid email format | Email: `notanemail`, Password: `anything123` | Browser's native email-format validation blocks submission |
| 5 | Submit the form with a registered email and wrong password | Email: a valid employee account email, Password: `WrongPassword!1` | Form shows an inline error message; user remains on `/login` |
| 6 | Submit the form with an email that has never been registered | Email: `nonexistent.user@example.com`, Password: `AnyPassword1!` | Form shows an inline error message (generic, does not confirm whether the account exists); user remains on `/login` |
| 7 | Submit the form with a valid Employee account's correct credentials | Email/password of a valid Employee test account | User is redirected to `/` (dashboard); sidebar shows Employee-level navigation only (no Employees page link) |
| 8 | Submit the form with a valid HR account's correct credentials | Email/password of a valid HR test account | User is redirected to `/` (dashboard); sidebar includes Employees page link |
| 9 | Submit the form with a valid Admin account's correct credentials | Email/password of a valid Admin test account | User is redirected to `/` (dashboard); sidebar includes Employees page link. Settings shows the "Clear Database" (Danger Zone) control **only** if this Admin is the designated System Admin account — any other Admin account does not see it at all (not even disabled) |
| 10 | While the sign-in request is in flight, observe the submit button | N/A | Button text changes to "Signing in..." and is disabled, preventing duplicate submissions |
| 11 | Type a password into the Password field | Any string | Characters are masked (rendered as dots/asterisks), not shown in plain text |
| 12 | Log in successfully, then manually browse back to `/login` | N/A | Already-authenticated user is redirected away from `/login` (not shown the form again) |
| 13 | While logged out, attempt to directly open a protected URL (e.g. `/employees`, `/leave`, `/settings`) | Direct URL entry | Browser redirects to `/login` before any protected content is shown |

## Forgot password

The email is checked against real accounts server-side, in real time — this is a deliberate
trade-off for an internal HR tool (clear feedback over account-enumeration resistance), unlike a
public-facing product.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 14 | Click "Forgot password?" on the login page | N/A | A dialog opens titled "Reset your password" with an Email field and "Send reset link" button |
| 15 | Submit the forgot-password form with a registered email | A valid, registered account email | Dialog shows confirmation text: "A password reset link has been sent to your email." |
| 16 | Submit the forgot-password form with an email that is not registered | `unknown.person@example.com` | Dialog shows an inline error: "No user found with this email. Please Sign Up first" — the form stays open (not the success state), so the user can correct the email or go sign up |
| 17 | Submit the forgot-password form with the Email field empty | (blank) | Browser's native required-field validation blocks submission |
| 18 | Close the dialog after a successful submission, then reopen it | N/A | Dialog resets to the empty input state (does not retain previous email, error, or "sent" confirmation) |
| 19 | Complete a real password reset via the emailed link (if mailbox access is available) | Follow the link to `/reset-password` | Reset-password page loads, allows setting a new password, and on success signs the user in with the new password |
| 20 | While filling in the forgot-password dialog, submit it | Valid registered email | Only the dialog's own "Send reset link" button shows "Sending..."; the login page's own "missing email or phone" error must **not** appear — the two forms are independent despite the dialog being rendered inside the login page |
