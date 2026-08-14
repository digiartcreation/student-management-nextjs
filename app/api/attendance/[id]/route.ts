import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { noContent, ok } from "@/lib/response";
import { deleteAttendance, getAttendance, updateAttendance } from "@/services/attendance.service";
import { attendanceUpdateSchema } from "@/validations/attendance.schema";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  return ok(await getAttendance(Number(id)), "Attendance fetched successfully");
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, attendanceUpdateSchema);
  const { id } = await params;
  return ok(await updateAttendance(Number(id), payload), "Attendance updated successfully");
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  await requireRole(...ALL_ROLES);
  const { id } = await params;
  await deleteAttendance(Number(id));
  return noContent();
});
