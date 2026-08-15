import { z } from "zod";
import { id, recordStatus } from "./common";

/**
 * The eight groups a blood group can be. Kept as a plain list rather than a
 * database enum: the column has to tolerate the empty string left behind for
 * students who predate the field, and an enum could not express that without
 * inventing a meaningless member.
 */
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/**
 * Indian mobile numbers, optionally with a country code. Shared by the three
 * contact fields so one rule governs them all.
 */
const mobile = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, `${label} must be 10-15 digits`);

/** A person's name: letters, spaces and the punctuation names actually carry. */
const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(120, `${label} must be at most 120 characters`)
    .regex(/^[\p{L}][\p{L}\s.'-]*$/u, `${label} may only contain letters, spaces, . ' and -`);

export const studentSchema = z.object({
  rollNo: z
    .string()
    .trim()
    .min(1, "Roll number is required")
    .max(30, "Roll number must be at most 30 characters")
    .regex(/^[A-Za-z0-9/-]+$/, "Roll number may only contain letters, numbers, - and /"),
  name: personName("Name"),
  age: z.coerce
    .number({ invalid_type_error: "Age must be a number" })
    .int("Age must be a whole number")
    .min(3, "Age must be at least 3")
    .max(30, "Age must be at most 30"),
  sectionId: id,
  parentMobile: mobile("Parent mobile"),
  fatherName: personName("Father's name"),
  motherName: personName("Mother's name"),
  fatherMobile: mobile("Father's mobile"),
  motherMobile: mobile("Mother's mobile"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: `Blood group must be one of ${BLOOD_GROUPS.join(", ")}` }),
  }),
  /**
   * A joining date in the future would be a typo rather than a plan, and the
   * bound is evaluated per-parse so it does not freeze at module load.
   */
  joiningDate: z.coerce
    .date({ invalid_type_error: "Joining date must be a valid date" })
    .refine((value) => value <= new Date(), "Joining date cannot be in the future"),
  status: recordStatus.optional(),
});

export const studentStatusSchema = z.object({ status: recordStatus });
