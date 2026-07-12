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
