import { NextRequest } from "next/server";
import { body, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { saveAttendance } from "@/services/attendance.service";
import { attendanceSaveSchema } from "@/validations/attendance.schema";

/** Saves a whole day at once; re-posting the same date overwrites it. */
export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, attendanceSaveSchema);
  return ok(await saveAttendance(payload), "Attendance saved successfully");
});
