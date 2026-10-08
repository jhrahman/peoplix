// Where each person is in the account lifecycle, worked out from what Supabase
// Auth and the profile already know - no separate copy that could drift out of
// date. Pure (no server code), so the page and the checks can share it.

export type AccountStatus =
  // Invited, hasn't opened the email yet.
  | "invite_pending"
  // Opened the link (which counts as signing in) but never chose a password.
  | "setup_incomplete"
  // Has a password and has signed in.
  | "active"
  // Asked for a password reset and hasn't signed in since.
  | "reset_pending";

export const STATUS_LABEL: Record<AccountStatus, string> = {
  invite_pending: "Invite pending",
  setup_incomplete: "Setup not finished",
  active: "Active",
  reset_pending: "Reset pending",
};

// A note shown with the status, so an Admin knows what to do about it.
export const STATUS_HINT: Record<AccountStatus, string> = {
  invite_pending: "Invited but hasn't opened the email yet.",
  setup_incomplete: "Opened the link but hasn't set a password.",
  active: "Signed up and signing in.",
  reset_pending: "Asked to reset their password and hasn't signed in since.",
};

// Supabase's own reset/invite links expire after about an hour, so a request
// older than this wasn't completed from that email.
const STALE_AFTER_DAYS = 7;

export type AccountStatusInput = {
  // profiles.password_set_at: null until the person has chosen their own password.
  passwordSetAt: string | null;
  lastSignInAt: string | null;
  recoverySentAt: string | null;
  invitedAt: string | null;
  createdAt: string;
};

export function deriveAccountStatus(input: AccountStatusInput): AccountStatus {
  const signedIn = input.lastSignInAt ? Date.parse(input.lastSignInAt) : 0;
  const recovery = input.recoverySentAt ? Date.parse(input.recoverySentAt) : 0;

  if (!input.passwordSetAt) {
    // An invite is the account's first "reset" email, so no password yet means
    // they are still somewhere in the invite flow.
    return signedIn ? "setup_incomplete" : "invite_pending";
  }
  if (recovery && recovery > signedIn) return "reset_pending";
  return "active";
}

// Has this person been waiting on an invite for a long time? Lets the page
// flag stale invites instead of leaving an Admin to count days.
export function isStale(status: AccountStatus, input: AccountStatusInput, now = Date.now()) {
  if (status !== "invite_pending" && status !== "setup_incomplete") return false;
  // Measured from the most recent email, so resending an invite starts a fresh wait.
  const lastEmailed = Math.max(
    ...[input.invitedAt, input.recoverySentAt, input.createdAt].map((d) => (d ? Date.parse(d) : 0)),
  );
  return now - lastEmailed > STALE_AFTER_DAYS * 86_400_000;
}

export const EVENT_LABEL = {
  signup_requested: "Requested access",
  signup_approved: "Access approved",
  signup_rejected: "Access rejected",
  invite_sent: "Invite sent",
  invite_resent: "Invite resent",
  password_set: "Set first password",
  password_reset_requested: "Asked to reset password",
  password_reset_unknown_email: "Reset asked for unknown email",
  password_reset_completed: "Reset password",
  password_changed: "Changed password",
} as const;

// Which events deserve a second look (an attempt on an address nobody has).
export const EVENT_NEEDS_ATTENTION = new Set(["password_reset_unknown_email"]);
