import { route } from "@/lib/api";
import { AUTH_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/response";

export const POST = route(async () => {
  const response = ok({}, "Logout successful");
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
});
