import { describe, expect, it } from "vitest";
import { formatDateOnly, isFutureDate, normalizeDateOnly, summarize, workingDaysBetween } from "@/utils/attendance";

describe("normalizeDateOnly", () => {
  it("drops the time so the same day compares equal regardless of clock", () => {
    const morning = new Date("2026-08-13T01:30:00.000Z");
    const evening = new Date("2026-08-13T23:45:00.000Z");
    expect(normalizeDateOnly(morning).getTime()).toBe(normalizeDateOnly(evening).getTime());
  });

  it("formats as YYYY-MM-DD", () => {
    expect(formatDateOnly(new Date("2026-08-13T18:00:00.000Z"))).toBe("2026-08-13");
  });
});

describe("isFutureDate", () => {
  const today = new Date("2026-08-13T12:00:00.000Z");

  it("treats later dates as future", () => {
    expect(isFutureDate(new Date("2026-08-14T00:00:00.000Z"), today)).toBe(true);
  });

  it("treats the same day as not future even at a later hour", () => {
    expect(isFutureDate(new Date("2026-08-13T23:59:00.000Z"), today)).toBe(false);
  });

  it("treats past dates as not future", () => {
    expect(isFutureDate(new Date("2026-08-12T00:00:00.000Z"), today)).toBe(false);
  });
});

describe("summarize", () => {
  it("counts each status", () => {
    const result = summarize([
      { status: "PRESENT" },
      { status: "PRESENT" },
      { status: "LATE" },
      { status: "ABSENT" },
      { status: "NOT_MARKED" },
    ]);
    expect(result).toMatchObject({ total: 5, marked: 4, notMarked: 1, present: 2, late: 1, absent: 1 });
  });

  it("counts late as attended", () => {
    const result = summarize([{ status: "PRESENT" }, { status: "LATE" }, { status: "ABSENT" }, { status: "ABSENT" }]);
    expect(result.attendancePercentage).toBe(50);
  });

  it("excludes unmarked students from the percentage", () => {
    const result = summarize([{ status: "PRESENT" }, { status: "NOT_MARKED" }]);
    expect(result.attendancePercentage).toBe(100);
  });

  it("returns zero rather than dividing by zero", () => {
    expect(summarize([]).attendancePercentage).toBe(0);
    expect(summarize([{ status: "NOT_MARKED" }]).attendancePercentage).toBe(0);
  });
});

describe("workingDaysBetween", () => {
  it("counts weekdays inclusively", () => {
    // Mon 2026-08-10 .. Fri 2026-08-14
    expect(workingDaysBetween(new Date("2026-08-10"), new Date("2026-08-14"))).toBe(5);
  });

  it("skips weekends", () => {
    // Sat 2026-08-15 .. Sun 2026-08-16
    expect(workingDaysBetween(new Date("2026-08-15"), new Date("2026-08-16"))).toBe(0);
  });

  it("returns 0 when the range is inverted", () => {
    expect(workingDaysBetween(new Date("2026-08-14"), new Date("2026-08-10"))).toBe(0);
  });
});
