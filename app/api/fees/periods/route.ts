import { NextRequest } from "next/server";
import { route, toOptionalString } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { listFeePeriods } from "@/services/fee.service";
import { feeType } from "@/validations/common";

/** Billed periods across every fee type, newest first — drives the period picker. */
export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const type = feeType.optional().parse(toOptionalString(request.nextUrl.searchParams.get("feeType")));
  return ok(await listFeePeriods(type), "Fee periods fetched successfully");
});
