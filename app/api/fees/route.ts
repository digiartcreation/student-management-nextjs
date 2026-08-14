import { NextRequest } from "next/server";
import { body, query, route, toOptionalNumber, toOptionalString } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ALL_ROLES } from "@/lib/permissions";
import { ok } from "@/lib/response";
import { createFee, listFees } from "@/services/fee.service";
import { feeQuerySchema, feeSchema } from "@/validations/fee.schema";

export const GET = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const paging = query(request);
  const searchParams = request.nextUrl.searchParams;
  const paidParam = searchParams.get("paid");

  // `month` stays accepted as the old name for `billedMonth`, so a caller that
  // has not moved off the monthly-only API keeps working.
  const filters = feeQuerySchema.parse({
    feeType: toOptionalString(searchParams.get("feeType")),
    period: toOptionalString(searchParams.get("period")),
    billedMonth: toOptionalString(searchParams.get("billedMonth") ?? searchParams.get("month")),
    sectionId: toOptionalNumber(searchParams.get("sectionId")),
    studentId: toOptionalNumber(searchParams.get("studentId")),
    paid: paidParam === null || paidParam === "" ? undefined : paidParam === "true",
    search: toOptionalString(searchParams.get("search")),
  });

  const result = await listFees({ ...paging, ...filters });

  // Carries the money totals alongside the page, so the screen needs one call.
  return ok(
    {
      content: result.content,
      page: paging.page,
      size: paging.size,
      totalElements: result.totalElements,
      totalPages: Math.ceil(result.totalElements / paging.size),
      totals: result.totals,
    },
    "Fees fetched successfully",
  );
});

export const POST = route(async (request: NextRequest) => {
  await requireRole(...ALL_ROLES);
  const payload = await body(request, feeSchema);
  return ok(await createFee(payload), "Fee added successfully", 201);
});
