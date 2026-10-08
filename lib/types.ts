import type { CommentMedia } from "@/lib/comment-media";

export type UserRole = "admin" | "hr" | "employee";

export type LeaveType = "casual" | "sick" | "annual";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: UserRole;
  joined_date: string;
  avatar_url: string | null;
  manager_id: string | null;
  // Null until the employee sets their password for the first time (completing
  // the invite/access-approval flow) - that transition is what gets logged as
  // the "joined" audit action, rather than looking like an ordinary password reset.
  password_set_at: string | null;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

// Columns actually rendered by leave-table/import-export components — pages
// select only these instead of `*` to keep the leave page's queries light.
export type LeaveRequestSummary = Pick<
  LeaveRequest,
  "id" | "leave_type" | "start_date" | "end_date" | "reason" | "status"
>;

export type LeaveBalance = {
  id: string;
  employee_id: string;
  year: number;
  casual_total: number;
  casual_used: number;
  sick_total: number;
  sick_used: number;
  annual_total: number;
  annual_used: number;
};

export type LeaveBalanceSummary = Pick<
  LeaveBalance,
  "year" | "casual_total" | "casual_used" | "sick_total" | "sick_used" | "annual_total" | "annual_used"
>;

export type Holiday = {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
  created_by: string | null;
};

export type Attendance = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
};

export type SignupRequestStatus = "pending" | "approved" | "rejected";

export type SignupRequest = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  mobile: string | null;
  status: SignupRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type OvertimeStatus = "pending" | "approved" | "rejected";

export type OvertimeRequest = {
  id: string;
  employee_id: string;
  date: string;
  hours: number;
  reason: string | null;
  status: OvertimeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

// Columns actually rendered by overtime-table/summary components — pages
// select only these instead of `*` to keep the overtime page's queries light.
export type OvertimeRequestSummary = Pick<
  OvertimeRequest,
  "id" | "date" | "hours" | "reason" | "status"
>;

export type AuditAction = "create" | "update" | "delete" | "cancel" | "approve" | "reject" | "joined";

export type AuditEntity =
  | "leave_request"
  | "overtime_request"
  | "attendance"
  | "employee"
  | "signup_request"
  | "profile"
  | "password"
  | "account"
  | "post"
  | "comment"
  | "wish";

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string;
  action: AuditAction;
  entity: AuditEntity;
  comment: string;
  created_at: string;
};

export type PostKind = "update" | "kudos" | "poll";

export type MediaKind = "image" | "video";

export type PostAuthor = Pick<Profile, "id" | "full_name" | "designation" | "avatar_url">;

// Everyone can already read every profile (Team Directory), so email is fair
// game for the hover preview. Date of birth is deliberately NOT here.
export type PersonOption = PostAuthor & Pick<Profile, "email">;

// One emoji on a post or comment, already aggregated server-side so the client
// never receives per-employee reaction rows. `reactors` holds up to 9 *other*
// people's names (for the hover label); the caller is represented by `mine`.
export type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
  reactors: string[];
};

export type PostMedia = {
  id: string;
  kind: MediaKind;
  url: string;
  mime_type: string;
  size_bytes: number;
};

export type PollOption = { id: string; label: string; votes: number };

// A post as the engagement feed renders it.
export type FeedPost = {
  id: string;
  content: string;
  kind: PostKind;
  is_announcement: boolean;
  is_pinned: boolean;
  created_at: string;
  author: PostAuthor | null;
  kudos: { recipient: PostAuthor; value: string } | null;
  media: PostMedia[];
  poll: { options: PollOption[]; my_vote: string | null; total_votes: number } | null;
  reactions: ReactionSummary[];
  comment_count: number;
};

export type PostComment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
  reactions: ReactionSummary[];
  media: CommentMedia | null;
};

export type NotificationType = "mention" | "kudos" | "comment" | "reaction" | "wish";

export type NotificationContext =
  | "post"
  | "announcement"
  | "poll"
  | "kudos"
  | "comment"
  | "birthday"
  | "milestone"
  | "anniversary"
  | "new_joiner";

export type AppNotification = {
  id: string;
  type: NotificationType;
  context: NotificationContext;
  // Null only for wishes, which point at a day instead of a post.
  post_id: string | null;
  comment_id: string | null;
  emoji: string | null;
  occasion_date: string | null;
  // The celebrant, for notifications about a birthday / anniversary card.
  occasion_owner_id: string | null;
  preview: string;
  read_at: string | null;
  created_at: string;
  actor: PostAuthor | null;
};

// A comment on a birthday / work-anniversary card.
export type CardComment = {
  id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
  media: CommentMedia | null;
};
