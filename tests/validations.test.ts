import { describe, expect, it } from "vitest";
import { monthKey, money } from "@/validations/common";
import { BLOOD_GROUPS, studentSchema } from "@/validations/student.schema";
import { sectionSchema } from "@/validations/section.schema";
import { classSchema } from "@/validations/class.schema";
import { feeGenerateSchema, feeSchema } from "@/validations/fee.schema";
import { attendanceSaveSchema } from "@/validations/attendance.schema";
import { billedMonthOf } from "@/utils/fee";

describe("monthKey", () => {
  it("accepts a YYYY-MM key", () => {
    expect(monthKey.parse("2026-08")).toBe("2026-08");
  });

  it("rejects a bad month number", () => {
    expect(monthKey.safeParse("2026-13").success).toBe(false);
  });

  it("rejects a full date", () => {
    expect(monthKey.safeParse("2026-08-13").success).toBe(false);
  });
});

describe("money", () => {
  it("normalizes to two decimal places", () => {
    expect(money.parse(1500)).toBe("1500.00");
    expect(money.parse("1500.5")).toBe("1500.50");
  });

  it("rejects negatives", () => {
    expect(money.safeParse(-1).success).toBe(false);
  });
});

describe("studentSchema", () => {
  const valid = {
    rollNo: "R101",
    name: "Rahul Kumar",
    age: 15,
    sectionId: 1,
    parentMobile: "9876543210",
    fatherName: "Suresh Kumar",
    motherName: "Lata Kumar",
    fatherMobile: "9876543210",
    motherMobile: "9876543211",
    address: "12 Gandhi Street, Chennai",
    bloodGroup: "O+",
    joiningDate: "2026-06-01",
  };

  it("accepts a valid student", () => {
    expect(studentSchema.parse(valid).name).toBe("Rahul Kumar");
  });

  it("coerces a numeric string age", () => {
    expect(studentSchema.parse({ ...valid, age: "15" }).age).toBe(15);
  });

  it("rejects an implausible age", () => {
    expect(studentSchema.safeParse({ ...valid, age: 1 }).success).toBe(false);
    expect(studentSchema.safeParse({ ...valid, age: 99 }).success).toBe(false);
  });

  it("rejects a malformed mobile", () => {
    expect(studentSchema.safeParse({ ...valid, parentMobile: "12345" }).success).toBe(false);
  });

  it("requires every guardian field", () => {
    for (const field of ["fatherName", "motherName", "fatherMobile", "motherMobile"] as const) {
      const without: Record<string, unknown> = { ...valid };
      delete without[field];
      expect(studentSchema.safeParse(without).success).toBe(false);
    }
  });

  it("rejects a mobile on any of the three contact fields", () => {
    for (const field of ["parentMobile", "fatherMobile", "motherMobile"] as const) {
      expect(studentSchema.safeParse({ ...valid, [field]: "abc" }).success).toBe(false);
    }
  });

  it("accepts only the eight real blood groups", () => {
    for (const group of BLOOD_GROUPS) {
      expect(studentSchema.safeParse({ ...valid, bloodGroup: group }).success).toBe(true);
    }
    expect(studentSchema.safeParse({ ...valid, bloodGroup: "C+" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...valid, bloodGroup: "" }).success).toBe(false);
  });

  it("rejects a joining date in the future", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(studentSchema.safeParse({ ...valid, joiningDate: tomorrow }).success).toBe(false);
  });

  it("rejects a name made of digits or symbols", () => {
    expect(studentSchema.safeParse({ ...valid, name: "12345" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...valid, fatherName: "<script>" }).success).toBe(false);
  });

  it("requires an address of a usable length", () => {
    expect(studentSchema.safeParse({ ...valid, address: "abc" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...valid, address: "x".repeat(501) }).success).toBe(false);
  });
});

