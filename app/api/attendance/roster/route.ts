import { NextRequest } from "next/server";
import { route, toOptionalNumber } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { getRoster } from "@/services/attendance.service";

/** The daily-fill screen: every active student with their status for the date. */
export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");
  const result = await getRoster({
    date: dateParam ? new Date(dateParam) : new Date(),
    sectionId: toOptionalNumber(searchParams.get("sectionId")),
  });
  return ok(result, "Roster fetched successfully");
});
