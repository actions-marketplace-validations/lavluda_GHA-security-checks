import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/core/version.ts", // generated file
        "src/action/main.ts",  // integration boundary — tested via e2e
        "src/cli/index.ts"     // integration boundary — tested via e2e
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
});
