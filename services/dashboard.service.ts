import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { formatDateOnly, normalizeDateOnly, summarize } from "@/utils/attendance";

const sum = (rows: Array<{ amount: Prisma.Decimal }>) =>
  rows.reduce((total, row) => total.add(row.amount), new Prisma.Decimal(0)).toFixed(2);

/** "2026-08" for the given date, the month fee rows are billed under. */
export const monthKeyOf = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

function previousMonths(month: string, count: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1 - offset, 1));
    months.push(monthKeyOf(date));
  }
  return months;
}

/**
 * Every fee type rolls up here, counted in the month it bills in — a quarter in
 * its first month, a year in January. Each fee therefore lands in exactly one
 * month of the trend instead of being spread across the months it covers, so
 * the six-month totals add up to what was actually charged.
 */
export async function getFeesDashboard(month: string) {
  const trailing = previousMonths(month, 6);

  const [monthRows, trendRows, unpaid, activeStudents] = await prisma.$transaction([
    prisma.fee.findMany({
      where: { billedMonth: month },
      select: { amount: true, paid: true, feeType: true, studentId: true },
    }),
    prisma.fee.findMany({
      where: { billedMonth: { in: trailing } },
      select: { billedMonth: true, amount: true, paid: true },
    }),
    prisma.fee.findMany({
      where: { billedMonth: month, paid: false },
      include: { student: { include: { section: true } } },
      orderBy: { amount: "desc" },
      take: 10,
    }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
  ]);

  const collectedRows = monthRows.filter((row) => row.paid);
  const total = sum(monthRows);
  const collected = sum(collectedRows);
  const pending = sum(monthRows.filter((row) => !row.paid));

  // A student can carry several charges in one month, so the headline counts
  // are of distinct students rather than of rows.
  const distinct = (rows: Array<{ studentId: number }>) => new Set(rows.map((row) => row.studentId)).size;
  const unpaidRows = monthRows.filter((row) => !row.paid);

  return {
    month,
    activeStudents,
    billedStudents: distinct(monthRows),
    paidStudents: distinct(collectedRows),
    unpaidStudents: distinct(unpaidRows),
    billedRecords: monthRows.length,
    total,
    collected,
    pending,
    collectionPercentage:
      Number(total) === 0 ? 0 : Number(((Number(collected) / Number(total)) * 100).toFixed(1)),
    byType: (["MONTHLY", "QUARTERLY", "YEARLY", "OTHER"] as const).map((feeType) => {
      const rows = monthRows.filter((row) => row.feeType === feeType);
      return {
        feeType,
        count: rows.length,
        total: sum(rows),
        collected: sum(rows.filter((row) => row.paid)),
        pending: sum(rows.filter((row) => !row.paid)),
      };
    }),
    trend: trailing.map((key) => {
      const rows = trendRows.filter((row) => row.billedMonth === key);
      return {
        month: key,
        total: sum(rows),
        collected: sum(rows.filter((row) => row.paid)),
        pending: sum(rows.filter((row) => !row.paid)),
      };
    }),
    topUnpaid: unpaid.map((fee) => ({
      id: fee.id,
      studentId: fee.studentId,
      rollNo: fee.student.rollNo,
      name: fee.student.name,
      section: fee.student.section.name,
      feeType: fee.feeType,
      period: fee.period,
      title: fee.title,
      amount: fee.amount.toFixed(2),
    })),
  };
}

/**
 * One student's attendance and fees, shaped for the charts on the student
 * dashboard. The window is the six months ending at `month`, which is what both
 * trends are drawn over; the fee totals alongside them are lifetime, so the
 * screen can say what a student owes overall and not just inside the window.
 */
export async function getStudentDashboard(studentId: number, month: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { section: true },
  });
  if (!student) throw new NotFoundError("Student not found");

  const trailing = previousMonths(month, 6);
  const [year, monthNumber] = month.split("-").map(Number);
  const windowStart = new Date(Date.UTC(year, monthNumber - 6, 1));
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));

  const [windowAttendance, lifetimeAttendance, fees] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: { studentId, date: { gte: windowStart, lte: monthEnd } },
      select: { date: true, status: true, remarks: true },
      orderBy: { date: "desc" },
    }),
    prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
    prisma.fee.findMany({
      where: { studentId },
      orderBy: [{ billedMonth: "desc" }, { feeType: "asc" }],
    }),
  ]);

  const inMonth = windowAttendance.filter(
    (row) => row.date >= monthStart && row.date <= monthEnd,
  );
  const unpaid = fees.filter((fee) => !fee.paid);

  return {
    month,
    student: {
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      age: student.age,
      section: student.section.name,
      sectionId: student.sectionId,
      parentMobile: student.parentMobile,
      status: student.status,
    },
    attendance: {
      month: summarize(inMonth.map((row) => ({ status: row.status }))),
      lifetime: summarize(lifetimeAttendance.map((row) => ({ status: row.status }))),
      trend: trailing.map((key) => {
        const rows = windowAttendance.filter((row) => formatDateOnly(row.date).slice(0, 7) === key);
        const counts = summarize(rows.map((row) => ({ status: row.status })));
        return {
          month: key,
          present: counts.present,
          late: counts.late,
          absent: counts.absent,
          attendancePercentage: counts.attendancePercentage,
        };
      }),
      // Only the days worth explaining — a present day tells the reader nothing.
      recentAbsences: windowAttendance
        .filter((row) => row.status !== "PRESENT")
        .slice(0, 10)
        .map((row) => ({
          date: formatDateOnly(row.date),
          status: row.status,
          remarks: row.remarks,
        })),
    },
    fees: {
      totals: {
        total: sum(fees),
        collected: sum(fees.filter((fee) => fee.paid)),
        pending: sum(unpaid),
        paidCount: fees.length - unpaid.length,
        unpaidCount: unpaid.length,
      },
      byType: (["MONTHLY", "QUARTERLY", "YEARLY", "OTHER"] as const).map((feeType) => {
        const rows = fees.filter((fee) => fee.feeType === feeType);
        return {
          feeType,
          count: rows.length,
          total: sum(rows),
          collected: sum(rows.filter((fee) => fee.paid)),
          pending: sum(rows.filter((fee) => !fee.paid)),
        };
      }),
      trend: trailing.map((key) => {
        const rows = fees.filter((fee) => fee.billedMonth === key);
        return {
          month: key,
          total: sum(rows),
          collected: sum(rows.filter((fee) => fee.paid)),
          pending: sum(rows.filter((fee) => !fee.paid)),
        };
      }),
      unpaid: unpaid.map((fee) => ({
        id: fee.id,
        feeType: fee.feeType,
        period: fee.period,
        title: fee.title,
        billedMonth: fee.billedMonth,
        amount: fee.amount.toFixed(2),
      })),
    },
  };
}

