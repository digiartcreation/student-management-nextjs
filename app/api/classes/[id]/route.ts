import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { noContent, ok } from "@/lib/response";
import { deleteClass, getClass, updateClass } from "@/services/class.service";
import { classSchema } from "@/validations/class.schema";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  return ok(await getClass(Number(id)), "Class fetched successfully");
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, classSchema);
  const { id } = await params;
  return ok(await updateClass(Number(id), payload), "Class updated successfully");
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  await deleteClass(Number(id));
  return noContent();
});
