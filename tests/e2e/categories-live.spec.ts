import { expect, test } from "@playwright/test";

// The LIVE category-vocabulary contract round-trip (charter J2, slice S2
// DoD): the backend's V70 registry read reaches every PUBLIC picker
// surface — the hero datalist and the browse select — with the CODE as
// the submitted value. Opt-in so the default suite stays hermetic
// (backend-down runs stay green): set CATEGORIES_LIVE=1 to execute
// against the real backend behind BACKEND_URL (.env.local — staging by
// default). The measured baseline (2026-09-29, staging + production
// byte-identical): one seeded category, code "stay".
//
// NOT covered here (declared): the auth-gated pickers (create/edit
// listing, admin pricing rule) — a signed-in round needs the staging
// client secret (an owner input per the backend runbook
// docs/frontend-dev-oauth-setup.md: the secret lives with the owner);
// their markup is unit-verified in tests/unit/category-select.test.tsx.

const LIVE = process.env.CATEGORIES_LIVE === "1";

test.skip(!LIVE, "live round-trip — run with CATEGORIES_LIVE=1 and a reachable BACKEND_URL");

test("the live registry reaches the hero datalist and the browse picker, code on the wire", async ({
  page,
}) => {
  // 1) The hero's suggestions come from the registry — the option VALUE
  //    is the code (the only valid wire value; the Arabic name alone
  //    answers a silent 200 empty envelope — measured).
  await page.goto("/");
  const heroOptions = page.locator("#hero-category-examples option");
  expect(await heroOptions.count()).toBeGreaterThanOrEqual(1);
  await expect(
    page.locator('#hero-category-examples option[value="stay"]'),
  ).toHaveCount(1);

  // 2) The browse picker carries the same vocabulary.
  await page.goto("/listings");
  await expect(
    page.locator('select[name="category"] option[value="stay"]'),
  ).toHaveCount(1);

  // 3) Arriving category state renders selected (URL-as-state round-trip).
  await page.goto("/listings?category=stay");
  await expect(page.locator('select[name="category"]')).toHaveValue("stay");

  // 4) The lossless round-trip: an outside-vocabulary arriving value
  //    stays selectable — a resubmit never silently drops it.
  await page.goto("/listings?category=bogus");
  await expect(page.locator('select[name="category"]')).toHaveValue("bogus");
  await expect(
    page.locator('select[name="category"] option[value="bogus"]'),
  ).toHaveCount(1);
  // And the honest backend behavior stands: 200 with the empty envelope
  // (the page renders, never 500s, on an unknown category).
  const unknown = await page.goto("/listings?category=definitely-not-a-code");
  expect(unknown?.status()).toBe(200);
});
