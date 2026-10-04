import { chromium } from "@playwright/test";

/** Diagnose the publish sheet: click the FAB, dump console + dialog state. */
const run = async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e)}`));
  await page.goto("http://127.0.0.1:3101/store");
  await page.waitForLoadState("networkidle");
  const fab = page.getByRole("button", { name: "نشر جديد في الحي" });
  await fab.click();
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => {
    const d = document.getElementById("suq-publish-sheet");
    return {
      exists: !!d,
      open: d ? d.open : null,
      display: d ? getComputedStyle(d).display : null,
      fabExpanded: document.querySelector(".suq-nav-fab")?.getAttribute("aria-expanded"),
    };
  });
  console.log("STATE:", JSON.stringify(state, null, 2));
  console.log("LOGS:", logs.slice(-15).join("\n"));
  await browser.close();
};
run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
