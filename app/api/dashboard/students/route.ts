import { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { BusinessError } from "@/lib/errors";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { getStudentDashboard, monthKeyOf } from "@/services/dashboard.service";

/** Each dashboard costs a handful of queries, so the fan-out is bounded. */
const MAX_STUDENTS = 8;

/**
 * `GET /api/dashboard/students?ids=1,2&month=2026-08`
 *
 * One dashboard per id, in the order asked for, so the screen can compare
 * students side by side without a request each.
 */
export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month") ?? monthKeyOf(new Date());

  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  const unique = [...new Set(ids)];
  if (!unique.length) throw new BusinessError("Pick at least one student");
  if (unique.length > MAX_STUDENTS) {
    throw new BusinessError(`Pick at most ${MAX_STUDENTS} students at a time`);
  }

  const boards = await Promise.all(unique.map((id) => getStudentDashboard(id, month)));
  return ok(boards, "Student dashboards fetched successfully");
});
