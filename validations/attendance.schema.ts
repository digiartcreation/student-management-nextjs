import { z } from "zod";
import { dateOnly, id } from "./common";

export const attendanceStatusSchema = z.enum(["PRESENT", "LATE", "ABSENT"]);

/** Saving a day replaces that day's rows wholesale, so the whole roster is sent. */
export const attendanceSaveSchema = z.object({
  date: dateOnly,
  records: z
    .array(
      z.object({
        studentId: id,
        status: attendanceStatusSchema,
        remarks: z.string().trim().max(300).optional().nullable(),
      }),
    )
    .min(1),
});

export const attendanceUpdateSchema = z.object({
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(300).optional().nullable(),
});
