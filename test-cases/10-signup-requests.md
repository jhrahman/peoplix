# Test Cases — Sign Up / Access Requests

App URL: https://peoplix-hr.vercel.app/signup (public form) and
https://peoplix-hr.vercel.app/employees (Admin-only review panel)

This is a two-sided flow: anyone can submit a request with no session at all, but reviewing and
acting on it is restricted to Admin (not HR, unlike most Admin/HR-gated resources in this app).

## Public request form (`/signup`)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Visit `/signup` while logged out | No session | Form loads with fields: Full name, Email, Department (optional), Designation (optional), Mobile (optional) |
| 2 | Submit the form with Full name and Email left empty | Full name: (blank), Email: (blank) | Browser's required-field validation blocks submission |
| 3 | Submit the form with only the required fields filled | Full name: "Test Applicant", Email: unique test address, rest blank | Request succeeds — optional fields are genuinely optional |
| 4 | Submit a fully filled-out form | Full name, Email, Department, Designation, Mobile all set | Request succeeds |
| 5 | Observe the submit button while the request is in flight | N/A | Button reads "Submitting..." and is disabled to prevent double submission |
| 6 | Submit a second request using an email that already has a pending request | Email matching an existing pending `signup_requests` row | Inline error is shown (duplicate pending email, `409`); no second row is created |
| 7 | After a successful submission, observe the success state | N/A | Form is replaced by a green circular checkmark that animates in with a soft staggered reveal (badge settles, ring pulses, check strokes in — not an instant pop), the heading changes to a gradient "Request Submitted", and the message "Thanks! Access Request Submitted. A System Admin will review the request soon." is shown |
| 8 | Click "OK" on the success screen | N/A | Navigates to `/login` |
| 9 | From the success screen, resize to a mobile width (e.g. 375px) | Viewport resize | Checkmark, heading, and message remain centered and readable; no overflow |

## Admin review panel (Employees page)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 10 | Log in as Employee or HR and open `/employees` | Valid Employee/HR account | No "Pending Sign Up Requests" panel is shown — only Admin sees it, even though HR can otherwise manage employees |
| 11 | Log in as Admin with 1+ pending requests and open `/employees` | Valid Admin account | "Pending Sign Up Requests" panel appears above the Employees table, listing each request's name, email, and designation/department |
| 12 | Log in as Admin with zero pending requests | Valid Admin account | Panel shows "No pending requests." instead of an empty list |
| 13 | Attempt to call `GET /api/signup-requests` directly as a non-Admin (e.g. HR session or dev tools) | HR or Employee session | Request is rejected (`401`/`403`), independent of the panel being hidden in the UI |

## Approve

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 14 | Click "Approve" on a pending request | Select a test request | Button immediately reads "Approving..." and is disabled while the request is in flight |
| 15 | Wait for the approval to complete | N/A | Request disappears from the pending list; a new employee account is created with the submitted name/department/designation/mobile and role "employee"; a leave balance row is seeded for the current year |
| 16 | Check the applicant's inbox after approval | Test applicant's email | Receives the Peoplix-branded "Set your password" email (teal gradient header/button) linking to `/reset-password` |
| 17 | Complete the password-setup link and log in | New credentials | Login succeeds; profile reflects the department/designation/mobile submitted in the original request |
| 17a | As Admin, check the Audit Log after this new employee completes the password-setup link | See [`11-audit-log.md`](11-audit-log.md) | A "Joined" entry appears for them, not an ordinary password-update entry |
| 18 | Attempt to approve the same request twice in quick succession (e.g. double-click) | Rapid double-click on "Approve" | Second click is a no-op — button is disabled the instant the first click registers |
| 19 | Approve a request whose email already has an existing auth account (e.g. a prior attempt partially completed) | Request with a pre-existing auth user for that email | Approval succeeds by reusing the existing account instead of failing with a duplicate-email error |

## Reject

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 20 | Click "Reject" on a pending request | Select a test request | Button immediately reads "Rejecting..." and is disabled while in flight |
| 21 | Wait for the rejection to complete | N/A | Request disappears from the pending list; no auth account or profile is created; no email is sent |
| 22 | Attempt to review (approve or reject) a request that's no longer `pending` (e.g. already rejected) | Re-submit the same `PATCH` via dev tools/API client | Request is rejected (`400`) — only `pending` requests can be reviewed |

## Error resilience

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 23 | Simulate a network failure or server error while approving/rejecting (e.g. offline mode in dev tools) | Trigger Approve/Reject with the network disabled | Button returns from "Approving..."/"Rejecting..." back to normal (does not hang indefinitely), and an inline error message is shown instead |
