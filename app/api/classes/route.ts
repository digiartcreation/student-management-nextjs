import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { createClass, listClasses } from "@/services/class.service";
import { classSchema } from "@/validations/class.schema";

export const GET = route(async () => {
  await requireRole(...ALL_ROLES);
  return ok(await listClasses(), "Classes fetched successfully");
});

export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, classSchema);
  return ok(await createClass(payload), "Class created successfully", 201);
});
