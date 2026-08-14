import { route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { listFeeMonths } from "@/services/fee.service";

/**
 * Distinct billed months, newest first. A quarter reports as the month it bills
 * in, so this stays a plain month list; `/api/fees/periods` is the one that
 * keeps each period in its own shape.
 */
export const GET = route(async () => {
  await requireRole(...ALL_ROLES);
  return ok(await listFeeMonths(), "Fee months fetched successfully");
});
