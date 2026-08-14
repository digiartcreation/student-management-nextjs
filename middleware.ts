import { NextRequest, NextResponse } from "next/server";

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin =
    process.env.FRONTEND_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:4200" : undefined);

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": origin && origin === allowedOrigin ? origin : allowedOrigin ?? "",
    Vary: "Origin",
  };
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders(request)).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
