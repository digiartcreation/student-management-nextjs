// ── Attendance Models ──────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';

export interface AttendanceRecord {
  id?: number;
  studentId: number;
  student?: {
    id: number;
    studentId: string;
    name: string;
    admissionNumber?: string;
    classId: number;
    sectionId: number;
  };
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  arrivalTime?: string | null; // e.g. "08:45"
  lateMinutes?: number;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSummary {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  notMarked: number;
}

export interface StudentAttendanceSummary {
  studentId: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
}

export interface MonthlyAttendance {
  date: string;
  status: AttendanceStatus;
  arrivalTime?: string | null;
  lateMinutes?: number;
  remarks?: string | null;
}

export interface AttendanceSettings {
  id?: number;
  schoolStartTime: string; // e.g. "09:00"
  lateAfterMinutes: number; // e.g. 0
  academicYearId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BulkAttendanceRecord {
  studentId: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  arrivalTime?: string | null;
  remarks?: string | null;
}

export interface BulkAttendanceRequest {
  attendanceDate: string;
  classId: number;
  sectionId: number;
  academicYearId: number;
  records: BulkAttendanceRecord[];
}

export interface AttendanceResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AcademicYear {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface SchoolClass {
  id: number;
  name: string;
  status?: string;
}

export interface SchoolSection {
  id: number;
  name: string;
  classId?: number;
  status?: string;
}
