import { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { getFeesDashboard, monthKeyOf } from "@/services/dashboard.service";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const month = request.nextUrl.searchParams.get("month") ?? monthKeyOf(new Date());
  return ok(await getFeesDashboard(month), "Fees dashboard fetched successfully");
});
