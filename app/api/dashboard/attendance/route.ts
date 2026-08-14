import { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { getAttendanceDashboard, monthKeyOf } from "@/services/dashboard.service";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  const month = searchParams.get("month") ?? monthKeyOf(date);
  return ok(await getAttendanceDashboard({ date, month }), "Attendance dashboard fetched successfully");
});
