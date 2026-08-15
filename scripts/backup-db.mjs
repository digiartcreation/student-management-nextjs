/**
 * Dumps every table to a timestamped JSON file under `backups/`.
 *
 * Hostinger's shared MySQL is reachable but the `mysqldump` binary is not
 * installed locally, so the safety net before a schema migration is taken
 * through Prisma instead. Restoring is a matter of reading the file back and
 * re-creating rows in dependency order: sections, students, then the rest.
 *
 *   node scripts/backup-db.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile();
} catch {
  // Variables are expected to be in the environment already.
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to back up.");
  process.exit(1);
}

const prisma = new PrismaClient();

// Ordered parents-first, so a restore can walk the file top to bottom without
// tripping a foreign key.
const tables = ["user", "section", "student", "attendance", "fee"];

const dump = {};
for (const table of tables) {
  if (!prisma[table]) {
    console.log(`- ${table}: not in this schema, skipped`);
    continue;
  }
  dump[table] = await prisma[table].findMany();
  console.log(`- ${table}: ${dump[table].length} rows`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = path.join(root, "backups");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `backup-${stamp}.json`);

// BigInt and Decimal do not survive JSON.stringify untouched; both are written
// as strings so the file stays lossless and human-readable.
await writeFile(
  file,
  JSON.stringify(dump, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2),
);

console.log(`\nWrote ${file}`);
await prisma.$disconnect();
