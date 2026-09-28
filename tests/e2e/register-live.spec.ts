import { expect, test } from "@playwright/test";

// The LIVE register contract round-trip (charter J1, slice S1 DoD):
// 201-on-unique + 409-on-duplicate against the real backend behind
// BACKEND_URL (.env.local — the staging service by default). Opt-in so
// the default suite stays hermetic (backend-down runs stay green):
// set REGISTER_LIVE=1 to execute. Creates one timestamped QA account
// per run — the same pattern as the production QA battery (2026-09-28).

const LIVE = process.env.REGISTER_LIVE === "1";

test.skip(!LIVE, "live round-trip — run with REGISTER_LIVE=1 and a reachable BACKEND_URL");

test("the full public register contract: 201 on unique, 409 words on duplicate", async ({
  page,
}) => {
  const email = `qa-e2e-${Date.now()}@example.com`;
  const password = "QaFlow-2026-Verify!";

  await page.goto("/register");
  await page.locator('input[name="displayName"]').fill("مستخدم اختبار آلي");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "أنشئ الحساب" }).click();

  // 201: the activation note replaces the form, with the sign-in entry
  // (the journey's next step) rendered in place.
  await expect(page.getByText("أُنشئ حسابك.", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "تسجيل الدخول" }),
  ).toBeVisible();

  // 409 CONFLICT-001: same email again — the accurate Arabic words on
  // the email field (the backend's generic userMessage is wording debt,
  // charter §5).
  await page.goto("/register");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "أنشئ الحساب" }).click();
  await expect(
    page.getByText("هذا البريد مسجّل لدينا بالفعل", { exact: false }),
  ).toBeVisible();
});
