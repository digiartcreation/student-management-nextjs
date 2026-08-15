import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Only the backend's own tests. `frontend/` is an Angular project with its
    // own Karma/Jasmine runner — its .spec.ts files are not vitest tests and
    // fail on `describe is not defined` if they are collected here.
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
