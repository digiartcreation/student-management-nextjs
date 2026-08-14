import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { updateStudentStatus } from "@/services/student.service";
import { studentStatusSchema } from "@/validations/student.schema";

export const PATCH = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, studentStatusSchema);
  const { id } = await params;
  return ok(await updateStudentStatus(Number(id), payload.status), "Student status updated");
});
