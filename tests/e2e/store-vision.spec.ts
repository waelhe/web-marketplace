import { expect, test } from "@playwright/test";

// The storefront surfaces — hermetic structure + contract net over the
// attached binding design (PR #502 — سوق الحي). Zero data dependence
// beyond the display world itself, honest-state paths asserted, never a
// live write. The product world is display data (badged, demo- ids);
// the cart is REAL cookie state through the official Server Action lane
// — the roundtrip IS the assertion target here, through the design's
// own flow: add stays on the storefront, the unified cart bar carries
// the state, and its CTA is the single next step.

test("the storefront renders the design's anatomy: tabs, chips, CTA, offers, sections", async ({
  page,
}) => {
  await page.goto("/store");
  await expect(page).toHaveTitle(/سوق الحي/);
  await expect(page.getByRole("heading", { level: 1, name: "سوق الحي" })).toBeVisible();
  // The mode tabs — the design's 3-way selector, real destinations.
  await expect(page.getByRole("navigation", { name: "أوضاع السوق" })).toBeVisible();
  await expect(page.getByRole("link", { name: "المستعمل" })).toHaveAttribute(
    "href",
    "/neighborhood/market",
  );
  await expect(page.getByRole("link", { name: "الخدمات" })).toHaveAttribute(
    "href",
    "/neighborhood/services",
  );
  // The category chips rail with the design's dictionary.
  await expect(page.getByRole("navigation", { name: "فئات سوق الحي" })).toBeVisible();
  await expect(page.getByRole("link", { name: "مخابز وحلويات" })).toBeVisible();
  await expect(page.getByRole("link", { name: "أسر منتجة ومطابخ" })).toBeVisible();
  // The merchant CTA banner.
  await expect(page.getByRole("heading", { name: "كن تاجراً، وافتح متجرك بالحي" })).toBeVisible();
  await expect(page.getByRole("link", { name: /سجّل كتاجر وافتح متجرك مجاناً/ })).toBeVisible();
  // The offers rail — the design's own badges.
  await expect(page.getByText("عروض سريعة")).toBeVisible();
  await expect(page.getByText("خصم ٣٠٪").first()).toBeVisible();
  // The seven market sections with their rails.
  await expect(page.getByRole("heading", { name: "أفران ومعجنات دمر والشام" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "الأسر المنتجة" })).toBeVisible();
  // The display badge — the store world is honestly labeled.
  await expect(page.getByText("بيانات عرض").first()).toBeVisible();
  // The honest plate: category symbols, never <img> (no faked photos).
  await expect(page.locator(".suq-card-plate").first()).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);
  // The first-party badge rides the platform's own basket.
  await expect(page.getByText("من المنصة").first()).toBeVisible();
  // The floating pill nav + its five real destinations.
  await expect(page.getByRole("navigation", { name: "تنقّل سوق الحي" })).toBeVisible();
  await expect(page.getByRole("link", { name: "الحي" })).toHaveAttribute("href", "/neighborhood");
  await expect(page.getByRole("link", { name: "العقار" })).toHaveAttribute("href", "/listings");
});

test("the storefront category filter is a server-rendered honest read", async ({
  page,
}) => {
  await page.goto("/store?category=bakery");
  await expect(
    page.getByRole("link", { name: "خبز سياحي ممتاز وصمون" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "فراولة مضايا الجبلية العسلية" })).toHaveCount(0);
});

test("the storefront search is the honest flat read", async ({ page }) => {
  await page.goto("/store?q=فراولة");
  await expect(
    page.getByRole("link", { name: "فراولة مضايا الجبلية العسلية" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "خبز سياحي ممتاز وصمون" })).toHaveCount(0);
});

test("the product page renders price, vendor rating, and Q&A", async ({
  page,
}) => {
  await page.goto("/store/demo-suq-bread-tourist");
  await expect(
    page.getByRole("heading", { level: 1, name: "خبز سياحي ممتاز وصمون" }),
  ).toBeVisible();
  await expect(page.getByText("١٥ ريالاً")).toBeVisible();
  await expect(page.getByText(/٤٫٦ من ٥/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /أسئلة وأجوبة/ })).toBeVisible();
});

test("a non-demo product id answers the honest not-found (status is framework-owned)", async ({
  page,
}) => {
  // The smoke suite's own convention: the not-found STATUS is
  // framework-owned (dev answers 200 on the boundary render); the
  // CONTRACT is the noindex meta + the absent affordances.
  await page.goto("/store/7b1c2f3a-1111-2222-3333-444455556666");
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content");
  expect(robots).toContain("noindex");
  await expect(page.getByRole("button", { name: "أضف إلى السلة" })).toHaveCount(0);
});

