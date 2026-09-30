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
  // Landing per approved spec §2 (Task 19): Arabic hero + 3-field form.
  // Contract, not a frozen string: any Arabic h1 + the 3 hero names.
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toBeVisible();
  const form = page.getByRole("search");
  await expect(form).toHaveAttribute("action", "/listings");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.locator('[name="q"]')).toBeVisible();
  await expect(form.locator('[name="locationId"]')).toBeVisible();
  // The 16-field wall must never return to the landing page.
  await expect(form.locator("select")).toHaveCount(0);
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

test("no horizontal overflow at 375px (RTL shell)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("no horizontal overflow at 375px on the neighborhood wing (RTL mobile shell)", async ({
  page,
}) => {
  // The حيّنا shell replaces its hidden sidebar with the Nextdoor-2026
  // bottom tab bar below 48rem (N1) — the guard keeps the wing
  // overflow-free at the design's own narrowest tested width.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/neighborhood");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  // The mobile bottom tab bar is present and fixed (the sidebar's phone
  // replacement), and its six sections are links with short labels.
  const bar = page.locator("nav.hy-tabbar").first();
  await expect(bar).toBeVisible();
  await expect(bar.locator("a.hy-tab")).toHaveCount(6);
  // The reserved clearance keeps the main column's content flow out of
  // the fixed bar's band (the shell reserves ~3.5rem + safe-area below
  // 48rem — the guard proves the reservation is applied at all, not the
  // exact pixel arithmetic that rendering rounds).
  const clearance = await page.evaluate(() => {
    const bar = document.querySelector("nav.hy-tabbar");
    const main = document.querySelector(".hy-main-col");
    if (!(bar instanceof HTMLElement) || !(main instanceof HTMLElement)) return -1;
    return parseInt(getComputedStyle(main).paddingBlockEnd, 10);
  });
  expect(clearance).toBeGreaterThanOrEqual(48);
});

test("the wing's notifications surface renders its anonymous gate honestly", async ({ page }) => {
  // N1: /neighborhood/notifications is a session-scoped surface — the
  // anonymous render is the sign-in gate (never a probe that would 401),
  // inside the design's shell, noindex.
  const res = await page.goto("/neighborhood/notifications");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("الإشعارات للأعضاء المسجّلين")).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});

test("the wing's member profile renders its anonymous gate honestly", async ({ page }) => {
  // N1: /neighborhood/me is a session-scoped surface — the anonymous
  // render is the sign-in gate, inside the design's shell, noindex.
  const res = await page.goto("/neighborhood/me");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("الملف للأعضاء المسجّلين")).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});

test("booking and profile forms remain gated from anonymous smoke coverage", async ({
  page,
}) => {
  const bookingResponse = await page.goto(
    "/listings/00000000-0000-0000-0000-000000000000/book",
  );
  expect(bookingResponse?.status()).toBe(200);
  await expect(
    page.getByText("الحجز للمستخدمين المسجّلين", { exact: false }),
  ).toBeVisible();
  await expect(page.locator('input[name="startsAt"]')).toHaveCount(0);

  const profileResponse = await page.goto("/profile");
  expect(profileResponse?.status()).toBe(200);
  await expect(page.getByText("لم تسجّل الدخول", { exact: false })).toBeVisible();
  await expect(page.locator('select[name="rating"]')).toHaveCount(0);
});

test("neighborhood renders the anonymous gate without a feed fetch", async ({ page }) => {
  const res = await page.goto("/neighborhood");
  expect(res?.status()).toBe(200);
  // S10: the wing's brand IS the design's own «حيّنا» — the anonymous
  // gate renders inside the design's shell.
  await expect(page.getByRole("heading", { name: "حيّنا", exact: true })).toBeVisible();
  await expect(page.getByText("هذا القسم لأعضاء الحارات")).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});

test("register renders as a public surface — no gate, the J1 form contract", async ({
  page,
}) => {
  // Charter J1 (slice S1): registration is a PUBLIC conversion surface —
  // anonymous visitors (and crawlers) see the full form, never a sign-in
  // gate. Structure/contract only; the live 201/409 round-trip lives in
  // register-live.spec.ts (opt-in).
  const res = await page.goto("/register");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "إنشاء حساب", exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[name="displayName"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "أنشئ الحساب" })).toBeVisible();
  // The HTML mirror of the measured RegisterRequest bounds.
  await expect(page.locator('input[name="email"]')).toHaveAttribute(
    "maxlength",
    "50",
  );
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "minlength",
    "8",
  );
});

