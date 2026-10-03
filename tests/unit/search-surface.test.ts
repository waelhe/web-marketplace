import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi, beforeEach } from "vitest";
import SearchPage from "@/app/search/page";
import {
  getListingCategories,
  searchListings,
  searchListingsByCategory,
} from "@/lib/api/public";
import type { ListingCategory, ListingSummary, PagedResponse } from "@/lib/api/types";

// The S4 layer under test: the flat /search surface — the measured wire
// routing (text → the criteria op with q ALONE, mirroring the backend's
// own q-wins dispatch; category-only → the dedicated /search/category/{c}
// gap op; idle → NO backend read), the live-registry rail, the honest
// degraded states, and the flat form contract (one text field, zero
// selects — the DoD's "مسطّح بحث نصي"). The canonical pattern: the data
// layer mocked, markup asserted via renderToStaticMarkup.

vi.mock("@/lib/api/public", () => ({
  getListingCategories: vi.fn(),
  searchListings: vi.fn(),
  searchListingsByCategory: vi.fn(),
  LISTINGS_PAGE_SIZE: 12,
}));

vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(),
  backendSend: vi.fn(),
  backendSendPublic: vi.fn(),
}));

// The page module chain pulls @/lib/dal (the auth import validates
// BETTER_AUTH_SECRET eagerly) — mocked exactly like the S3 form tests.
vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => null),
}));

const CATEGORIES: ListingCategory[] = [
  { code: "stay", nameEn: "Stay", nameAr: "إقامة" },
];

