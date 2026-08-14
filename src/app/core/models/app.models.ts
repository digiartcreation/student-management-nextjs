// ── Wire shapes for the simple API ───────────────────────────────────────────
// Money arrives as fixed-point decimal strings ("1500.00"); dates as ISO strings
// except `month`, which is a plain "YYYY-MM" key.

export type RecordStatus = 'ACTIVE' | 'INACTIVE';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';
export type RosterStatus = AttendanceStatus | 'NOT_MARKED';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT'];

export interface Section {
  id: number;
  name: string;
  status: RecordStatus;
  studentCount?: number;
}

export interface Student {
  id: number;
  rollNo: string;
  name: string;
  age: number;
  sectionId: number;
  parentMobile: string;
  status: RecordStatus;
  section?: Section;
}

export interface StudentPayload {
  rollNo: string;
  name: string;
  age: number;
  sectionId: number;
  parentMobile: string;
  status?: RecordStatus;
}

/** One row of the daily-fill screen. */
export interface RosterRow {
  attendanceId: number | null;
  studentId: number;
  rollNo: string;
  name: string;
  sectionId: number;
  sectionName: string;
  status: RosterStatus;
  remarks: string | null;
}

export interface AttendanceSummary {
  total: number;
  marked: number;
  notMarked: number;
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
}

export interface Roster {
  date: string;
  records: RosterRow[];
  summary: AttendanceSummary;
}

export type FeeType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'OTHER';

export const FEE_TYPES: FeeType[] = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'OTHER'];

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  OTHER: 'Other',
};

/**
 * A billed charge. `period` reads differently per type — "2026-08" monthly,
 * "2026-Q3" quarterly, "2026" yearly, and the month it falls in for a one-off
 * `OTHER` charge, which is the only type that carries a `title`. `billedMonth`
 * is the month the charge counts in, which is what the month filter and the
 * dashboard go by.
 */
export interface Fee {
  id: number;
  studentId: number;
  feeType: FeeType;
  period: string;
  title: string;
  billedMonth: string;
  amount: string;
  paid: boolean;
  paidDate: string | null;
  student?: Student;
}

export interface FeePayload {
  studentId: number;
  feeType: FeeType;
  period: string;
  title?: string;
  amount: number;
}

export interface FeeTotals {
  total: string;
  collected: string;
  pending: string;
  paidCount: number;
  unpaidCount: number;
  byType: Record<FeeType, { count: number; total: string }>;
}

export interface FeePage {
  content: Fee[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totals: FeeTotals;
}

export interface FeePeriod {
  feeType: FeeType;
  period: string;
  billedMonth: string;
}

export interface GenerateResult {
  feeType: FeeType;
  period: string;
  title: string;
  label: string;
  created: number;
  repriced: number;
  skipped: number;
}

export interface FeesDashboard {
  month: string;
  activeStudents: number;
  billedStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  total: string;
  collected: string;
  pending: string;
  billedRecords: number;
  collectionPercentage: number;
  byType: Array<{
    feeType: FeeType;
    count: number;
    total: string;
    collected: string;
    pending: string;
  }>;
  trend: Array<{ month: string; total: string; collected: string; pending: string }>;
  topUnpaid: Array<{
    id: number;
    studentId: number;
    rollNo: string;
    name: string;
    section: string;
    feeType: FeeType;
    period: string;
    title: string;
    amount: string;
  }>;
}

export interface AttendanceDashboard {
  date: string;
  month: string;
  activeStudents: number;
  today: AttendanceSummary & { notMarked: number };
  monthSummary: AttendanceSummary;
  daily: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    attendancePercentage: number;
  }>;
  bySection: Array<{
    sectionId: number;
    section: string;
    present: number;
    late: number;
    absent: number;
    attendancePercentage: number;
  }>;
  topAbsentees: Array<{
    studentId: number;
    rollNo: string;
    name: string;
    section: string;
    absentDays: number;
    lateDays: number;
  }>;
}

/**
 * One student's attendance and fees. Both trends cover the six months ending at
 * `month`; the fee `totals` beside them are lifetime, so the card can say what a
 * student owes overall and not just inside that window.
 */
export interface StudentDashboard {
  month: string;
  student: {
    id: number;
    rollNo: string;
    name: string;
    age: number;
    section: string;
    sectionId: number;
    parentMobile: string;
    status: RecordStatus;
  };
  attendance: {
    month: AttendanceSummary;
    lifetime: AttendanceSummary;
    trend: Array<{
      month: string;
      present: number;
      late: number;
      absent: number;
      attendancePercentage: number;
    }>;
    recentAbsences: Array<{ date: string; status: AttendanceStatus; remarks: string | null }>;
  };
  fees: {
    /** Lifetime, and without the `byType` map — the split is the sibling array. */
    totals: {
      total: string;
      collected: string;
      pending: string;
      paidCount: number;
      unpaidCount: number;
    };
    byType: Array<{
      feeType: FeeType;
      count: number;
      total: string;
      collected: string;
      pending: string;
    }>;
    trend: Array<{ month: string; total: string; collected: string; pending: string }>;
    unpaid: Array<{
      id: number;
      feeType: FeeType;
      period: string;
      title: string;
      billedMonth: string;
      amount: string;
    }>;
  };
}