test("home carries the anonymous signup entry (charter J1)", async ({ page }) => {
  await page.goto("/");
  const registerLink = page.getByRole("link", { name: "أنشئ حساباً" });
  await expect(registerLink).toBeVisible();
  await expect(registerLink).toHaveAttribute("href", "/register");
});

test("the hero's category suggestions are wired to a live datalist (charter J2, S2)", async ({
  page,
}) => {
  // Structure only (hermetic — holds with a dead backend too): the input
  // references the datalist; the OPTIONS themselves are live data and are
  // asserted only in categories-live.spec.ts (opt-in).
  await page.goto("/");
  const input = page.locator('input[name="category"]');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("list", "hero-category-examples");
  await expect(page.locator("#hero-category-examples")).toHaveCount(1);
});

test("browse carries a visible category picker with the no-filter option (charter J2, S2)", async ({
  page,
}) => {
  // The visible live-registry picker replaced the hidden input (R8's
  // premise dissolved with the backend's V70 registry read). The «الكل»
  // option exists in every mode — live vocabulary or honest degraded.
  const res = await page.goto("/listings");
  expect(res?.status()).toBe(200);
  const select = page.locator('select[name="category"]');
  await expect(select).toBeVisible();
  await expect(select.locator('option[value=""]')).toHaveCount(1);
});

test("robots.txt declares the crawl policy (S5 launch readiness)", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("Sitemap: ");
  // The private surfaces and the API relay are out of every crawl budget.
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /neighborhood");
  // THE /neighborhood prefix trap: the PUBLIC geo picker stays allowed
  // (the longer Allow rule beats the Disallow prefix — the standard's
  // longest-match resolution, one character apart, opposite policies).
  expect(body).toContain("Allow: /neighborhoods");
  // /search is never disallowed: its noindex meta must stay crawler-visible.
  expect(body).not.toContain("Disallow: /search");
});

test("sitemap.xml lists the public hubs — never private or noindexed URLs (S5)", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("<loc>");
  expect(body).toContain("/listings</loc>");
  expect(body).toContain("/neighborhoods</loc>");
  // A sitemap is a list of indexable URLs only.
  expect(body).not.toContain("/search");
  expect(body).not.toContain("/admin");
  expect(body).not.toContain("/provider");
  expect(body).not.toContain("/api");
});

test("/api/health answers the uptime probe contract (S5)", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("search results stay out of the index while following links (S5)", async ({ page }) => {
  // Plain /search = the idle mode = ZERO backend reads (the measured
  // dispatch) — hermetic by construction.
  const res = await page.goto("/search");
  expect(res?.status()).toBe(200);
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content");
  expect(robots).toContain("noindex");
  expect(robots).toContain("follow");
});

test("the display-data showcase is a labeled, bounded contract (بيانات عرض)", async ({
  page,
}) => {
  // The seed-content layer (2026-09-29) as STRUCTURAL contracts — zero
  // data dependence, both backend states valid:
  // Rule 2 (deterministic in every environment): a FILTERED browse and
  // the idle /search NEVER carry display data — the search/filter
  // contract is real data only, whatever the backend serves or refuses.
  const filtered = await page.goto("/listings?minPrice=1");
  expect(filtered?.status()).toBe(200);
  await expect(page.locator(".demo-listing-card")).toHaveCount(0);

  await page.goto("/search");
  await expect(page.locator(".demo-listing-card")).toHaveCount(0);

  // The UNFILTERED browse: either the honest real-data/failure branches
  // own it (no demo cards — the CI shape, backend unreachable: rule 1,
  // display data never masks an outage), or the demo showcase is ENGAGED
  // (this local shape: the staging read answered 200 below the storefront
  // floor) — in which case the notice exists and EVERY card is labeled
  // with the «بيانات عرض» badge. An unlabeled display row fails both
  // arms — that is the point.
  const res = await page.goto("/listings");
  expect(res?.status()).toBe(200);
  const demoCards = await page.locator(".demo-listing-card").count();
  if (demoCards > 0) {
    const notice = await page.locator(".demo-note").textContent();
    expect(notice).toContain("بيانات عرض توضيحية");
    expect(
      await page.locator(".demo-listing-card .badge-new").count(),
    ).toBe(demoCards);
    // Rule 4 as live markup: a display card is never a link.
    expect(
      await page.locator(".demo-listing-card a").count(),
    ).toBe(0);
  }
});
