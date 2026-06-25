import { defineConfig } from "vitest/config";

// Dedicated Vitest config for mutation testing: the engine is plain TypeScript,
// so we run only the engine's own tests in a fast node environment with a
// generous timeout (mutant instrumentation slows execution).
export default defineConfig({
  test: {
    include: ["src/engine/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
  },
});
