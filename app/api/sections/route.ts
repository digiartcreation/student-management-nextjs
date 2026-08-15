import { NextRequest } from "next/server";
import { body, route, toOptionalNumber } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { createSection, listSections } from "@/services/section.service";
import { sectionSchema } from "@/validations/section.schema";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const classId = toOptionalNumber(request.nextUrl.searchParams.get("classId"));
  return ok(await listSections({ classId }), "Sections fetched successfully");
});

export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, sectionSchema);
  return ok(await createSection(payload), "Section created successfully", 201);
});
