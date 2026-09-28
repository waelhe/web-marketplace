import { expect, test } from "@playwright/test";

// The S4 hermetic smoke net (charter J2, slice S4 DoD: "مسطّح بحث نصي على
// /search؛ كل فلاتر HTML عامة تعمل بلا JS") — structure + contracts only,
// zero data dependence (assertions hold with N=0..N production rows; a
// backend-down run stays green through the honest failure states).

test("the flat search form: one text field, zero selects, native GET", async ({
  page,
}) => {
  await page.goto("/search");
  await expect(page).toHaveTitle(/البحث/);
  const form = page.getByRole("search");
  await expect(form).toHaveAttribute("action", "/search");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.locator('[name="q"]')).toBeVisible();
  // The flatness contract, pinned the same way the landing smoke pins
  // the hero's: no selects ever on the flat search surface.
  await expect(form.locator("select")).toHaveCount(0);
  // The idle state is the honest prompt — never a doomed backend read.
  await expect(page.getByText("ابدأ البحث")).toBeVisible();
});

test("the category rail breathes the live registry and marks the active code", async ({
  page,
}) => {
  await page.goto("/search");
  // The rail renders whatever the registry answers (0..N entries); with
  // the seeded registry the stay entry links by its CODE.
  const rail = page.getByRole("navigation", { name: "تصفّح الفئات" });
  await expect(rail).toBeVisible();
  const stay = rail.locator('a[href="/search?category=stay"]');
  if ((await stay.count()) > 0) {
    await stay.click();
    // The category-only state renders and the active entry is marked.
    await expect(page).toHaveURL(/\/search\?category=stay/);
    await expect(rail.locator('a[aria-current="page"]')).toHaveText(/إقامة|stay/i);
    await expect(page.getByText(/تصفّح الفئة/)).toBeVisible();
  }
});

test("text mode never 500s and the canonical carries only the honest state", async ({
  page,
}) => {
  const res = await page.goto("/search?q=%D8%B4%D9%82%D8%A9&category=stay");
  expect(res?.status()).toBe(200);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  // Both arrived params survive the canonical (URL-as-state lossless);
  // the WIRE read stays q-only — the backend's own measured dispatch.
  expect(canonical).toContain("q=%D8%B4%D9%82%D8%A9");
  expect(canonical).toContain("category=stay");
  // Junk params never leak into the canonical.
  const junk = await page.goto("/search?page=-5&sort=bogus");
  expect(junk?.status()).toBe(200);
  const canonical2 = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical2).not.toContain("page=");
  expect(canonical2).not.toContain("sort");
});

test("the browse-by-category state rides its own surface, never 500", async ({
  page,
}) => {
  // /listings?category=X (category-ONLY) is the dedicated browse op's
  // surface — 200 with the honest zero state even for unknown codes
  // (measured: the reads answer 200 empty envelopes, never 400).
  const unknown = await page.goto("/listings?category=definitely-not-a-code");
  expect(unknown?.status()).toBe(200);
  // And the arriving category state renders selected in the picker.
  await page.goto("/listings?category=stay");
  await expect(page.locator('select[name="category"]')).toHaveValue("stay");
});

test("the homepage nav carries the search entry", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "التنقل الرئيس" }).locator('a[href="/search"]'),
  ).toHaveCount(1);
});
