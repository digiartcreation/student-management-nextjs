import { z } from "zod";

export const id = z.coerce.number().int().positive();
export const money = z.coerce.number().finite().min(0).transform((value) => value.toFixed(2));
export const recordStatus = z.enum(["ACTIVE", "INACTIVE"]);
export const feeType = z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "OTHER"]);

/** `YYYY-MM`, the key a month is addressed by. */
export const monthKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format");

export const dateOnly = z.coerce.date();