describe("sectionSchema", () => {
  it("requires a class", () => {
    expect(sectionSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(sectionSchema.safeParse({ classId: 1, name: "A" }).success).toBe(true);
  });

  it("rejects a blank or over-long name", () => {
    expect(sectionSchema.safeParse({ classId: 1, name: "  " }).success).toBe(false);
    expect(sectionSchema.safeParse({ classId: 1, name: "A".repeat(21) }).success).toBe(false);
  });
});

describe("classSchema", () => {
  it("accepts a year group name", () => {
    expect(classSchema.parse({ name: "10" }).name).toBe("10");
    expect(classSchema.parse({ name: "LKG" }).name).toBe("LKG");
  });

  it("rejects a blank name or stray punctuation", () => {
    expect(classSchema.safeParse({ name: "" }).success).toBe(false);
    expect(classSchema.safeParse({ name: "10/A" }).success).toBe(false);
  });
});

describe("feeGenerateSchema", () => {
  it("normalizes the amount", () => {
    expect(feeGenerateSchema.parse({ period: "2026-08", amount: 1500 }).amount).toBe("1500.00");
  });

  it("defaults to a monthly fee", () => {
    expect(feeGenerateSchema.parse({ period: "2026-08", amount: 1500 }).feeType).toBe("MONTHLY");
  });

  it("rejects a missing period", () => {
    expect(feeGenerateSchema.safeParse({ amount: 1500 }).success).toBe(false);
  });
});

describe("feeSchema period rules", () => {
  const entry = { studentId: 1, amount: 1500 };

  it("accepts each type in its own period shape", () => {
    expect(feeSchema.parse({ ...entry, feeType: "MONTHLY", period: "2026-08" }).period).toBe("2026-08");
    expect(feeSchema.parse({ ...entry, feeType: "QUARTERLY", period: "2026-Q3" }).period).toBe("2026-Q3");
    expect(feeSchema.parse({ ...entry, feeType: "YEARLY", period: "2026" }).period).toBe("2026");
  });

  it("rejects a period that belongs to another type", () => {
    expect(feeSchema.safeParse({ ...entry, feeType: "QUARTERLY", period: "2026-08" }).success).toBe(false);
    expect(feeSchema.safeParse({ ...entry, feeType: "YEARLY", period: "2026-Q1" }).success).toBe(false);
    expect(feeSchema.safeParse({ ...entry, feeType: "MONTHLY", period: "2026" }).success).toBe(false);
  });

  it("rejects a quarter outside 1-4", () => {
    expect(feeSchema.safeParse({ ...entry, feeType: "QUARTERLY", period: "2026-Q5" }).success).toBe(false);
  });

  it("requires a one-off charge to be named", () => {
    expect(feeSchema.safeParse({ ...entry, feeType: "OTHER", period: "2026-08" }).success).toBe(false);
    expect(
      feeSchema.parse({ ...entry, feeType: "OTHER", period: "2026-08", title: "Bus fee" }).title,
    ).toBe("Bus fee");
  });

  it("drops a title from the recurring types, so the unique key stays honest", () => {
    expect(feeSchema.parse({ ...entry, feeType: "MONTHLY", period: "2026-08", title: "Tuition" }).title).toBe("");
  });
});

describe("billedMonthOf", () => {
  it("bills a quarter at its first month and a year in January", () => {
    expect(billedMonthOf("QUARTERLY", "2026-Q1")).toBe("2026-01");
    expect(billedMonthOf("QUARTERLY", "2026-Q3")).toBe("2026-07");
    expect(billedMonthOf("QUARTERLY", "2026-Q4")).toBe("2026-10");
    expect(billedMonthOf("YEARLY", "2026")).toBe("2026-01");
  });

  it("leaves a month-keyed fee where it is", () => {
    expect(billedMonthOf("MONTHLY", "2026-08")).toBe("2026-08");
    expect(billedMonthOf("OTHER", "2026-08")).toBe("2026-08");
  });
});

describe("attendanceSaveSchema", () => {
  it("accepts a day of records", () => {
    const parsed = attendanceSaveSchema.parse({
      date: "2026-08-13",
      records: [{ studentId: 1, status: "PRESENT" }],
    });
    expect(parsed.records).toHaveLength(1);
  });

  it("rejects an empty roster", () => {
    expect(attendanceSaveSchema.safeParse({ date: "2026-08-13", records: [] }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = attendanceSaveSchema.safeParse({
      date: "2026-08-13",
      records: [{ studentId: 1, status: "HALF_DAY" }],
    });
    expect(result.success).toBe(false);
  });
});
