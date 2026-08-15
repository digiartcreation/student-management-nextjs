import { AttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, NotFoundError } from "@/lib/errors";
import { formatDateOnly, isFutureDate, normalizeDateOnly, summarize } from "@/utils/attendance";
import { sectionLabel } from "@/utils/section";

/**
 * The day's roster: every active student, each carrying their saved status or
 * `NOT_MARKED`. This is what the daily-fill screen renders and posts back.
 */
export async function getRoster(filters: { date: Date; sectionId?: number }) {
  const date = normalizeDateOnly(filters.date);

  const [students, attendances] = await prisma.$transaction([
    prisma.student.findMany({
      where: { status: "ACTIVE", sectionId: filters.sectionId },
      include: { section: { include: { class: true } } },
      orderBy: [{ section: { class: { name: "asc" } } }, { section: { name: "asc" } }, { rollNo: "asc" }],
    }),
    prisma.attendance.findMany({ where: { date, student: { sectionId: filters.sectionId } } }),
  ]);

  const byStudent = new Map(attendances.map((item) => [item.studentId, item]));

  const records = students.map((student) => {
    const saved = byStudent.get(student.id);
    return {
      attendanceId: saved?.id ?? null,
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      sectionId: student.sectionId,
      sectionName: sectionLabel(student.section),
      status: (saved?.status ?? "NOT_MARKED") as AttendanceStatus | "NOT_MARKED",
      remarks: saved?.remarks ?? null,
    };
  });

  return { date: formatDateOnly(date), records, summary: summarize(records) };
}

/**
 * Saves a whole day in one transaction. Re-saving the same day overwrites it,
 * so the screen can be edited and submitted repeatedly.
 */
export async function saveAttendance(
  input: {
    date: Date;
    records: Array<{ studentId: number; status: AttendanceStatus; remarks?: string | null }>;
  },
  now = new Date(),
) {
  const date = normalizeDateOnly(input.date);
  if (isFutureDate(date, now)) {
    throw new BusinessError("Attendance cannot be filled for a future date");
  }

  const studentIds = input.records.map((record) => record.studentId);
  if (new Set(studentIds).size !== studentIds.length) {
    throw new BusinessError("The same student appears more than once");
  }

  const known = await prisma.student.findMany({
    where: { id: { in: studentIds }, status: "ACTIVE" },
    select: { id: true },
  });
  if (known.length !== studentIds.length) {
    throw new BusinessError("Every student must exist and be active");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attendance.deleteMany({ where: { date, studentId: { in: studentIds } } });
    await tx.attendance.createMany({
      data: input.records.map((record) => ({
        studentId: record.studentId,
        date,
        status: record.status,
        remarks: record.remarks ?? null,
      })),
    });
  });

  return getRoster({ date });
}

export async function getAttendance(id: number) {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { student: { include: { section: true } } },
  });
  if (!attendance) throw new NotFoundError("Attendance record not found");
  return attendance;
}

export async function updateAttendance(
  id: number,
  data: { status: AttendanceStatus; remarks?: string | null },
) {
  await getAttendance(id);
  return prisma.attendance.update({
    where: { id },
    data: { status: data.status, remarks: data.remarks ?? null },
    include: { student: { include: { section: true } } },
  });
}

export async function deleteAttendance(id: number) {
  await getAttendance(id);
  await prisma.attendance.delete({ where: { id } });
}

export async function listAttendance(filters: {
  fromDate?: Date;
  toDate?: Date;
  studentId?: number;
  sectionId?: number;
  status?: AttendanceStatus;
  page: number;
  size: number;
  skip: number;
}) {
  const where: Prisma.AttendanceWhereInput = {
    studentId: filters.studentId,
    status: filters.status,
    student: filters.sectionId ? { sectionId: filters.sectionId } : undefined,
    date:
      filters.fromDate || filters.toDate
        ? {
            gte: filters.fromDate ? normalizeDateOnly(filters.fromDate) : undefined,
            lte: filters.toDate ? normalizeDateOnly(filters.toDate) : undefined,
          }
        : undefined,
  };

  const [content, totalElements] = await prisma.$transaction([
    prisma.attendance.findMany({
      where,
      include: { student: { include: { section: true } } },
      skip: filters.skip,
      take: filters.size,
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    prisma.attendance.count({ where }),
  ]);

  return { content, totalElements };
}

/** Per-student totals over a range, for the student detail view. */
export async function getStudentAttendance(studentId: number, filters: { fromDate?: Date; toDate?: Date }) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const where: Prisma.AttendanceWhereInput = {
    studentId,
    date:
      filters.fromDate || filters.toDate
        ? {
            gte: filters.fromDate ? normalizeDateOnly(filters.fromDate) : undefined,
            lte: filters.toDate ? normalizeDateOnly(filters.toDate) : undefined,
          }
        : undefined,
  };

  const records = await prisma.attendance.findMany({ where, orderBy: { date: "desc" } });
  const summary = summarize(records.map((record) => ({ status: record.status })));

  return {
    student: { id: student.id, rollNo: student.rollNo, name: student.name },
    summary,
    records: records.map((record) => ({
      id: record.id,
      date: formatDateOnly(record.date),
      status: record.status,
      remarks: record.remarks,
    })),
  };
}
