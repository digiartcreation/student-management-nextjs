import { defineConfig, env } from "prisma/config";

// Loads .env for local work. In production there is no such file — Hostinger
// injects the variables into the environment directly — and loadEnvFile throws
// ENOENT when the file is missing, which would take `prisma generate` down with
// it during deploy. Anything already in process.env is used as-is.
try {
  process.loadEnvFile();
} catch {
  // No .env; the environment is expected to be populated already.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
