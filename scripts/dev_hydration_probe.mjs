// Dev-server hydration probe: loads /store from the dev server on 3101,
// collects console + pageerrors, and polls for the hydration beacon
// (nav.suq-nav[data-mounted]) plus a generic React-attached check.
// Usage: node scripts/dev_hydration_probe.mjs [timeoutMs]
import { chromium } from "playwright";

const TIMEOUT = Number(process.argv[2] || 20000);
const url = "http://127.0.0.1:3101/store";

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chromium" });
const page = await browser.newPage();
const console_msgs = [];
page.on("console", (m) => console_msgs.push(`[${m.type()}] ${m.text().slice(0, 220)}`));
page.on("pageerror", (e) => console_msgs.push(`[pageerror] ${String(e).slice(0, 300)}`));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
const t0 = Date.now();
let beacon = false;
let anyInteractive = null;
while (Date.now() - t0 < TIMEOUT) {
  beacon = await page
    .locator("nav.suq-nav[data-mounted='true']")
    .count()
    .then((c) => c > 0)
    .catch(() => false);
  if (beacon) break;
  await page.waitForTimeout(250);
}
// A generic, component-agnostic hydration witness: React 19 sets
// data-react-router / hydrates root; the most portable check is whether
// a click listener world exists — measured via __reactContainer on root.
anyInteractive = await page.evaluate(() => {
  const root = document.getElementById("__next");
  return {
    hasNextRoot: !!root,
    reactKeys: root ? Object.keys(root).filter((k) => k.startsWith("__react")) : [],
  };
});
console.log("BEACON APPEARED:", beacon, `(${((Date.now() - t0) / 1000).toFixed(1)}s window)`);
console.log("ROOT:", JSON.stringify(anyInteractive));
console.log("CONSOLE (" + console_msgs.length + " messages):");
for (const m of console_msgs.slice(0, 30)) console.log("  " + m);
await browser.close();
process.exit(beacon ? 0 : 1);
