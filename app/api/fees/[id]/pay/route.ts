import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { setFeePaid } from "@/services/fee.service";
import { feePaySchema } from "@/validations/fee.schema";

/** Marks a month's fee paid or unpaid; unpaid clears the paid date. */
export const PATCH = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, feePaySchema);
  const { id } = await params;
  const fee = await setFeePaid(Number(id), payload.paid, payload.paidDate);
  return ok(fee, payload.paid ? "Marked as paid" : "Marked as unpaid");
});
