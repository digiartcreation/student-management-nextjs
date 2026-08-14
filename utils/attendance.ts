import type { AttendanceStatus } from "@prisma/client";

/** Strips the time part so a date compares equal regardless of the caller's clock. */
export function normalizeDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function formatDateOnly(value: Date) {
  return normalizeDateOnly(value).toISOString().slice(0, 10);
}

export function isFutureDate(value: Date, now = new Date()) {
  return normalizeDateOnly(value).getTime() > normalizeDateOnly(now).getTime();
}

export type RosterEntry = { status: AttendanceStatus | "NOT_MARKED" };

export function summarize(entries: RosterEntry[]) {
  const present = entries.filter((entry) => entry.status === "PRESENT").length;
  const late = entries.filter((entry) => entry.status === "LATE").length;
  const absent = entries.filter((entry) => entry.status === "ABSENT").length;
  const notMarked = entries.filter((entry) => entry.status === "NOT_MARKED").length;
  const total = entries.length;
  const marked = present + late + absent;

  return {
    total,
    marked,
    notMarked,
    present,
    late,
    absent,
    // Late still counts as attended — the student was in class, just not on time.
    attendancePercentage: marked ? Number((((present + late) / marked) * 100).toFixed(1)) : 0,
  };
}

/** Inclusive weekday count, used as the denominator for attendance rates. */
export function workingDaysBetween(start: Date, end: Date) {
  const from = normalizeDateOnly(start);
  const to = normalizeDateOnly(end);
  if (from.getTime() > to.getTime()) return 0;

  let count = 0;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
