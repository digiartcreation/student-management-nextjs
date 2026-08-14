import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { noContent, ok } from "@/lib/response";
import { deleteFee, getFee, updateFee } from "@/services/fee.service";
import { feeUpdateSchema } from "@/validations/fee.schema";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  return ok(await getFee(Number(id)), "Fee fetched successfully");
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, feeUpdateSchema);
  const { id } = await params;
  return ok(await updateFee(Number(id), payload), "Fee updated successfully");
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  await deleteFee(Number(id));
  return noContent();
});
