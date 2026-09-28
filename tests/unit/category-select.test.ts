import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { CreateListingForm, EditListingForm } from "@/app/provider/forms";
import { PricingRuleCreateForm } from "@/app/admin/forms";
import {
  CategoryDatalist,
  CategorySelect,
  categoryLabel,
} from "@/components/ui/category-select";
import type { ListingCategory } from "@/lib/api/types";

// The canonical form-test pattern (tests/unit/register-form.test.ts):
// useActionState mocked, the server data layer mocked, markup asserted
// via renderToStaticMarkup. The S2 layer under test: every category
// surface offers exactly the LIVE registry vocabulary (value = code,
// Arabic label), degrades honestly when the read failed, and preserves
// outside-vocabulary values losslessly.

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

// The provider/admin action modules read the session through @/lib/dal,
// whose import chain eagerly validates BETTER_AUTH_SECRET (src/lib/auth)
// — mocked here exactly like tests/unit/form-accessibility.test.ts.
vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000001",
    name: null,
    email: "qa-unit@example.test",
  })),
}));

/** The measured live vocabulary (2026-09-29, staging + production). */
const STAY: ListingCategory = { code: "stay", nameEn: "Stay", nameAr: "إقامة" };
/** The schema allows NULL display names — the fallback chain's cases. */
const EN_ONLY: ListingCategory = { code: "hajj", nameEn: "Hajj", nameAr: null };
const BARE: ListingCategory = { code: "rawa", nameEn: null, nameAr: null };
const VOCAB: ListingCategory[] = [STAY, EN_ONLY, BARE];

function control(markup: string, match: string): string {
  return markup.match(new RegExp(match))?.[0] ?? "";
}

test("categoryLabel falls back nameAr → nameEn → code (nullable display names)", () => {
  expect(categoryLabel(STAY)).toBe("إقامة");
  expect(categoryLabel(EN_ONLY)).toBe("Hajj");
  expect(categoryLabel(BARE)).toBe("rawa");
});

test("CategorySelect renders live registry options: value = the CODE, Arabic label, English title", () => {
  const markup = renderToStaticMarkup(
    createElement(CategorySelect, { categories: VOCAB, emptyLabel: "الكل" }),
  );
  const stay = control(markup, '<option value="stay"[^>]*>[^<]*</option>');
  expect(stay).toContain('title="Stay"');
  expect(stay).toContain("إقامة");
  // The nullable-name rows: no empty title attribute, label falls back.
  expect(control(markup, '<option value="hajj"[^>]*>.*?</option>')).toContain("Hajj");
  expect(control(markup, '<option value="rawa"[^>]*>.*?</option>')).toContain("rawa");
  // The no-filter option is FIRST (the «الكل» discipline). React's static
  // markup marks the selected option with `selected=""` — allowed here.
  expect(markup).toMatch(/<select name="category"><option value=""( selected="")?>الكل<\/option>/);
});

test("CategorySelect preserves an outside-vocabulary value losslessly (the radius pattern)", () => {
  const markup = renderToStaticMarkup(
    createElement(CategorySelect, {
      categories: VOCAB,
      emptyLabel: "الكل",
      defaultValue: "legacy1",
    }),
  );
  // The arriving value rides as a raw-value option AFTER the vocabulary —
  // a submit never silently drops it. (Static markup: the matching
  // option carries `selected=""`.)
  expect(control(markup, '<option value="legacy1"[^>]*>legacy1</option>')).not.toBe("");
});

test("CategorySelect with no emptyLabel renders no empty option (required pickers)", () => {
  const markup = renderToStaticMarkup(
    createElement(CategorySelect, { categories: [STAY], required: true }),
  );
  expect(markup).toContain("<select");
  expect(markup).toContain('required=""');
  expect(markup).not.toContain('<option value="">');
});

test("CategoryDatalist carries the live bilingual suggestions (value = code)", () => {
  const markup = renderToStaticMarkup(
    createElement(CategoryDatalist, { id: "hero-category-examples", categories: [STAY] }),
  );
  expect(markup).toContain('<datalist id="hero-category-examples">');
  expect(markup).toContain('<option value="stay" title="Stay">إقامة</option>');
});

test("CreateListingForm picks from the live registry (required select, no empty option)", () => {
  const markup = renderToStaticMarkup(
    createElement(CreateListingForm, { categories: [STAY] }),
  );
  const select = control(markup, '<select[^>]*id="listing-category"[^>]*>');
  expect(select).toContain('required=""');
  expect(markup).toContain('<option value="stay" title="Stay">إقامة</option>');
  expect(markup).not.toContain('<option value="">');
  // The free-text fallback must NOT render alongside the picker — the
  // picker replaces it entirely when the vocabulary is live.
  expect(markup).toContain("<select");
  const degraded = renderToStaticMarkup(
    createElement(CreateListingForm, { categories: null }),
  );
  expect(degraded).not.toContain("<select");
  expect(degraded).toContain('id="listing-category"');
});

test("CreateListingForm degrades honestly when the vocabulary read failed (null)", () => {
  const markup = renderToStaticMarkup(
    createElement(CreateListingForm, { categories: null }),
  );
  const input = control(markup, '<input[^>]*id="listing-category"[^>]*>');
  expect(input).toContain('type="text"');
  expect(input).toContain('required=""');
  // React's static markup keeps the camelCase attribute name.
  expect(input).toContain('maxLength="100"');
  // The honest gate note — the journey is not blocked, the backend's 400
  // words will surface verbatim on a bad code.
  expect(markup).toContain("تعذّر جلب قائمة الفئات الحية");
});

test("EditListingForm keeps the current value selectable — unchanged legacy passes the backend's unless-unchanged gate", () => {
  const listing = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "شقة عائلية",
    description: null,
    category: "legacy1",
    price: 350,
    currency: "SAR",
    maxGuests: 4,
  };
  const markup = renderToStaticMarkup(
    createElement(EditListingForm, { listing, categories: [STAY] }),
  );
  // The stored legacy value rides as an option (submission unchanged is
  // legal per requireKnownCategoryUnlessUnchanged) beside the registry.
  expect(control(markup, '<option value="legacy1"[^>]*>legacy1</option>')).not.toBe("");
  expect(markup).toContain('<option value="stay" title="Stay">إقامة</option>');
});

test("EditListingForm degrades to prefilled free text when the read failed", () => {
  const listing = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "شقة عائلية",
    description: null,
    category: "stay",
    price: 350,
    currency: "SAR",
    maxGuests: 4,
  };
  const markup = renderToStaticMarkup(
    createElement(EditListingForm, { listing, categories: null }),
  );
  const input = control(markup, '<input[^>]*id="edit-category"[^>]*>');
  expect(input).toContain('type="text"');
  expect(input).toContain('value="stay"');
  expect(input).toContain('maxLength="100"');
});

test("PricingRuleCreateForm offers the general-rule empty option + the registry", () => {
  const markup = renderToStaticMarkup(
    createElement(PricingRuleCreateForm, { categories: [STAY] }),
  );
  expect(control(markup, '<option value=""[^>]*>بدون فئة — قاعدة عامة</option>')).not.toBe("");
  expect(markup).toContain('<option value="stay" title="Stay">إقامة</option>');
});

test("PricingRuleCreateForm degrades to the contract's own free text (≤100)", () => {
  const markup = renderToStaticMarkup(
    createElement(PricingRuleCreateForm, { categories: null }),
  );
  const input = control(markup, '<input[^>]*id="rule-category"[^>]*>');
  expect(input).toContain('type="text"');
  expect(input).toContain('maxLength="100"');
  expect(markup).not.toContain("<select");
});
