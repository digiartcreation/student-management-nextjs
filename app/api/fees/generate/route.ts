import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { generateFees } from "@/services/fee.service";
import { feeGenerateSchema } from "@/validations/fee.schema";

/** Bills one fee to every active student who is not billed for it yet. Safe to re-run. */
export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, feeGenerateSchema);
  const result = await generateFees(payload);
  return ok(
    result,
    `${result.created} fee record(s) created for ${result.label}` +
      (result.repriced ? `, ${result.repriced} repriced` : "") +
      (result.skipped ? `, ${result.skipped} already billed` : ""),
    201,
  );
});
