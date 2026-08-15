import { z } from "zod";
import { FEE_TYPES, isValidPeriod, periodHint } from "@/utils/fee";
import { feeType, id, money, monthKey } from "./common";

/** The type/period/title trio every fee entry carries, before cross-checking. */
const periodFields = {
  feeType: feeType.default("MONTHLY"),
  period: z.string().trim(),
  title: z.string().trim().max(60).optional(),
};

type PeriodFields = { feeType: z.infer<typeof feeType>; period: string; title?: string };

/**
 * `period` is only checkable once `feeType` is known, so the pair is validated
 * together rather than by the field.
 *
 * A title is what separates one one-off charge from another, so `OTHER` has to
 * carry one. The recurring types are pinned to "" instead: the unique key
 * includes the title, and letting it vary there would let the same month be
 * billed twice under two different names.
 */
const checkPeriod = (value: PeriodFields, ctx: z.RefinementCtx) => {
  if (!isValidPeriod(value.feeType, value.period)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["period"],
      message: `Period must be ${periodHint(value.feeType)}`,
    });
  }
  if (value.feeType === "OTHER" && !value.title) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Name the charge, e.g. Bus fee",
    });
  }
};

const normalizeTitle = <T extends PeriodFields>(value: T) => ({
  ...value,
  title: value.feeType === "OTHER" ? (value.title ?? "") : "",
});

/** Bills one fee to every active student in scope who is not billed for it yet. */
export const feeGenerateSchema = z
  .object({
    ...periodFields,
    amount: money,
    sectionId: id.optional().nullable(),
    /** Overwrite the amount on existing unpaid rows. */
    overwriteUnpaid: z.boolean().optional(),
  })
  .superRefine(checkPeriod)
  .transform(normalizeTitle);

/** A single fee entry against one student. */
export const feeSchema = z
  .object({
    ...periodFields,
    studentId: id,
    amount: money,
  })
  .superRefine(checkPeriod)
  .transform(normalizeTitle);

export const feeUpdateSchema = z.object({
  amount: money,
});

export const feePaySchema = z.object({
  paid: z.boolean(),
  paidDate: z.coerce.date().optional().nullable(),
});

/**
 * Filters for the fees list; every field narrows, none is required.
 *
 * `fromDate`/`toDate` bracket `paidDate`, not `billedMonth`. That is what a
 * daily collection report asks for — money taken between two dates — and it is
 * a different question from which month a charge was billed against. A fee
 * billed in July but settled in August belongs to August's collection and to
 * July's billing, so the two filters are deliberately kept separate.
 *
 * Because the bracket is on `paidDate`, which is null until a fee is settled,
 * supplying either date implies paid rows only.
 */
export const feeQuerySchema = z.object({
  feeType: feeType.optional(),
  period: z.string().trim().optional(),
  billedMonth: monthKey.optional(),
  sectionId: id.optional(),
  studentId: id.optional(),
  paid: z.boolean().optional(),
  search: z.string().trim().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export { FEE_TYPES };
