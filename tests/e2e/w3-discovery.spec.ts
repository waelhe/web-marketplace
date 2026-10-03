import { expect, test } from "@playwright/test";

// The N11 hermetic smoke net (charter J8/the yelp plan — slice W3-F:
// «الاكتشاف والترتيب») — structure + contracts only, zero data
// dependence (assertions hold with N=0..N production rows and with a
// pre-W3 OR post-W3 backend: the honest failure states keep the run
// green either way; the LIVE contract round is the opt-in proof).

test("the browse filter form carries the stars floor + the rating sort (the measured wire forms)", async ({
  page,
}) => {
  await page.goto("/listings");
  const form = page.getByRole("search", { name: "تصفية الإعلانات" });

  // G17: the min-stars floor select — the fixed [1, 5] options mirror
  // the backend's own gate (safe by construction).
  const floor = form.locator('select[name="minRating"]');
  await expect(floor).toBeVisible();
  await expect(floor.locator("option")).toHaveText([
    "الكل",
    "1+ نجوم",
    "2+ نجوم",
    "3+ نجوم",
    "4+ نجوم",
    "5+ نجوم",
  ]);

  // G16: the rating sort rides the MEASURED wire form — `rating,desc`
  // (the bare form is Spring-ascending = a backend 400, measured
  // 2026-10-03).
  const sort = form.locator('select[name="sort"]');
  await expect(sort.locator('option[value="rating,desc"]')).toHaveText(
    "الأعلى تقييماً",
  );
  await expect(sort.locator('option[value="rating"]')).toHaveCount(0);
});

test("the stars-floor state rides the URL losslessly (canonical + chip)", async ({
  page,
}) => {
  const res = await page.goto("/listings?minRating=4");
  expect(res?.status()).toBe(200);
  // The state survives the sanitize boundary (finite + within [1,5]).
  await expect(page).toHaveURL(/minRating=4/);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toContain("minRating=4");
  // The active-filter chip carries the human label + its clear affordance.
  await expect(
    page.getByRole("list", { name: "المرشحات النشطة" }).locator("li"),
  ).toContainText("التقييم الأدنى");
  await expect(
    page.getByRole("link", { name: "إزالة مرشح التقييم الأدنى" }),
  ).toBeVisible();
});

test("an out-of-range floor is dropped honestly at the parse boundary (never a doomed 400)", async ({
  page,
}) => {
  const res = await page.goto("/listings?minRating=9");
  expect(res?.status()).toBe(200);
  // The R27 discipline: the invalid value never reaches the wire.
  await expect(page).toHaveURL(/minRating=9/); // URL-as-state preserved…
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).not.toContain("minRating"); // …but the canonical drops it
  await expect(
    page.getByRole("link", { name: "إزالة مرشح التقييم الأدنى" }),
  ).toHaveCount(0);
});

test("the listing detail page carries the blind save button (crawler parity)", async ({
  page,
}) => {
  // Any reachable detail page carries the affordance; with a backend
  // down or zero rows the browse surface keeps this test's target
  // absent — so the test navigates the browse grid's FIRST link when
  // present, else asserts the honest browse state and passes (the
  // button's own surface is the unit net + the live round's job).
  await page.goto("/listings");
  const first = page.locator(".listing-grid a").first();
  if ((await first.count()) > 0) {
    await first.click();
    await expect(page).toHaveURL(/\/listings\//);
    const save = page.getByRole("button", {
      name: "احفظ هذا الإعلان لتعود إليه لاحقاً من ملفك الشخصي",
    });
    await expect(save).toBeVisible();
    // The blind-button discipline: no favorite STATE on the public page.
    await expect(page.locator(".inline-action [aria-pressed]")).toHaveCount(0);
  } else {
    await expect(page.getByRole("status").first()).toBeVisible();
  }
});
