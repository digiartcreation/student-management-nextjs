import { NextRequest } from "next/server";
import { body, query, route, toOptionalNumber, toOptionalString } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok, paged } from "@/lib/response";
import { createStudent, listStudents } from "@/services/student.service";
import { studentSchema } from "@/validations/student.schema";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const paging = query(request);
  const searchParams = request.nextUrl.searchParams;
  const result = await listStudents({
    ...paging,
    search: toOptionalString(searchParams.get("search")),
    classId: toOptionalNumber(searchParams.get("classId")),
    sectionId: toOptionalNumber(searchParams.get("sectionId")),
    status: (searchParams.get("status") as "ACTIVE" | "INACTIVE" | null) ?? undefined,
  });
  return paged(result.content, paging.page, paging.size, result.totalElements);
});

export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, studentSchema);
  return ok(await createStudent(payload), "Student added successfully", 201);
});
