import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use Node environment (no DOM needed for pure utility tests)
    environment: "node",
    // Coverage via V8 (built-in, no extra install needed)
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/__tests__/**",
        "lib/supabase/**", // Supabase clients need network — integration tests only
      ],
    },
    // Test files pattern
    include: ["lib/__tests__/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
