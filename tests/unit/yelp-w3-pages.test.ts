import { createElement } from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { expect, test, vi } from "vitest";
import { ListingCard } from "@/components/ui/card";
import ProfilePage from "@/app/profile/page";
import ListingPage from "@/app/listings/[id]/page";
import type { ListingFavoriteView } from "@/lib/api/favorites-contract";

/**
 * N11 — the W3 frontend wave's PAGE net (the yelp-w2w4-pages pattern:
 * renderToStaticMarkup over mocked async server components with every
 * data channel mocked and the client islands stubbed so the render
 * stays server-safe):
 *
 * - G20: the card's stars line — the rated row carries the measured
 *   pair («من ٥» + the count), the null row stays SILENT (never a
 *   fabricated zero), and a pre-W3 row (the field undefined on the
 *   wire) degrades to the same honest silence;
 * - G19: «مفضلاتي» on /profile — the ACTIVE row links, the
 *   later-expired row stays plain with its status badge, the honest
 *   unknown floor, and the empty state;
 * - the listing detail page carries the save button (the blind-button
 *   discipline — the anonymous page and the logged-in page are the
 *   same HTML).
 */

const LISTING_ID = "36363636-3636-4363-8363-363636360008";
const PROVIDER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const baseSummary = {
  id: LISTING_ID,
  title: "بنتهاوس بتراس خاص — إطلالة جبلية",
  category: "stay",
  price: 380,
  currency: "SAR",
  providerName: "محمد الحموي",
};

// ---------------------------------------------------------------------------
// G20 — the card's stars line
// ---------------------------------------------------------------------------

test("a rated row renders the stars pair (the RatingChip display discipline)", () => {
  const markup = renderToStaticMarkup(
    createElement(ListingCard, {
      listing: { ...baseSummary, providerRating: 4.5, providerReviewCount: 12 },
    }),
  );
  expect(markup).toContain("من ٥");
  expect(markup).toContain("مراجعة");
  // MEASURED (2026-10-03): Intl.NumberFormat("ar") renders LATIN digits
  // (the CLDR-42+ default) — the same measured duality as every count
  // line in the house; the ٥ in «من ٥» is the literal in the copy.
  expect(markup).toContain('aria-label="تقييم المزوّد 4.5 من ٥"');
  expect(markup).toContain(">4.5</span>");
});

test("a null rating row stays SILENT (the honest not-yet-rated row)", () => {
  const markup = renderToStaticMarkup(
    createElement(ListingCard, {
      listing: { ...baseSummary, providerRating: null, providerReviewCount: 0 },
    }),
  );
  expect(markup).not.toContain("من ٥");
  expect(markup).not.toContain("مراجعة");
});

test("a pre-W3 row (the fields undefined on the wire) degrades to the same silence", () => {
  // The adaptation seam: production may still serve rows without the
  // pair during a backend-first deploy window — undefined renders as
  // the honest not-yet-rated shape, never a crash.
  const preW3Row = { ...baseSummary } as unknown as Parameters<typeof ListingCard>[0]["listing"];
  const markup = renderToStaticMarkup(createElement(ListingCard, { listing: preW3Row }));
  expect(markup).not.toContain("من ٥");
});

test("a rated row with ZERO reviews renders the stars without the count part", () => {
  const markup = renderToStaticMarkup(
    createElement(ListingCard, {
      listing: { ...baseSummary, providerRating: 5, providerReviewCount: 0 },
    }),
  );
  expect(markup).toContain("من ٥");
  expect(markup).not.toContain("مراجعة");
});

// ---------------------------------------------------------------------------
// G19 — «مفضلاتي» on /profile
// ---------------------------------------------------------------------------

const favoriteRows: ListingFavoriteView[] = [
  {
    listingId: LISTING_ID,
    savedAt: "2026-10-03T06:51:09Z",
    title: "بنتهاوس بتراس خاص — إطلالة جبلية",
    priceCents: 38000,
    currency: "SAR",
    status: "ACTIVE",
  },
  {
    listingId: "36363636-3636-4363-8363-363636360016",
    savedAt: "2026-10-02T10:00:00Z",
    title: "شقة تراثية دمشقية مفروشة",
    priceCents: 23000,
    currency: "SAR",
    status: "EXPIRED",
  },
  {
    listingId: "36363636-3636-4363-8363-363636360024",
    savedAt: "2026-09-30T08:00:00Z",
    title: null,
    priceCents: null,
    currency: null,
    status: null,
  },
];

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "أحمد السيد", email: "e" })),
}));

vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(async () => ({ ok: true, status: 200, data: { id: "u" } })),
}));

vi.mock("@/lib/api/inbox", () => ({
  getMyBackendUser: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { id: PROVIDER_ID, displayName: "أحمد السيد" },
  })),
}));

vi.mock("@/lib/api/reputation", () => ({
  getMyWrittenReviews: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: [], totalElements: 0, pageNumber: 0, pageSize: 5, totalPages: 0, last: true },
  })),
  getReviewsOfConsumer: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: [], totalElements: 0, pageNumber: 0, pageSize: 5, totalPages: 0, last: true },
  })),
}));

vi.mock("@/lib/api/follows", () => ({
  getMyFollows: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: [], totalElements: 0 },
  })),
}));

