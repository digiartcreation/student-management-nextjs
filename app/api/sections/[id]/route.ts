import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { noContent, ok } from "@/lib/response";
import { deleteSection, getSection, updateSection } from "@/services/section.service";
import { sectionSchema } from "@/validations/section.schema";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  return ok(await getSection(Number(id)), "Section fetched successfully");
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, sectionSchema);
  const { id } = await params;
  return ok(await updateSection(Number(id), payload), "Section updated successfully");
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  await deleteSection(Number(id));
  return noContent();
});
