import { expect, test } from "@playwright/test";

// Hermetic smoke net: structure + contracts only, zero data dependence
// (all assertions hold with N=0..N production rows). BACKEND_URL comes
// from .env.local; CI must supply a reachable one (even dead works —
// honest-state paths are asserted, never row data).

test("home renders the Arabic hero with a native GET form", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/السوق/);
  await expect(page.getByRole("heading", { name: "السوق" })).toBeVisible();
  const form = page.getByRole("search");
  await expect(form).toHaveAttribute("action", "/listings");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.locator('[name="q"]')).toBeVisible();
});

test("invalid filter params never 500 and never leak into canonical", async ({
  page,
}) => {
  const res = await page.goto("/listings?minPrice=abc&purpose=BOGUS&page=-5");
  expect(res?.status()).toBe(200);
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).not.toContain("minPrice");
  expect(canonical).not.toContain("BOGUS");
});

test("BFF relay without session returns the exact 401 contract", async ({
  request,
}) => {
  const res = await request.get("/api/backend/api/v1/users/me");
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({
    error: "unauthenticated",
    reauth: true,
  });
});

test("unknown listing keeps the noindex contract (status is framework-owned)", async ({
  page,
}) => {
  await page.goto("/listings/00000000-0000-0000-0000-000000000000");
  // NOTE: two identical noindex metas render here (page metadata +
  // not-found boundary) — same directive, harmless; dedup tracked as a
  // deferred minor. .first() pins the assertion deterministically.
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content");
  expect(robots).toContain("noindex");
});

test("social sign-in initiation is POST-only", async ({ request }) => {
  const res = await request.get("/api/auth/sign-in/social");
  expect(res.status()).toBe(404);
});
