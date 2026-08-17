import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "apps/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"]
  },
});
