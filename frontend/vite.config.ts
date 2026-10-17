import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Keep Playwright's e2e specs out of the unit runner.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});
