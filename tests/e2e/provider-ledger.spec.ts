import { expect, test } from "@playwright/test";

// Slice S3 (charter J5 — رحلة المزوّد): the ledger + profile-edit routes'
// HERMETIC contract round. Anonymous coverage only, structure and
// contracts asserted — never data rows (the safety net's own rule).
//
// NOT covered here (declared): the signed-in surfaces — the balance and
// statement reads, the profile card + edit round-trip, and the ?intent=
// pure read. A signed-in round needs the staging OAuth client secret
// and a backend login (the runbook's real-browser flow); it is verified
// in the live agent-browser round and recorded in the worklog, exactly
// like the S2 gated pickers (tests/e2e/categories-live.spec.ts declares
// the same seam).

test("the ledger route renders the anonymous gate without a balance probe", async ({ page }) => {
  const res = await page.goto("/provider/ledger");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "دفتر الرصيد", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("دفتر الرصيد للمزوّدين المسجّلين", { exact: false }),
  ).toBeVisible();
  // The gate never renders the money surfaces (the measured 401
  // contract makes the anonymous probe impossible — and the page never
  // issues one).
  await expect(page.locator("h2").filter({ hasText: "رصيدك المتاح" })).toHaveCount(0);
  await expect(page.locator("h2").filter({ hasText: "كشف الحساب" })).toHaveCount(0);
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});

test("the ledger route's pagination state stays inert on garbage ?page=", async ({ page }) => {
  // The URL-as-state parser whitelists non-negative integers — anything
  // else falls back to page 0; the page still renders the gate (the
  // parse happens before any probe).
  const res = await page.goto("/provider/ledger?page=garbage");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByText("دفتر الرصيد للمزوّدين المسجّلين", { exact: false }),
  ).toBeVisible();
});

test("the profile-edit route renders the anonymous gate", async ({ page }) => {
  const res = await page.goto("/provider/profile");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "تعديل ملف المزوّد", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("سجّل الدخول أولًا", { exact: false })).toBeVisible();
  await expect(page.locator('input[name="displayName"]')).toHaveCount(0);
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});

test("a malformed profile id never becomes a probe (the gate renders first)", async ({ page }) => {
  const res = await page.goto("/provider/profile?id=not-a-uuid");
  expect(res?.status()).toBe(200);
  // Anonymous + malformed: the session gate is the honest render — the
  // id is parsed only for the signed-in funnel.
  await expect(page.getByText("سجّل الدخول أولًا", { exact: false })).toBeVisible();
});
