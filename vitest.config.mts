import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      // CONTRIBUTING section 8 puts the Definition of Done bar at 60 percent.
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // Framework scaffolding with no logic of our own to assert on.
      exclude: ["src/app/layout.tsx"],
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
});
