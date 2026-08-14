import { route } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ok } from "@/lib/response";
import { sanitizeUser } from "@/services/auth.service";

export const GET = route(async () => {
  const user = await requireAuth();
  return ok(sanitizeUser(user), "Authenticated user");
});
