import { body, route } from "@/lib/api";
import { ok } from "@/lib/response";
import { sessionCookie } from "@/lib/auth";
import { loginSchema } from "@/validations/auth.schema";
import { loginUser } from "@/services/auth.service";

export const POST = route(async (request: Request) => {
  const payload = await body(request as never, loginSchema);
  const result = await loginUser(payload.email, payload.password);
  const response = ok(result.user, "Login successful");
  response.cookies.set(sessionCookie(result.token));
  return response;
});
