/**
 * Copies the built Angular app into `public/`, so `next start` serves the
 * screens and the API from one origin.
 *
 * The frontend source lives in `frontend/` in this same repo, but it is not
 * built on the server: the deployment only runs `prisma generate && next build`
 * and has no Angular toolchain. So `public/` is committed and uploaded as-is,
 * and this script is what refreshes it — run `npm run ui:build` locally after
 * changing anything under `frontend/src`.
 */
import { cp, rm, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "frontend/dist/student-fee-management/browser");
const target = path.join(root, "public");

const exists = async (dir) => {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
};

if (!(await exists(source))) {
  console.error(`No Angular build at:\n  ${source}\n`);
  console.error("Build the frontend first:");
  console.error("  npm run ui:build   (installs nothing — run npm run ui:install once)");
  process.exit(1);
}

const files = await readdir(source);
if (!files.includes("index.html")) {
  console.error(`${source} has no index.html — that is not an Angular browser build.`);
  process.exit(1);
}

// Replaced wholesale, so a renamed or deleted chunk cannot linger and be served
// alongside the new build.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Copied ${files.length} entries from the Angular build into public/.`);
console.log("`npm run build` then `npm start` now serves the UI and the API together.");
