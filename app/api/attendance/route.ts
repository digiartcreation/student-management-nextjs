import { NextRequest } from "next/server";
import { query, route, toOptionalDate, toOptionalNumber } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { paged } from "@/lib/response";
import { listAttendance } from "@/services/attendance.service";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const paging = query(request);
  const searchParams = request.nextUrl.searchParams;
  const result = await listAttendance({
    ...paging,
    fromDate: toOptionalDate(searchParams.get("fromDate")),
    toDate: toOptionalDate(searchParams.get("toDate")),
    studentId: toOptionalNumber(searchParams.get("studentId")),
    sectionId: toOptionalNumber(searchParams.get("sectionId")),
    status: (searchParams.get("status") as "PRESENT" | "LATE" | "ABSENT" | null) ?? undefined,
  });
  return paged(result.content, paging.page, paging.size, result.totalElements);
});
