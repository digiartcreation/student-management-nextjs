import { NextRequest } from "next/server";
import { route, toOptionalDate } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { getStudentAttendance } from "@/services/attendance.service";

export const GET = route(async (request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) => {
  await requireRole(...ALL_ROLES);
  const { studentId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const result = await getStudentAttendance(Number(studentId), {
    fromDate: toOptionalDate(searchParams.get("fromDate")),
    toDate: toOptionalDate(searchParams.get("toDate")),
  });
  return ok(result, "Student attendance fetched successfully");
});