test("the cart roundtrip rides the design's own flow: add → bar → /cart → settle", async ({
  page,
}) => {
  // Add the first-party basket (من المنصة — its own group) from the
  // storefront: the design keeps the buyer ON the market screen and the
  // unified cart bar picks the state (the official cookie lane — the
  // action revalidates the tree server-side).
  await page.goto("/store");
  const basketCard = page
    .locator(".suq-card", { hasText: "سلة صباح قدسيا المتكاملة" })
    .first();
  await basketCard.getByRole("button", { name: "أضف إلى السلة" }).click();
  // The cart bar appears with the honest count and the design's CTA.
  await expect(page.locator(".suq-cartbar")).toBeVisible();
  await expect(page.locator(".suq-cartbar-count")).toHaveText("١");
  await expect(page.getByText("١٩٥ ريالاً").first()).toBeVisible();

  // Then the vendor bread row (مخبز ضاحية قدسيا — its own group).
  const breadCard = page
    .locator(".suq-card", { hasText: "خبز سياحي ممتاز وصمون" })
    .first();
  await breadCard.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.locator(".suq-cartbar-count")).toHaveText("٢");
  // The multi-vendor truth on the bar itself.
  await expect(page.locator(".suq-cartbar")).toContainText("متجران");

  // The bar's CTA is the single next step — the multi-vendor cart page.
  await page.getByRole("link", { name: "متابعة الطلب" }).click();
  await page.waitForURL("/cart");
  await expect(page.getByRole("heading", { name: "مخبز ضاحية قدسيا" })).toBeVisible();
  await expect(page.getByText("من المنصة").first()).toBeVisible();
  // 1×15 + 1×195 = 210 — the grammar (tail 10 → ريالات) renders the design's digits.
  await expect(page.getByText("٢١٠ ريالات").first()).toBeVisible();

  // The checkout places the orders and empties the cart.
  await page.getByRole("button", { name: "أتمّ الطلب" }).click();
  await page.waitForURL("/orders");
  await expect(page.getByRole("heading", { name: "طلباتي" })).toBeVisible();
  await expect(page.getByText("قيد التحضير").first()).toBeVisible();

  // The cart is honestly empty after checkout — and the storefront's
  // bar is gone with it (never a faked count).
  await page.goto("/store");
  await expect(page.locator(".suq-cartbar")).toHaveCount(0);
  await page.goto("/cart");
  await expect(page.getByText("سلتك فارغة")).toBeVisible();
});

test("the publish sheet opens from the FAB and carries the design's five intents", async ({
  page,
}) => {
  await page.goto("/store");
  const fab = page.getByRole("button", { name: "نشر جديد في الحي" });
  await expect(fab).toBeVisible();
  await fab.click();
  // The native dialog opens (focus-trapped, ESC-closable).
  const sheet = page.locator("#suq-publish-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("نشر وتفاعل فوري بالحي");
  await expect(sheet.getByText("إضافة منتج لمتجري أو نشاطي")).toBeVisible();
  await expect(sheet.getByText("بيع غرض مستعمل بحراج الحي")).toBeVisible();
  await expect(sheet.getByText("إهداء غرض مجاناً لوجه الله")).toBeVisible();
  await expect(sheet.getByText("استفسار أو تنبيه مجتمعي")).toBeVisible();
  // Every intent is an honest link to a real publish lane.
  await expect(sheet.getByRole("link", { name: /بيع غرض مستعمل/ })).toHaveAttribute(
    "href",
    "/neighborhood/market",
  );
  // ESC closes (the native dialog's own behavior).
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
});

test("the empty cart and empty orders render their honest states", async ({
  page,
}) => {
  await page.goto("/cart");
  await expect(page.getByText("سلتك فارغة")).toBeVisible();
  await page.goto("/orders");
  await expect(page.getByText("لا طلبات بعد")).toBeVisible();
});

test("the mortgage calculator never renders on an unknown listing (status is framework-owned)", async ({
  page,
}) => {
  // Same convention: the contract is the tool's absence on the honest
  // not-found boundary — the calculator's math itself is unit-pinned
  // (vision-property.test.ts); with a live backend + real listing ids
  // the full tool renders (structure-only, zero data dependence here).
  await page.goto("/listings/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "حاسبة الأقساط" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "بطاقة السياق" })).toHaveCount(0);
});

test("no horizontal overflow at 390px on the storefront (RTL mobile shell)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/store");
  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.goto("/store/demo-suq-bread-tourist");
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("no horizontal overflow at 375px on the cart + orders (RTL mobile shell)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/cart");
  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.goto("/orders");
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
