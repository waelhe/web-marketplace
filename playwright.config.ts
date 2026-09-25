import { defineConfig } from "@playwright/test";

// Smoke net: hermetic contract assertions (no backend-data dependence).
// - webServer boots dev INSIDE the test process (sandbox kills background
//   trees between shell calls, so no persistent dev server is assumed).
// - Port 3101 avoids clashing with any ad-hoc :3000 dev server.
// - Channel: "chrome" (Google Chrome Stable 154, installed — measured
//   launch OK; newer than the bundled Chromium 1243/153 requirement).
//   Override per machine with PLAYWRIGHT_CHANNEL (e.g. "msedge" on boxes
//   without Chrome). Large Playwright browser downloads do not survive
//   this sandbox's network — hence a system Chrome, never a CDN fetch.
// - BACKEND_URL is inherited from .env.local (local runs) — tests assert
//   structure/contracts only (401 shapes, sanitize-200s, noindex, gates),
//   never data rows, so they stay green with N=0..N rows.
// - retries: 0 — flakes must fail loudly, never masked.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    channel: (process.env.PLAYWRIGHT_CHANNEL ?? "chrome") as "chrome",
  },
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
