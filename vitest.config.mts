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
    // .ts AND .tsx: the first component tests landed as .tsx (the N1
    // wing tab bar) but the include pattern silently excluded them — a
    // standing gap measured 2026-10-04 (the wing-bar test never ran in
    // CI). JSX-in-test stays the exception (renderToStaticMarkup over
    // server/client leaves), not a jsdom/testing-library adoption.
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