export async function getAttendanceDashboard(input: { date: Date; month: string }) {
  const date = normalizeDateOnly(input.date);
  const [year, monthNumber] = input.month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));

  const [activeStudents, todayRows, monthRows, sections] = await prisma.$transaction([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.attendance.findMany({ where: { date }, select: { status: true } }),
    prisma.attendance.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { date: true, status: true, studentId: true, student: { select: { sectionId: true } } },
    }),
    prisma.section.findMany({ orderBy: { name: "asc" } }),
  ]);

  const today = summarize(todayRows.map((row) => ({ status: row.status })));

  // One point per day that has records, so gaps are absent from the chart
  // rather than drawn as zero-attendance days.
  const byDate = new Map<string, Array<{ status: (typeof monthRows)[number]["status"] }>>();
  monthRows.forEach((row) => {
    const key = formatDateOnly(row.date);
    const bucket = byDate.get(key) ?? [];
    bucket.push({ status: row.status });
    byDate.set(key, bucket);
  });

  const daily = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rows]) => {
      const counts = summarize(rows);
      return {
        date: day,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        attendancePercentage: counts.attendancePercentage,
      };
    });

  const bySection = sections
    .map((section) => {
      const rows = monthRows.filter((row) => row.student.sectionId === section.id);
      const counts = summarize(rows.map((row) => ({ status: row.status })));
      return {
        sectionId: section.id,
        section: section.name,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        attendancePercentage: counts.attendancePercentage,
      };
    })
    .filter((row) => row.present + row.late + row.absent > 0);

  const absencesByStudent = new Map<number, { absent: number; late: number }>();
  monthRows.forEach((row) => {
    if (row.status === "PRESENT") return;
    const current = absencesByStudent.get(row.studentId) ?? { absent: 0, late: 0 };
    if (row.status === "ABSENT") current.absent += 1;
    else current.late += 1;
    absencesByStudent.set(row.studentId, current);
  });

  const topIds = [...absencesByStudent.entries()]
    .sort((a, b) => b[1].absent - a[1].absent || b[1].late - a[1].late)
    .slice(0, 10)
    .map(([studentId]) => studentId);

  const topStudents = topIds.length
    ? await prisma.student.findMany({ where: { id: { in: topIds } }, include: { section: true } })
    : [];

  const topAbsentees = topIds.map((studentId) => {
    const student = topStudents.find((item) => item.id === studentId);
    const counts = absencesByStudent.get(studentId)!;
    return {
      studentId,
      rollNo: student?.rollNo ?? "",
      name: student?.name ?? "",
      section: student?.section.name ?? "",
      absentDays: counts.absent,
      lateDays: counts.late,
    };
  });

  return {
    date: formatDateOnly(date),
    month: input.month,
    activeStudents,
    today: { ...today, notMarked: Math.max(0, activeStudents - today.marked) },
    monthSummary: summarize(monthRows.map((row) => ({ status: row.status }))),
    daily,
    bySection,
    topAbsentees,
  };
}
