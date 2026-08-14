import { NextResponse } from "next/server";

/**
 * Catches any `/api` path no real handler claimed. Without it those fall
 * through to Next's HTML 404 page, and a caller expecting JSON chokes on the
 * body rather than reading a clean error. Static and dynamic routes both take
 * precedence over a catch-all, so this only ever sees genuine misses.
 */
const notFound = () =>
  NextResponse.json(
    { success: false, message: "Endpoint not found", errors: [] },
    { status: 404 },
  );

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
