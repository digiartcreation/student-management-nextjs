import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

// ── Mock Data: Student Fee Management ────────────────────────────────────────

const STUDENTS = [
  { id: 1, studentId: 'STU-001', studentName: 'Aarav Sharma', admissionNumber: 'ADM-2025-001', gender: 'Male', dateOfBirth: '2010-03-15', admissionDate: '2024-04-01', academicYear: '2025-26', class: '10-A', section: 'A', parentName: 'Rajesh Sharma', relationship: 'Father', mobile: '9876543210', email: 'rajesh@email.com', address: '123 MG Road, Chennai', status: 'Active' },
  { id: 2, studentId: 'STU-002', studentName: 'Priya Patel', admissionNumber: 'ADM-2025-002', gender: 'Female', dateOfBirth: '2011-07-22', admissionDate: '2024-04-01', academicYear: '2025-26', class: '9-B', section: 'B', parentName: 'Suresh Patel', relationship: 'Father', mobile: '9876543211', email: 'suresh@email.com', address: '45 Anna Nagar, Chennai', status: 'Active' },
  { id: 3, studentId: 'STU-003', studentName: 'Arjun Kumar', admissionNumber: 'ADM-2025-003', gender: 'Male', dateOfBirth: '2010-11-08', admissionDate: '2024-04-01', academicYear: '2025-26', class: '10-A', section: 'A', parentName: 'Vijay Kumar', relationship: 'Father', mobile: '9876543212', email: 'vijay@email.com', address: '78 T Nagar, Chennai', status: 'Active' },
  { id: 4, studentId: 'STU-004', studentName: 'Diya Singh', admissionNumber: 'ADM-2025-004', gender: 'Female', dateOfBirth: '2011-01-30', admissionDate: '2024-04-01', academicYear: '2025-26', class: '9-A', section: 'A', parentName: 'Amit Singh', relationship: 'Father', mobile: '9876543213', email: 'amit@email.com', address: '12 Adyar, Chennai', status: 'Active' },
  { id: 5, studentId: 'STU-005', studentName: 'Kabir Ali', admissionNumber: 'ADM-2025-005', gender: 'Male', dateOfBirth: '2010-06-14', admissionDate: '2024-04-01', academicYear: '2025-26', class: '10-B', section: 'B', parentName: 'Mohammed Ali', relationship: 'Father', mobile: '9876543214', email: 'mohammed@email.com', address: '90 Mylapore, Chennai', status: 'Active' },
  { id: 6, studentId: 'STU-006', studentName: 'Ananya Reddy', admissionNumber: 'ADM-2025-006', gender: 'Female', dateOfBirth: '2012-04-25', admissionDate: '2024-04-01', academicYear: '2025-26', class: '8-A', section: 'A', parentName: 'Venkat Reddy', relationship: 'Father', mobile: '9876543215', email: 'venkat@email.com', address: '34 Velachery, Chennai', status: 'Active' },
  { id: 7, studentId: 'STU-007', studentName: 'Rohan Joshi', admissionNumber: 'ADM-2025-007', gender: 'Male', dateOfBirth: '2011-09-12', admissionDate: '2024-04-01', academicYear: '2025-26', class: '9-A', section: 'A', parentName: 'Manoj Joshi', relationship: 'Father', mobile: '9876543216', email: 'manoj@email.com', address: '56 Porur, Chennai', status: 'Inactive' },
  { id: 8, studentId: 'STU-008', studentName: 'Sara Khan', admissionNumber: 'ADM-2025-008', gender: 'Female', dateOfBirth: '2010-12-03', admissionDate: '2024-04-01', academicYear: '2025-26', class: '10-A', section: 'A', parentName: 'Imran Khan', relationship: 'Father', mobile: '9876543217', email: 'imran@email.com', address: '67 Tambaram, Chennai', status: 'Active' },
];

