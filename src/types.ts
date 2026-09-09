export type Role = "admin" | "faculty" | "shared_faculty";
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
  year?: number | null;
  branch?: string | null;
}

export interface FacultyAllocation {
  id: number;
  faculty_id: number;
  faculty_name?: string;
  faculty_username?: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_year?: number | null;
  section_id: number;
  section_display_name: string;
  is_active: boolean;
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
  allocation_id: number;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  periods_posted: number[];
  scheduled_periods?: number[];
  year?: number;
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
  faculty_id?: number;
  faculty_name?: string;
  operator_faculty_id?: number;
  operator_faculty_name?: string;
  date: string;
  period_number: number;
  status: SessionStatus;
  remarks?: string;
  records: AttendanceRecordOut[];
}

export interface ScheduledClassForCoverOut {
  timetable_entry_id: number;
  section_id: number;
  section_name: string;
  year: number;
  department_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  period_number: number;
  faculty_id: number;
  faculty_name: string;
  faculty_username: string;
  is_posted: boolean;
  session_status?: string | null;
}

export interface AllocationDirectoryOut {
  allocation_id: number;
  section_id: number;
  section_name: string;
  year: number;
  department_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  faculty_id: number;
  faculty_name: string;
  faculty_username: string;
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

export interface SubjectAttendanceStat {
  held: number;
  attended: number;
  percentage: number;
}

export interface ComprehensiveAttendanceRow {
  student_id: number;
  s_no: number;
  roll_no: string;
  name: string;
  subjects: {
    MFAI?: SubjectAttendanceStat;
    JAVA?: SubjectAttendanceStat;
    "FAI&ML"?: SubjectAttendanceStat;
    CN?: SubjectAttendanceStat;
    UHV?: SubjectAttendanceStat;
    "JAVA Lab"?: SubjectAttendanceStat;
    "Python Lab"?: SubjectAttendanceStat;
    "PowerBI Lab"?: SubjectAttendanceStat;
    [key: string]: SubjectAttendanceStat | undefined;
  };
  crt: SubjectAttendanceStat;
  es: SubjectAttendanceStat;
  total_max: number;
  total_obtained: number;
  percentage: number;
}

export interface AttendanceReportMetadata {
  college_name: string;
  academic_year: string;
  semester: string;
  department: string;
  year_section: string;
  class_name: string;
  report_date: string;
}

export interface FacultyAllocationDetail {
  allocation_id: number;
  section_id: number;
  section_name: string;
  academic_year: string;
  department_name: string;
  student_count: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
}

export interface RecentSessionSummary {
  id: number;
  section_id: number;
  subject_id: number;
  date: string;
  period_number: number;
  section_name: string;
  subject_name: string;
  subject_code: string;
  status: SessionStatus;
  total_students: number;
  present_count: number;
  absent_count: number;
  percentage: number;
  updated_at?: string;
}

export interface FacultyProfileData {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: Role;
  total_allocations: number;
  total_sessions_taken: number;
  total_students_taught: number;
  allocations: FacultyAllocationDetail[];
  recent_sessions: RecentSessionSummary[];
}

export interface AdminAuditLogEntry {
  login_user_id: number;
  login_username: string;
  acting_faculty_id?: number | null;
  acting_faculty_name?: string | null;
  class_faculty_id?: number | null;
  class_faculty_name?: string | null;
  action:
    | "attendance_posted"
    | "attendance_edited"
    | "attendance_overridden"
    | "session_marked_holiday"
    | "session_marked_faculty_leave"
    | string;
  section_id?: number | null;
  section_name: string;
  subject_name: string;
  period_number: number;
  session_date: string;
  timestamp: string;
  is_substitution: boolean;
}

export interface AdminAuditLogsResponse {
  items: AdminAuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}
