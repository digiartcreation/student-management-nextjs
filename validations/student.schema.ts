import { z } from "zod";
import { id, recordStatus } from "./common";

export const studentSchema = z.object({
  rollNo: z.string().trim().min(1).max(30),
  name: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(3).max(30),
  sectionId: id,
  parentMobile: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Mobile must be 10-15 digits"),
  status: recordStatus.optional(),
});

export const studentStatusSchema = z.object({ status: recordStatus });