vi.mock("@/lib/api/favorites", () => ({
  getMyFavorites: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: favoriteRows, totalElements: favoriteRows.length },
  })),
}));

vi.mock("@/app/profile/forms", () => ({
  ReviewEditForm: () => "review-edit-form-stub",
  UnfollowForm: () => "unfollow-form-stub",
  UnsaveFavoriteForm: () => "unsave-favorite-form-stub",
}));

vi.mock("@/app/auth-buttons", () => ({
  SignOutButton: () => "sign-out-button-stub",
}));

/** Strip React's text-node separators so composite text can be compared. */
function textOf(markup: string): string {
  return markup.replace(/<!--.*?-->/g, "");
}

test("«مفضلاتي» renders the CURRENT truth per row (link only for ACTIVE)", async () => {
  const markup = textOf(renderToStaticMarkup(await ProfilePage()));
  const start = markup.indexOf("مفضلاتي");
  expect(start).toBeGreaterThan(-1);
  const section = markup.slice(start, start + 2600);
  // The ACTIVE row carries the detail link.
  expect(section).toContain(`href="/listings/${LISTING_ID}"`);
  expect(section).toContain("بنتهاوس بتراس خاص");
  // The EXPIRED row stays plain with its honest badge — the detail read
  // 404s on it, so no link (the follows null-pair discipline).
  expect(section).toContain("شقة تراثية دمشقية مفروشة");
  expect(section).toContain("منتهي");
  expect(section).not.toContain(`href="/listings/36363636-3636-4363-8363-363636360016"`);
  // The null block is the honest unknown floor.
  expect(section).toContain("إعلان لم يعد قابلاً للقراءة");
  // The count line and the withdraw affordance ride the section.
  expect(section).toContain("محفوظاً");
  expect(section).toContain("unsave-favorite-form-stub");
});

test("«مفضلاتي» renders the honest empty state", async () => {
  const { getMyFavorites } = await import("@/lib/api/favorites");
  vi.mocked(getMyFavorites).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: {
      content: [],
      totalElements: 0,
      pageNumber: 0,
      pageSize: 20,
      totalPages: 0,
      last: true,
    },
  });
  const markup = textOf(renderToStaticMarkup(await ProfilePage()));
  const start = markup.indexOf("مفضلاتي");
  const section = markup.slice(start, start + 1200);
  expect(section).toContain("لا إعلانات محفوظة بعد");
  expect(section).toContain("احفظ لاحقاً");
});

test("«مفضلاتي» renders the honest failure state with the backend's own words", async () => {
  const { getMyFavorites } = await import("@/lib/api/favorites");
  vi.mocked(getMyFavorites).mockResolvedValueOnce({
    ok: false,
    status: 404,
    problem: {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No static resource api/v1/me/favorites.",
    },
    unauthenticated: false,
  });
  const markup = textOf(renderToStaticMarkup(await ProfilePage()));
  const start = markup.indexOf("مفضلاتي");
  const section = markup.slice(start, start + 1200);
  // The problemMessage priority: userMessage → detail → title → the
  // Arabic fallback — the backend's own detail words surface verbatim
  // (the MEASURED pre-W3 shape, 2026-10-03, before the backend deploy).
  expect(section).toContain("No static resource api/v1/me/favorites.");
});

// ---------------------------------------------------------------------------
// The listing detail page carries the save button
// ---------------------------------------------------------------------------

vi.mock("@/lib/api/public", () => ({
  getListingDetail: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: {
      id: LISTING_ID,
      title: "بنتهاوس بتراس خاص — إطلالة جبلية",
      description: "تراس خاص بإطلالة جبل قاسيون.",
      category: "stay",
      price: 380,
      currency: "SAR",
      maxGuests: 6,
      createdAt: "2026-09-28T09:00:00Z",
      updatedAt: "2026-09-28T09:00:00Z",
      property: null,
      expiresAt: "2026-12-15T09:00:00Z",
      pausedReason: null,
      jsonLd: null,
    },
  })),
  getListingMedia: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  resolveCoverUrls: vi.fn(async () => new Map()),
  LISTINGS_PAGE_SIZE: 12,
}));

vi.mock("@/app/listings/[id]/share-button", () => ({
  ShareButton: () => "share-button-stub",
}));

vi.mock("@/app/listings/[id]/save-favorite-button", () => ({
  SaveFavoriteButton: () => "save-favorite-button-stub",
}));

vi.mock("@/app/listings/lead-form", () => ({
  LeadForm: () => "lead-form-stub",
}));

test("the listing detail page carries the save button (the blind-button surface)", async () => {
  // The detail page renders an async CHILD (GallerySection) — the
  // streaming SSR API resolves it the way Next's own runtime does
  // (renderToStaticMarkup refuses suspending children).
  const element = await ListingPage({
    params: Promise.resolve({ id: LISTING_ID }),
    searchParams: Promise.resolve({}),
  });
  const markup = textOf(await renderStreamed(element));
  expect(markup).toContain("save-favorite-button-stub");
  expect(markup).toContain("بنتهاوس بتراس خاص");
});

/** React 19 streaming SSR — collects the full document off the pipe. */
function renderStreamed(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
    });
    const { pipe } = renderToPipeableStream(element, {
      onError(e) {
        reject(e);
      },
    });
    pipe(writable);
    writable.on("finish", () => {
      resolve(Buffer.concat(chunks).toString());
    });
  });
}
