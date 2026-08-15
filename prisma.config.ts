import { defineConfig } from "prisma/config";

// Loads .env for local work. In production there is no such file — Hostinger
// injects the variables into the environment directly — and loadEnvFile throws
// ENOENT when the file is missing, which would take `prisma generate` down with
// it during deploy. Anything already in process.env is used as-is.
try {
  process.loadEnvFile();
} catch {
  // No .env; the environment is expected to be populated already.
}

// `env("DATABASE_URL")` is deliberately not used here. That helper throws
// PrismaConfigEnvError while the config is being *loaded*, so it fires even for
// commands that never touch the database — and `prisma generate` is one of
// them: it only reads the schema. Hostinger runs the build without runtime
// variables, so the config threw and took the whole deploy down with it.
//
// schema.prisma already declares `url = env("DATABASE_URL")`, which Prisma
// resolves lazily when a command actually connects. Overriding it here is only
// useful when the variable is present, so it is applied conditionally: builds
// generate fine without it, and `migrate deploy` still gets it at runtime.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
