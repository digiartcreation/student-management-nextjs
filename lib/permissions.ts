import type { UserRole } from "@prisma/client";

export const ADMIN_ONLY: UserRole[] = ["ADMIN"];
export const ALL_ROLES: UserRole[] = ["ADMIN", "STAFF"];
