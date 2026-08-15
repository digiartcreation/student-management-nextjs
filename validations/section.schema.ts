import { z } from "zod";
import { id, recordStatus } from "./common";

/**
 * A section is now just the division letter — "A", "B" — and belongs to a class.
 * The name is only unique within that class, so every year group keeps its own A.
 */
export const sectionSchema = z.object({
  classId: id,
  name: z
    .string()
    .trim()
    .min(1, "Section name is required")
    .max(20, "Section name must be at most 20 characters")
    .regex(/^[A-Za-z0-9 -]+$/, "Section name may only contain letters, numbers, spaces and -"),
  status: recordStatus.optional(),
});
