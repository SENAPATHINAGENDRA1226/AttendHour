export type Role = "admin" | "faculty";
export type SessionStatus = "held" | "holiday" | "faculty_leave";
export type MarkStatus = "present" | "absent";
export type SessionType = "lecture" | "lab";

export interface AuthState {
  username?: string;
  token: string;
  role: Role;
  fullName: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
}

export interface Section {
  id: number;
  department_id: number;
  year: number;
  name: string;
  display_name: string;
  academic_year: string;
  student_count?: number;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  department_id: number;
}

export interface Faculty {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  is_active: boolean;
}

export interface Student {
  id: number;
  roll_no: string;
  order_no: number;
  name: string;
  is_active: boolean;
}

export interface TimetableEntry {
  id: number;
  faculty_id: number;
  section_id: number;
  subject_id: number;
  day_of_week: number;
  period_number: number;
  session_type: SessionType;
  is_active: boolean;
}

export interface TodayClass {
  timetable_entry_id: number;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  period_number: number;
  session_type: SessionType;
  already_posted: boolean;
  session_status?: SessionStatus | null;
}

export interface StudentMark {
  student_id: number;
  status: MarkStatus;
}

export interface AttendanceRecordOut {
  student_id: number;
  roll_no: string;
  name: string;
  status: MarkStatus;
}

export interface AttendanceSessionOut {
  id: number;
  section_id: number;
  subject_id: number;
  subject_name: string;
  date: string;
  period_number: number;
  status: SessionStatus;
  remarks?: string;
  records: AttendanceRecordOut[];
}

export interface MonthlyReportRow {
  student_id: number;
  roll_no: string;
  name: string;
  total_held: number;
  total_present: number;
  total_absent: number;
  percentage: number;
  day_wise: Record<string, string>;
}

export interface SectionSummaryOut {
  section_id: number;
  section_name: string;
  total_students: number;
  total_sessions_held: number;
  average_attendance_percentage: number;
}

export interface AdminStatsOut {
  total_faculty: number;
  active_faculty: number;
  inactive_faculty: number;
  total_sections: number;
  total_students: number;
  today_attendance_percentage: number;
  today_posted_periods: number;
  today_total_periods: number;
  department_name: string;
}

