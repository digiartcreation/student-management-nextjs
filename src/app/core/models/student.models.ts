// ── Student Fee Management Models ─────────────────────────────────────────────

export interface Student {
  id: number;
  studentId: string;
  name: string;
  admissionNumber: string;
  gender: 'Male' | 'Female' | 'Other' | 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  admissionDate: string;
  academicYearId: number;
  classId: number;
  sectionId: number;
  parentName: string;
  relationship: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentMapping {
  id: number;
  student: Student;
  academicYear: string;
  class: string;
  feeStructure: string;
  installmentType: string;
  discount: number;
  waiver: number;
  feeBreakdown?: FeeBreakdownItem[];
  totalFee: number;
  netPayable: number;
}

export interface FeeBreakdownItem {
  label: string;
  amount: number;
}

export type FeeStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';

export interface FeeRecord {
  id: number;
  receiptNo: string;
  student: {
    id: number;
    studentId: string;
    name: string;
    classId: number;
    sectionId: number;
  };
  academicYearId: number;
  feeTypeId: number;
  totalFee: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: FeeStatus;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Online';

export interface Payment {
  id: number;
  installmentId: number;
  studentId: number;
  name: string;
  classId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  createdAt: string;
}

export interface Receipt {
  id: number;
  receiptNumber: string;
  paymentDate: string;
  student: {
    id: number;
    studentId: string;
    name: string;
    classId: number;
    sectionId: number;
  };
  academicYearId: number;
  feeTypeId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  previousBalance: number;
  currentPayment: number;
  remainingBalance: number;
}

export interface DashboardSummary {
  totalStudents: number;
  totalFees: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  monthlyCollection?: MonthlyCollection[];
  feeStatusDistribution?: FeeStatusCount[];
  classWisePending?: ClassWisePending[];
  recentPayments?: RecentPayment[];
}

export interface MonthlyCollection {
  month: string;
  amount: number;
}

export interface FeeStatusCount {
  status: string;
  count: number;
  amount: number;
}

export interface ClassWisePending {
  class: string;
  totalStudents: number;
  totalFees: number;
  collected: number;
  pending: number;
  overdue: number;
}

export interface RecentPayment {
  id: number;
  studentName: string;
  class: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

// Keep AppUser for user management if needed
export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  id: number;
  username: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
  menus: string[];
}
