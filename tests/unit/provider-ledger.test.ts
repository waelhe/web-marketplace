import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { EditProviderProfileForm } from "@/app/provider/forms";
import {
  LEDGER_ENTRY_TYPE_LABELS,
  PROVIDER_AGENCY_MAX,
  PROVIDER_BIO_MAX,
  PROVIDER_LICENSE_MAX,
  PROVIDER_NAME_MAX,
  type ProviderProfileView,
} from "@/lib/api/provider-contract";

// The canonical form-test pattern (tests/unit/category-select.test.ts):
// useActionState mocked, the server data layer mocked, markup asserted
// via renderToStaticMarkup. The S3 layer under test: the J5 edit form
// mirrors the measured PUT semantics (clear-on-empty optional fields,
// the actor select always sends), the L20 statement vocabulary, and the
// bounds of ProviderRequest — the backend stays the enforcement.

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [{ status: "idle" }, () => undefined, false],
  };
});

vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(),
  backendSend: vi.fn(),
  backendSendPublic: vi.fn(),
}));

// The provider action modules read the session through @/lib/dal,
// whose import chain eagerly validates BETTER_AUTH_SECRET (src/lib/auth)
// — mocked here exactly like tests/unit/form-accessibility.test.ts.
vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000001",
    name: null,
    email: "qa-unit@example.test",
  })),
}));

/** A measured ProviderResponse shape (staging, 2026-09-29). */
const PROFILE: ProviderProfileView = {
  id: "11111111-2222-4333-8444-555555555555",
  displayName: "أحرار للضيافة الساحلية",
  bio: "استضافة ساحلية منذ 2019",
  status: "PENDING",
  actorType: "INDEPENDENT_BROKER",
  agencyName: "عقارات قدسيا برايم",
  licenseNumber: "BR-2026-1149",
  ratingAverage: null,
  createdAt: "2026-09-29T10:00:00Z",
  updatedAt: "2026-09-29T10:00:00Z",
};

function control(markup: string, match: string): string {
  return markup.match(new RegExp(match))?.[0] ?? "";
}

/** Whole-element capture (order-independent — React renders attributes in
 * its own order, and a textarea's prefilled value is the element's CHILD). */
function element(markup: string, name: string, tag: string): string {
  if (tag === "textarea") {
    return (
      markup.match(new RegExp(`<textarea[^>]*name="${name}"[^>]*>[^<]*</textarea>`))?.[0] ??
      ""
    );
  }
  return markup.match(new RegExp(`<${tag}[^>]*name="${name}"[^>]*>`))?.[0] ?? "";
}

test("the L20 movement vocabulary carries the three measured classes with Arabic labels", () => {
  expect(Object.keys(LEDGER_ENTRY_TYPE_LABELS).sort()).toEqual(
    ["COMMISSION_DEBIT", "PAYMENT_CREDIT", "REFUND_DEBIT"].sort(),
  );
  expect(LEDGER_ENTRY_TYPE_LABELS.PAYMENT_CREDIT).toContain("دائن");
  expect(LEDGER_ENTRY_TYPE_LABELS.COMMISSION_DEBIT).toContain("عمولة");
  expect(LEDGER_ENTRY_TYPE_LABELS.REFUND_DEBIT).toContain("استرداد");
});

test("the edit form carries the profile PK as its hidden pointer + every measured bound", () => {
  const markup = renderToStaticMarkup(createElement(EditProviderProfileForm, { profile: PROFILE }));
  // The id rides the form as a POINTER (the backend re-verifies
  // ownership on the PUT — never an authority here).
  expect(markup).toContain('type="hidden" name="profileId"');
  expect(markup).toContain(PROFILE.id);
  // The ProviderRequest bounds mirror the backend's Bean Validation.
  expect(element(markup, "displayName", "input")).toContain(
    `maxLength="${PROVIDER_NAME_MAX}"`,
  );
  expect(element(markup, "displayName", "input")).toContain('required=""');
  expect(element(markup, "bio", "textarea")).toContain(`maxLength="${PROVIDER_BIO_MAX}"`);
  expect(element(markup, "agencyName", "input")).toContain(
    `maxLength="${PROVIDER_AGENCY_MAX}"`,
  );
  expect(element(markup, "licenseNumber", "input")).toContain(
    `maxLength="${PROVIDER_LICENSE_MAX}"`,
  );
});

test("the edit form prefills every stored field (null optionals render empty, never 'null')", () => {
  const markup = renderToStaticMarkup(createElement(EditProviderProfileForm, { profile: PROFILE }));
  expect(element(markup, "displayName", "input")).toContain(PROFILE.displayName);
  expect(element(markup, "bio", "textarea")).toContain(PROFILE.bio ?? "");
  expect(element(markup, "agencyName", "input")).toContain(PROFILE.agencyName ?? "");
  expect(element(markup, "licenseNumber", "input")).toContain(PROFILE.licenseNumber ?? "");
  // The stored actor classification arrives PRESELECTED (same value on
  // submit = no change — the form's honest equivalent of the backend's
  // omitted-actorType-keeps rule).
  expect(control(markup, '<option value="INDEPENDENT_BROKER"[^>]*>')).toContain("selected");
});

test("null persona fields prefills render as empty values, not the string 'null'", () => {
  const bare: ProviderProfileView = { ...PROFILE, bio: null, agencyName: null, licenseNumber: null };
  const markup = renderToStaticMarkup(createElement(EditProviderProfileForm, { profile: bare }));
  expect(markup).not.toContain(">null</textarea>");
  expect(markup).not.toContain('value="null"');
});

test("the clear-on-empty semantics are stated on both optional persona fields", () => {
  const markup = renderToStaticMarkup(createElement(EditProviderProfileForm, { profile: PROFILE }));
  const hints = markup.match(/اتركه فارغًا لمسح القيمة المخزّنة\./g) ?? [];
  // agencyName AND licenseNumber — the measured PUT semantics (the bio
  // contract: omitted clears) said aloud, never silent.
  expect(hints.length).toBe(2);
});

test("the actor select offers exactly the three measured classifications", () => {
  const markup = renderToStaticMarkup(createElement(EditProviderProfileForm, { profile: PROFILE }));
  expect(markup).toContain('<option value="INDIVIDUAL">');
  expect(markup).toContain('<option value="INDEPENDENT_BROKER"');
  expect(markup).toContain('<option value="AGENCY">');
});
