import { expect, test } from "@playwright/test";

// The full-vision store surfaces — hermetic structure + contract net
// (the smoke discipline: zero data dependence beyond the display world
// itself, honest-state paths asserted, never a live write). The store
// world is display data (badged, demo- ids); the cart is REAL cookie
// state through the official Server Action lane — the roundtrip IS the
// assertion target here.

test("the store browse renders its anatomy: rail, badge, honest plates", async ({
  page,
}) => {
  await page.goto("/store");
  await expect(page).toHaveTitle(/المتجر/);
  await expect(page.getByRole("heading", { level: 1, name: "المتجر" })).toBeVisible();
  // The category rail with its own vocabulary.
  await expect(page.getByRole("navigation", { name: "فئات المتجر" })).toBeVisible();
  await expect(page.getByRole("link", { name: "المنزل والمطبخ" })).toBeVisible();
  // The display badge — the store world is honestly labeled.
  await expect(page.getByText("بيانات عرض").first()).toBeVisible();
  // The honest plate: category symbols, never <img> (no faked photos).
  await expect(page.locator(".store-plate").first()).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);
  // The first-party badge rides the platform's own products.
  await expect(page.getByText("من المنصة").first()).toBeVisible();
});

test("the store category filter is a server-rendered honest read", async ({
  page,
}) => {
  await page.goto("/store?category=home");
  await expect(page.getByRole("link", { name: "خلاط زجاجي 1.5 لتر بثلاث سرعات" })).toBeVisible();
  await expect(page.getByRole("link", { name: "سماعات لاسلكية بعزل ضجيج نشط" })).toHaveCount(0);
});

test("the product page renders price, vendor rating, and Q&A", async ({
  page,
}) => {
  await page.goto("/store/demo-product-blender");
  await expect(
    page.getByRole("heading", { level: 1, name: "خلاط زجاجي 1.5 لتر بثلاث سرعات" }),
  ).toBeVisible();
  await expect(page.getByText("180 ريالاً")).toBeVisible();
  await expect(page.getByText(/4\.6 من ٥/).first()).toBeVisible();
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

test("the cart roundtrip: add → group → settle (the official cookie lane)", async ({
  page,
}) => {
  // Add the first-party product first (من المنصة — its own group).
  await page.goto("/store/demo-product-charger");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await page.waitForURL("/cart");
  await expect(page.getByText("من المنصة").first()).toBeVisible();

  // Then the vendor product (أدوات المطبخ الشامية — its own group).
  await page.goto("/store/demo-product-blender");
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await page.waitForURL("/cart");

  // The cart renders the two vendor groups apart.
  await expect(page.getByRole("heading", { name: "أدوات المطبخ الشامية" })).toBeVisible();
  await expect(page.getByText("من المنصة").first()).toBeVisible();
  // 1×180 + 1×95 = 275 — the grammar renders whole riyals.
  await expect(page.getByText("الإجمالي: 275 ريالاً").first()).toBeVisible();

  // The checkout places the orders and empties the cart.
  await page.getByRole("button", { name: "أتمّ الطلب" }).click();
  await page.waitForURL("/orders");
  await expect(page.getByRole("heading", { name: "طلباتي" })).toBeVisible();
  await expect(page.getByText("قيد التحضير").first()).toBeVisible();

  // The cart is honestly empty after checkout.
  await page.goto("/cart");
  await expect(page.getByText("سلتك فارغة")).toBeVisible();
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

test("no horizontal overflow at 375px on the store (RTL mobile shell)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/store");
  const overflow = await page.evaluate(
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
