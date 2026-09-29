import { expect, test } from "@playwright/test";

// The LIVE journey embodiment rounds (charter §8.2 — "رحلات خضراء":
// journeys J1–J8 embodied by green e2e; the register round opened the
// count at 1/8, these rounds advance J2 and J3). Opt-in so the default
// suite stays hermetic (backend-down runs stay green): set
// JOURNEYS_LIVE=1 to execute against the real backend behind
// BACKEND_URL (.env.local — staging by default).
//
// The measured staging baseline (2026-09-29): three real listings (the
// e2e structural artifact + the Task-33/65 battery apartments, all
// category `stay`); the search engine answers real terms (`q=شقة` → 2
// hits, `q=e2e` → 1 hit) and honestly empty otherwise (`q=إقامة` → 0).
//
// Data-independence discipline (the house rule — green at N=0..N):
// these are LIVE rounds over shared staging data the frontend cannot
// seed (listing creation is provider-authenticated), so each round
// DEGRADES GRACEFULLY: with zero search fuel it asserts the honest
// empty contract and test.skip()s the fueled legs with the declared
// reason (the seed-content owner input, charter §7/3) — never a red.
//
// NOT covered here (declared): the signed-in legs of the journeys —
// J3's provider-side lead inbox read, J4's payment block, J5–J8's
// authenticated surfaces. They need the staging client secret (an
// owner input per the backend runbook); their markup and contracts
// stay covered by the hermetic suite and the unit pins.

const LIVE = process.env.JOURNEYS_LIVE === "1";

test.skip(!LIVE, "live journey rounds — run with JOURNEYS_LIVE=1 and a reachable BACKEND_URL");

/** The measured fuel term: hits the battery-created listings. */
const FUEL_TERM = "شقة";

test("J2 — the exploration journey live: search → result → listing detail", async ({
  page,
}) => {
  // 1) The idle search state: the honest prompt, no backend read.
  await page.goto("/search");
  await expect(page.locator(".empty-state-title")).toHaveText("ابدأ البحث");

  // 2) The honest empty contract: a term that can never gain fuel still
  //    renders the empty state — the page never 500s on zero data.
  await page.goto("/search?q=zzzz-%D8%B1%D9%85%D8%B2-%D9%84%D8%A7-%D9%8A%D9%88%D8%AC%D8%AF");
  await expect(page.locator(".empty-state-title")).toHaveText("لا توجد نتائج مطابقة");

  // 3) The fueled search: submit the native GET form with the real term.
  await page.goto("/search");
  await page.locator('form[role="search"] input[name="q"]').fill(FUEL_TERM);
  await page.locator('form[role="search"] button[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  const cards = page.locator("#results a.listing-card");
  const fuel = await cards.count();
  test.skip(fuel === 0, "no search fuel on staging — the seed-content owner input (charter §7/3)");
  expect(fuel).toBeGreaterThanOrEqual(1);

  // 4) The click-through: a result card lands on its listing detail —
  //    the journey's J2→J3/J4 handoff surface.
  const cardTitle = (await cards.first().locator("h2").innerText()).trim();
  await cards.first().click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: cardTitle })).toBeVisible();

  // 5) The detail carries the journey's onward affordances: the backend's
  //    own JSON-LD (SEO contract), the booking entry, and the public
  //    lead form (J3's entry point).
  expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1);
  await expect(page.getByRole("heading", { name: "احجز هذا المكان" })).toBeVisible();
  await expect(page.locator('input[name="contactName"]')).toBeVisible();
});

test("J3 — the contact journey live: the public lead round-trip", async ({ page }) => {
  // 1) Arrive at a real listing through the public surface (the search
  //    channel — the same graceful fuel discipline as J2).
  await page.goto(`/search?q=${encodeURIComponent(FUEL_TERM)}`);
  await page.waitForLoadState("networkidle");
  const cards = page.locator("#results a.listing-card");
  const fuel = await cards.count();
  test.skip(fuel === 0, "no search fuel on staging — the seed-content owner input (charter §7/3)");
  await cards.first().click();
  await page.waitForLoadState("networkidle");

  // 2) The public lead form: no account required (L34 — the app's first
  //    public write surface). Timestamped QA payload — the battery
  //    pattern: one identifiable artifact per run.
  const stamp = Date.now();
  await page.locator('input[name="contactName"]').fill(`جولة J3 آلية ${stamp}`);
  await page.locator('input[name="contactPhone"]').fill("+966500000009");
  await page.locator('textarea[name="message"]').fill(
    `رسالة اختبار آلي لجولة التواصل (J3) — ${stamp}`,
  );
  await page.getByRole("button", { name: "أرسل طلب التواصل" }).click();

  // 3) The backend's own success: the lead landed in the provider's
  //    inbox (the write-side contract; the provider-side read needs the
  //    signed-in round — declared above).
  await expect(
    page.getByText("وصل طلبك إلى صاحب الإعلان — سيتواصل معك على رقمك."),
  ).toBeVisible({ timeout: 30_000 });
});
