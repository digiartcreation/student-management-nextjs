import { FeeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError, ConflictError, NotFoundError } from "@/lib/errors";
import { billedMonthOf, feeLabel } from "@/utils/fee";

const feeInclude = { student: { include: { section: true } } } satisfies Prisma.FeeInclude;

/** Sums a Decimal column, returning a plain fixed-point string. */
const sum = (rows: Array<{ amount: Prisma.Decimal }>) =>
  rows.reduce((total, row) => total.add(row.amount), new Prisma.Decimal(0)).toFixed(2);

export async function listFees(filters: {
  feeType?: FeeType;
  period?: string;
  billedMonth?: string;
  sectionId?: number;
  studentId?: number;
  paid?: boolean;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  size: number;
  skip: number;
}) {
  // The date bracket is on `paidDate` — "money collected between these days" —
  // so it answers the daily collection report. `toDate` is pushed to the end of
  // its day because paidDate carries a time, and a plain `lte` on midnight
  // would silently drop everything collected during the closing day.
  const hasDateRange = Boolean(filters.fromDate || filters.toDate);
  const endOfToDate = filters.toDate
    ? new Date(new Date(filters.toDate).setHours(23, 59, 59, 999))
    : undefined;

  const where: Prisma.FeeWhereInput = {
    feeType: filters.feeType,
    period: filters.period,
    billedMonth: filters.billedMonth,
    studentId: filters.studentId,
    // An unpaid fee has no paidDate, so it can never fall inside the bracket.
    // Saying so up front keeps the totals honest rather than leaving `paid`
    // undefined and counting rows the date filter has already excluded.
    paid: hasDateRange ? (filters.paid ?? true) : filters.paid,
    ...(hasDateRange
      ? { paidDate: { gte: filters.fromDate ?? undefined, lte: endOfToDate } }
      : {}),
    student: {
      sectionId: filters.sectionId,
      ...(filters.search
        ? { OR: [{ name: { contains: filters.search } }, { rollNo: { contains: filters.search } }] }
        : {}),
    },
  };

  const [content, totalElements, all] = await prisma.$transaction([
    prisma.fee.findMany({
      where,
      include: feeInclude,
      skip: filters.skip,
      take: filters.size,
      orderBy: [{ billedMonth: "desc" }, { feeType: "asc" }, { student: { rollNo: "asc" } }],
    }),
    prisma.fee.count({ where }),
    prisma.fee.findMany({ where, select: { amount: true, paid: true, feeType: true } }),
  ]);

  return {
    content,
    totalElements,
    totals: {
      total: sum(all),
      collected: sum(all.filter((row) => row.paid)),
      pending: sum(all.filter((row) => !row.paid)),
      paidCount: all.filter((row) => row.paid).length,
      unpaidCount: all.filter((row) => !row.paid).length,
      // Lets the screen show what the total is made of without a second call.
      byType: Object.fromEntries(
        (["MONTHLY", "QUARTERLY", "YEARLY", "OTHER"] as const).map((type) => {
          const rows = all.filter((row) => row.feeType === type);
          return [type, { count: rows.length, total: sum(rows) }];
        }),
      ),
    },
  };
}

export async function getFee(id: number) {
  const fee = await prisma.fee.findUnique({ where: { id }, include: feeInclude });
  if (!fee) throw new NotFoundError("Fee record not found");
  return fee;
}

/**
 * Creates a fee row for every active student in scope who has none for this
 * type and period. Students that already have one are skipped, so re-running is
 * safe; `overwriteUnpaid` also re-prices rows that have not been paid yet.
 */
export async function generateFees(input: {
  feeType: FeeType;
  period: string;
  title: string;
  amount: string;
  sectionId?: number | null;
  overwriteUnpaid?: boolean;
}) {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", sectionId: input.sectionId ?? undefined },
    select: { id: true },
  });
  if (!students.length) {
    throw new BusinessError("No active students found for the selected section");
  }

  const studentIds = students.map((student) => student.id);
  const existing = await prisma.fee.findMany({
    where: {
      feeType: input.feeType,
      period: input.period,
      title: input.title,
      studentId: { in: studentIds },
    },
    select: { id: true, studentId: true, paid: true },
  });

  const billed = new Set(existing.map((row) => row.studentId));
  const toCreate = studentIds.filter((studentId) => !billed.has(studentId));
  const toReprice = input.overwriteUnpaid ? existing.filter((row) => !row.paid) : [];
  const billedMonth = billedMonthOf(input.feeType, input.period);

  await prisma.$transaction(async (tx) => {
    if (toCreate.length) {
      await tx.fee.createMany({
        data: toCreate.map((studentId) => ({
          studentId,
          feeType: input.feeType,
          period: input.period,
          title: input.title,
          billedMonth,
          amount: input.amount,
        })),
      });
    }
    if (toReprice.length) {
      await tx.fee.updateMany({
        where: { id: { in: toReprice.map((row) => row.id) } },
        data: { amount: input.amount },
      });
    }
  });

  return {
    feeType: input.feeType,
    period: input.period,
    title: input.title,
    label: feeLabel(input),
    created: toCreate.length,
    repriced: toReprice.length,
    skipped: existing.length - toReprice.length,
  };
}

export async function createFee(data: {
  studentId: number;
  feeType: FeeType;
  period: string;
  title: string;
  amount: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: data.studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const existing = await prisma.fee.findUnique({
    where: {
      studentId_feeType_period_title: {
        studentId: data.studentId,
        feeType: data.feeType,
        period: data.period,
        title: data.title,
      },
    },
  });
  if (existing) throw new ConflictError(`${student.name} already has a fee for ${feeLabel(data)}`);

  return prisma.fee.create({
    data: { ...data, billedMonth: billedMonthOf(data.feeType, data.period) },
    include: feeInclude,
  });
}

export async function updateFee(id: number, data: { amount: string }) {
  await getFee(id);
  return prisma.fee.update({ where: { id }, data, include: feeInclude });
}

export async function setFeePaid(id: number, paid: boolean, paidDate?: Date | null) {
  await getFee(id);
  return prisma.fee.update({
    where: { id },
    data: { paid, paidDate: paid ? (paidDate ?? new Date()) : null },
    include: feeInclude,
  });
}

export async function deleteFee(id: number) {
  await getFee(id);
  await prisma.fee.delete({ where: { id } });
}

/**
 * Distinct periods that have fee rows, newest first — drives the period picker.
 * Ordered by the month each period bills in so a quarter and a year sit beside
 * the months they belong to rather than sorting as raw text.
 */
export async function listFeePeriods(feeType?: FeeType) {
  const rows = await prisma.fee.findMany({
    where: { feeType },
    distinct: ["feeType", "period"],
    select: { feeType: true, period: true, billedMonth: true },
    orderBy: [{ billedMonth: "desc" }, { feeType: "asc" }],
  });
  return rows.map((row) => ({ feeType: row.feeType, period: row.period, billedMonth: row.billedMonth }));
}

/** Distinct months that have fee rows, newest first. */
export async function listFeeMonths() {
  const rows = await prisma.fee.findMany({
    distinct: ["billedMonth"],
    select: { billedMonth: true },
    orderBy: { billedMonth: "desc" },
  });
  return rows.map((row) => row.billedMonth);
}
