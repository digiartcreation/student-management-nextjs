import { z } from "zod";
import { recordStatus } from "./common";

/** A year group — "10", "9", "LKG". Unique across the school. */
export const classSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Class name is required")
    .max(30, "Class name must be at most 30 characters")
    .regex(/^[A-Za-z0-9 -]+$/, "Class name may only contain letters, numbers, spaces and -"),
  status: recordStatus.optional(),
});