const FEES = [
  { id: 1, receiptNo: 'RCP-2025-001', student: { id: 1, studentId: 'STU-001', studentName: 'Aarav Sharma', class: '10-A', section: 'A' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 48000, paid: 48000, balance: 0, dueDate: '2025-06-30', status: 'PAID', createdAt: '2025-04-15' },
  { id: 2, receiptNo: 'RCP-2025-002', student: { id: 2, studentId: 'STU-002', studentName: 'Priya Patel', class: '9-B', section: 'B' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 42000, paid: 25000, balance: 17000, dueDate: '2025-06-30', status: 'PARTIAL', createdAt: '2025-04-15' },
  { id: 3, receiptNo: 'RCP-2025-003', student: { id: 3, studentId: 'STU-003', studentName: 'Arjun Kumar', class: '10-A', section: 'A' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 48000, paid: 0, balance: 48000, dueDate: '2025-06-30', status: 'PENDING', createdAt: '2025-04-15' },
  { id: 4, receiptNo: 'RCP-2025-004', student: { id: 4, studentId: 'STU-004', studentName: 'Diya Singh', class: '9-A', section: 'A' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 42000, paid: 0, balance: 42000, dueDate: '2025-05-31', status: 'OVERDUE', createdAt: '2025-04-15' },
  { id: 5, receiptNo: 'RCP-2025-005', student: { id: 5, studentId: 'STU-005', studentName: 'Kabir Ali', class: '10-B', section: 'B' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 48000, paid: 48000, balance: 0, dueDate: '2025-06-30', status: 'PAID', createdAt: '2025-04-15' },
  { id: 6, receiptNo: 'RCP-2025-006', student: { id: 6, studentId: 'STU-006', studentName: 'Ananya Reddy', class: '8-A', section: 'A' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 36000, paid: 18000, balance: 18000, dueDate: '2025-06-30', status: 'PARTIAL', createdAt: '2025-04-15' },
  { id: 7, receiptNo: 'RCP-2025-007', student: { id: 7, studentId: 'STU-007', studentName: 'Rohan Joshi', class: '9-A', section: 'A' }, academicYear: '2025-26', feeType: 'Transport', totalFee: 12000, paid: 0, balance: 12000, dueDate: '2025-05-15', status: 'OVERDUE', createdAt: '2025-04-15' },
  { id: 8, receiptNo: 'RCP-2025-008', student: { id: 8, studentId: 'STU-008', studentName: 'Sara Khan', class: '10-A', section: 'A' }, academicYear: '2025-26', feeType: 'Tuition', totalFee: 48000, paid: 0, balance: 48000, dueDate: '2025-07-31', status: 'PENDING', createdAt: '2025-04-15' },
];

const DASHBOARD_SUMMARY = {
  totalStudents: 520,
  totalFees: 2540000,
  totalCollected: 1980000,
  totalPending: 560000,
  totalOverdue: 120000,
  monthlyCollection: [
    { month: 'Apr', amount: 450000 },
    { month: 'May', amount: 380000 },
    { month: 'Jun', amount: 420000 },
    { month: 'Jul', amount: 350000 },
    { month: 'Aug', amount: 380000 },
  ],
  feeStatusDistribution: [
    { status: 'Paid', count: 280, amount: 1980000 },
    { status: 'Partial', count: 95, amount: 320000 },
    { status: 'Pending', count: 105, amount: 240000 },
    { status: 'Overdue', count: 40, amount: 120000 },
  ],
  classWisePending: [
    { class: '10-A', totalStudents: 45, totalFees: 480000, collected: 380000, pending: 72000, overdue: 28000 },
    { class: '10-B', totalStudents: 42, totalFees: 450000, collected: 400000, pending: 35000, overdue: 15000 },
    { class: '9-A', totalStudents: 48, totalFees: 420000, collected: 320000, pending: 68000, overdue: 32000 },
    { class: '9-B', totalStudents: 44, totalFees: 400000, collected: 340000, pending: 42000, overdue: 18000 },
    { class: '8-A', totalStudents: 50, totalFees: 360000, collected: 280000, pending: 55000, overdue: 25000 },
    { class: '8-B', totalStudents: 46, totalFees: 340000, collected: 260000, pending: 58000, overdue: 22000 },
  ],
  recentPayments: [
    { id: 1, studentName: 'Aarav Sharma', class: '10-A', amount: 24000, paymentDate: '2025-08-10', paymentMethod: 'UPI' },
    { id: 2, studentName: 'Kabir Ali', class: '10-B', amount: 48000, paymentDate: '2025-08-09', paymentMethod: 'Bank Transfer' },
    { id: 3, studentName: 'Priya Patel', class: '9-B', amount: 15000, paymentDate: '2025-08-08', paymentMethod: 'Cash' },
    { id: 4, studentName: 'Ananya Reddy', class: '8-A', amount: 18000, paymentDate: '2025-08-07', paymentMethod: 'UPI' },
  ],
};

// ── Interceptor ──────────────────────────────────────────────────────────────

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);

  const path   = req.url.replace('/api', '');
  const method = req.method;

  let body: unknown = null;

  if (method === 'POST' && path === '/auth/login') {
    body = {
      success: true,
      message: 'Login successful',
      data: {
        id: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
        menus: ['Dashboard', 'Students', 'Fees']
      }
    };
  } else if (method === 'GET') {
    if (path === '/dashboard/summary') {
      body = { data: DASHBOARD_SUMMARY };
    } else if (path === '/students') {
      body = { data: STUDENTS };
    } else if (path.startsWith('/fees')) {
      // /fees or /fees?status=...
      const url = new URL('http://localhost' + req.url);
      const status = url.searchParams.get('status');
      let data = FEES;
      if (status) {
        data = FEES.filter(f => f.status === status);
      }
      body = { data };
    }
  } else if (method === 'POST') {
    if (path === '/students') {
      const newStudent = { id: STUDENTS.length + 1, ...req.body as any };
      body = { data: newStudent };
    } else if (path === '/payments') {
      body = { data: { success: true } };
    }
  } else if (method === 'PUT' && path.startsWith('/students/')) {
    body = { data: { ...req.body as any } };
  }

  if (body !== null) {
    return of(new HttpResponse({ status: 200, body })).pipe(delay(300));
  }

  return next(req);
};