const PAGE_EMPTY: PagedResponse<ListingSummary> = {
  content: [],
  pageNumber: 0,
  pageSize: 12,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

const LISTING: ListingSummary = {
  id: "215eb44f-b49a-4eac-b151-2f3a545a6c43",
  title: "إعلان تحقق هيكلي — e2e",
  category: "stay",
  price: 1000,
  currency: "SAR",
  providerName: "Provider",
  providerRating: null,
  providerReviewCount: 0,
};

const PAGE_ONE: PagedResponse<ListingSummary> = {
  content: [LISTING],
  pageNumber: 0,
  pageSize: 12,
  totalElements: 1,
  totalPages: 1,
  last: true,
};

const props = (params: Record<string, string>) => ({
  params: Promise.resolve({}),
  searchParams: Promise.resolve(params),
});

beforeEach(() => {
  vi.mocked(getListingCategories).mockResolvedValue({ ok: true, data: CATEGORIES, status: 200 });
  vi.mocked(searchListings).mockClear();
  vi.mocked(searchListingsByCategory).mockClear();
});

describe("the flat search surface (S4 — charter J2)", () => {
  test("idle state: the flat form + the live rail, and NO search read at all", async () => {
    vi.mocked(getListingCategories).mockResolvedValue({
      ok: true,
      data: CATEGORIES,
      status: 200,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({})),
    );
    // Flat contract: ONE text field, zero selects (the DoD pins the
    // flatness the same way the landing smoke pins the hero's).
    expect(markup).toContain('action="/search"');
    expect(markup).toContain('method="get"');
    expect((markup.match(/<select/g) ?? []).length).toBe(0);
    expect(markup).toContain('name="q"');
    // The rail breathes the live registry (code as the href value).
    expect(markup).toContain('href="/search?category=stay"');
    expect(markup).toContain("إقامة");
    // Idle: the honest prompt, never a doomed backend roundtrip.
    expect(markup).toContain("ابدأ البحث");
    expect(searchListings).not.toHaveBeenCalled();
    expect(searchListingsByCategory).not.toHaveBeenCalled();
  });

  test("text mode rides the criteria op with q ALONE (the measured q-wins mirror)", async () => {
    vi.mocked(searchListings).mockResolvedValue({
      ok: true,
      data: PAGE_ONE,
      status: 200,
    });
    const markup = renderToStaticMarkup(
      // Hand-built corner: q AND category together arrive by URL — the
      // wire still carries q alone (the backend's own dispatch).
      await SearchPage(props({ q: "شقة", category: "stay" })),
    );
    expect(searchListings).toHaveBeenCalledWith({ q: "شقة" }, 0, 12);
    expect(searchListingsByCategory).not.toHaveBeenCalled();
    expect(markup).toContain("نتائج البحث النصي عن «شقة»");
    expect(markup).toContain(LISTING.title);
    // The category is NOT presented as an active filter (it is inert on
    // the backend — measured); the rail link stays a plain link.
    expect(markup).not.toContain('aria-current="page"');
  });

  test("category-only mode rides the dedicated /search/category/{c} gap op", async () => {
    vi.mocked(searchListingsByCategory).mockResolvedValue({
      ok: true,
      data: PAGE_ONE,
      status: 200,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({ category: "stay" })),
    );
    expect(searchListingsByCategory).toHaveBeenCalledWith("stay", 0, 12);
    expect(searchListings).not.toHaveBeenCalled();
    expect(markup).toContain("تصفّح الفئة «stay»");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("إلغاء الفئة");
  });

  test("empty category result answers the honest zero state, not a failure", async () => {
    vi.mocked(searchListingsByCategory).mockResolvedValue({
      ok: true,
      data: PAGE_EMPTY,
      status: 200,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({ category: "bogus" })),
    );
    expect(searchListingsByCategory).toHaveBeenCalledWith("bogus", 0, 12);
    expect(markup).toContain("لا توجد نتائج مطابقة");
    // The unknown-to-the-registry category is stated honestly (measured:
    // the backend answers 200 empty, not 400).
    expect(markup).toContain("ليست في سجل الفئات الحي");
  });

  test("a failed registry read degrades the rail honestly — the text form keeps working", async () => {
    vi.mocked(getListingCategories).mockResolvedValue({
      ok: false,
      status: 503,
      problem: null,
      unauthenticated: false,
    });
    vi.mocked(searchListings).mockResolvedValue({
      ok: true,
      data: PAGE_EMPTY,
      status: 200,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({ q: "اختبار" })),
    );
    expect(markup).toContain("تعذّرت قراءة سجل الفئات");
    expect(markup).toContain('name="q"');
    expect(markup).not.toContain('href="/search?category=stay"');
  });

  test("backend-down text search renders the honest unavailability state", async () => {
    vi.mocked(searchListings).mockResolvedValue({
      ok: false,
      status: 0,
      problem: null,
      unauthenticated: false,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({ q: "شقة" })),
    );
    expect(markup).toContain("الخادم الخلفي غير متاح");
  });

  test("empty-string params are dropped — an empty submit is the idle prompt", async () => {
    const markup = renderToStaticMarkup(
      await SearchPage(props({ q: "", category: "" })),
    );
    expect(searchListings).not.toHaveBeenCalled();
    expect(searchListingsByCategory).not.toHaveBeenCalled();
    expect(markup).toContain("ابدأ البحث");
  });

  test("pagination round-trips the arrived state losslessly in text mode", async () => {
    vi.mocked(searchListings).mockResolvedValue({
      ok: true,
      data: {
        content: [LISTING],
        pageNumber: 1,
        pageSize: 12,
        totalElements: 26,
        totalPages: 3,
        last: false,
      },
      status: 200,
    });
    const markup = renderToStaticMarkup(
      await SearchPage(props({ q: "شقة", category: "stay", page: "2" })),
    );
    // The pager preserves BOTH arrived params (URL-as-state); only the
    // page swaps. The wire read stays q-only; URL page is 0-based (R25 —
    // the pager hrefs carry the same 0-based form, display adds +1).
    expect(searchListings).toHaveBeenCalledWith({ q: "شقة" }, 2, 12);
    expect(markup).toContain("q=%D8%B4%D9%82%D8%A9");
    expect(markup).toContain("category=stay");
    expect(markup).toContain("aria-label=\"تصفّح الصفحات\"");
  });
});
