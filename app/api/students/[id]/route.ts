import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { noContent, ok } from "@/lib/response";
import { deleteStudent, getStudent, updateStudent } from "@/services/student.service";
import { studentSchema } from "@/validations/student.schema";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  return ok(await getStudent(Number(id)), "Student fetched successfully");
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, studentSchema);
  const { id } = await params;
  return ok(await updateStudent(Number(id), payload), "Student updated successfully");
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  await deleteStudent(Number(id));
  return noContent();
});
