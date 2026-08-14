import type { FeeType } from "@prisma/client";

export const FEE_TYPES = ["MONTHLY", "QUARTERLY", "YEARLY", "OTHER"] as const;

/**
 * The shape of `period` for each fee type. A one-off `OTHER` charge is filed
 * under the month it falls in, so it sorts and filters beside monthly fees.
 */
const PERIOD_PATTERN: Record<FeeType, RegExp> = {
  MONTHLY: /^\d{4}-(0[1-9]|1[0-2])$/,
  QUARTERLY: /^\d{4}-Q[1-4]$/,
  YEARLY: /^\d{4}$/,
  OTHER: /^\d{4}-(0[1-9]|1[0-2])$/,
};

const PERIOD_HINT: Record<FeeType, string> = {
  MONTHLY: "YYYY-MM, e.g. 2026-08",
  QUARTERLY: "YYYY-Qn, e.g. 2026-Q3",
  YEARLY: "YYYY, e.g. 2026",
  OTHER: "YYYY-MM, e.g. 2026-08",
};

export const isValidPeriod = (feeType: FeeType, period: string) =>
  PERIOD_PATTERN[feeType].test(period);

export const periodHint = (feeType: FeeType) => PERIOD_HINT[feeType];

/**
 * The month a charge lands in, which is where the dashboard counts it: a
 * quarter bills at its first month and a year bills in January, so a fee is
 * counted once over its life rather than once per month it covers.
 */
export function billedMonthOf(feeType: FeeType, period: string): string {
  switch (feeType) {
    case "QUARTERLY": {
      const [year, quarter] = period.split("-Q");
      return `${year}-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}`;
    }
    case "YEARLY":
      return `${period}-01`;
    default:
      return period;
  }
}

/** How a fee reads on screen and in messages: "2026-Q3" or "Bus fee (2026-08)". */
export const feeLabel = (fee: { feeType: FeeType; period: string; title: string }) =>
  fee.feeType === "OTHER" && fee.title ? `${fee.title} (${fee.period})` : fee.period;
