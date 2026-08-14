import { z } from "zod";
import { recordStatus } from "./common";

export const sectionSchema = z.object({
  name: z.string().trim().min(1).max(30),
  status: recordStatus.optional(),
});
