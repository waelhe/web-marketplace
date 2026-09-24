import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit net for pure server-side helpers (problem decoder, formatters).
// Deliberate deviations from the packaged Vitest guide, both documented:
// - NO @vitejs/plugin-react / jsdom / testing-library: zero JSX under
//   test (all UI is verified via the Playwright smoke suite instead).
//   Add them only when the first component test lands.
// - environment node (explicit): these helpers run in RSC/Node only.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
