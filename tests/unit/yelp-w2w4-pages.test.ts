import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import ProviderPublicPage from "@/app/providers/[id]/page";
import ReviewerPublicPage from "@/app/users/[id]/page";
import CategoryPage from "@/app/categories/[code]/page";
import {
  PROVIDER_VERIFICATION_LABELS,
  REVIEWER_BADGE_LABELS,
  WEEKDAY_ORDER,
  type ProviderPublicPageView,
  type ReviewerPublicProfileView,
} from "@/lib/api/reputation-contract";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/api/inbox-contract";

/**
 * N10 — the W2+W4 frontend waves' PAGE net (the
 * neighborhood-member-render pattern: renderToStaticMarkup over
 * mocked async server components with every data channel mocked and
 * the client islands stubbed so the render stays server-safe):
 *
 * - W2 (the business page, #489): the verification chip, the star
 *   histograms (the mode law), the declared week, the services menu,
 *   the resolved areas, and the backend's LocalBusiness JSON-LD
 *   embedded VERBATIM;
 * - W4 (the reviewer identity, #494): the public reviewer page (the
 *   derived badges + the counters) and the review rows' click target;
 * - G23: the public category page on the registry's own vocabulary;
 * - the notification-matrix debt closed: the ninth type joins
 *   POST_REACTED (the N3 gap) — the enum's own order.
 */

const PROVIDER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const REVIEWER_ID = "00000000-0000-4000-8000-0000000000aa";

const w2w4ProviderPage: ProviderPublicPageView = {
  id: PROVIDER_ID,
  displayName: "أحمد السيد — إقامة الجبل",
  bio: "شقق مفروشة بإطلالة جبل قدسيا.",
  status: "VERIFIED",
  verificationState: "VERIFIED",
  actorType: "INDIVIDUAL",
  agencyName: null,
  licenseNumber: "LIC-4021",
  createdAt: "2026-01-15T09:00:00Z",
  reviewsMode: "HYBRID",
  ratingAverage: 4.8,
  reviewCount: 6,
  ratingGeneralAverage: 4.1,
  ratingGeneralCount: 9,
  ratingDistribution: [
    { rating: 5, count: 4 },
    { rating: 4, count: 2 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
  ratingGeneralDistribution: [
    { rating: 5, count: 5 },
    { rating: 4, count: 2 },
    { rating: 3, count: 1 },
    { rating: 2, count: 1 },
    { rating: 1, count: 0 },
  ],
  reviews: {
    content: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        rating: 5,
        comment: "تجربة ممتازة والاستقبال رائع.",
        reply: null,
        repliedAt: null,
        createdAt: "2026-09-20T10:00:00Z",
        origin: "BOOKING",
        reviewerId: REVIEWER_ID,
        reviewerName: "رنا شاهين",
        reviewerReviewCount: 7,
        helpfulCount: 3,
      },
    ],
    pageNumber: 0,
    pageSize: 10,
    totalElements: 1,
    totalPages: 1,
    last: true,
  },
  listings: {
    content: [
      {
        id: "fa528602-2ab0-4867-b7fc-3d7e2a912eba",
        title: "شقة عائلية حديثة",
        category: "stay",
        price: 350,
        currency: "SAR",
        providerName: "أحمد السيد",
      },
    ],
    pageNumber: 0,
    pageSize: 12,
    totalElements: 1,
    totalPages: 1,
    last: true,
  },
  businessHours: [
    { dayOfWeek: "SATURDAY", opensAt: "09:00:00", closesAt: "17:00:00" },
    { dayOfWeek: "MONDAY", opensAt: "10:30:00", closesAt: "18:00:00" },
  ],
  services: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "تنظيف دوري",
      description: "خدمة تنظيف أسبوعية كاملة.",
      durationMinutes: 90,
      priceCents: 15000,
      currency: "SAR",
      position: 0,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      title: "استقبال المطار",
      description: null,
      durationMinutes: null,
      priceCents: null,
      currency: null,
      position: 1,
    },
  ],
  serviceAreas: [
    {
      locationId: "11111111-1111-4111-8111-111111111104",
      nameAr: "قدسيا البلد",
      nameEn: "Qudsayya Town",
      slug: "qudsayya-town",
    },
  ],
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "أحمد السيد — إقامة الجبل",
    openingHours: ["Mo 10:30-18:00", "Sa 09:00-17:00"],
    areaServed: [{ name: "قدسيا البلد" }],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 6,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: 5 },
        datePublished: "2026-09-20",
        author: { "@type": "Person", name: "رنا شاهين" },
        reviewBody: "تجربة ممتازة والاستقبال رائع.",
      },
    ],
  },
};

const reviewerProfile: ReviewerPublicProfileView = {
  reviewerId: REVIEWER_ID,
  displayName: "رنا شاهين",
  joinedAt: "2026-02-01T08:30:00Z",
  verifiedReviewCount: 5,
  organicReviewCount: 2,
  helpfulVoteCount: 12,
  badges: ["VERIFIED_REVIEWER", "HELPFUL_REVIEWER"],
};

vi.mock("@/lib/api/reputation", () => ({
  getProviderPublicPage: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: w2w4ProviderPage,
  })),
  getReviewMedia: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  getReviewerPublicProfile: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: reviewerProfile,
  })),
  getReviewsByReviewer: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          bookingId: null,
          rating: 5,
          comment: "تجربة ممتازة.",
          reply: null,
          direction: "CONSUMER_TO_PROVIDER",
          repliedAt: null,
          createdAt: "2026-09-20T10:00:00Z",
          updatedAt: "2026-09-20T10:00:00Z",
          origin: "BOOKING",
          moderationStatus: "PUBLISHED",
          listingId: null,
          reviewerId: REVIEWER_ID,
          reviewerName: "رنا شاهين",
          reviewerReviewCount: 7,
          helpfulCount: 3,
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
      empty: false,
    },
  })),
}));

// The public page's client islands stay out of the server render — the
// stub markers prove the stubs are live (the islands' own net lives in
// tests/unit/yelp-w2w4-islands.test.ts).
vi.mock("@/app/providers/[id]/forms", () => ({
  FollowProviderButton: () => "follow-provider-button-stub",
  HelpfulVoteButton: () => "helpful-vote-button-stub",
  OrganicReviewForm: () => "organic-review-form-stub",
  ReviewFlagForm: () => "review-flag-form-stub",
}));

vi.mock("@/lib/api/public", () => ({
  getListingCategories: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: [{ code: "stay", nameEn: "Stay", nameAr: "إقامة" }],
  })),
  browseListingsByCategory: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: w2w4ProviderPage.listings,
  })),
  LISTINGS_PAGE_SIZE: 12,
}));

/** Strip React's text-node separators so composite text can be compared. */
function textOf(markup: string): string {
  return markup.replace(/<!--.*?-->/g, "");
}

test("the provider page renders the W2 business blocks + the W4 click target", async () => {
  const element = await ProviderPublicPage({
    params: Promise.resolve({ id: PROVIDER_ID }),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);
  const flat = textOf(markup);

  // G14 — the ownership-verification chip with the served state.
  expect(markup).toContain("مالك موثّق");
  expect(markup).toContain('data-verification="VERIFIED"');

  // The histograms ride the mode law: HYBRID renders BOTH labeled
  // distributions; the served 1..5 completeness keeps the zero buckets
  // (every star row carries its own aria label).
  expect(flat).toContain("توزيع مراجعات موثّقة");
  expect(flat).toContain("توزيع مراجعات عامة");
  expect(markup).toContain('aria-label="3 من ٥"');
  expect(markup).toContain('aria-label="4 من ٥"');

  // G11 — the declared week: the two declared days in weekday labels,
  // LTR machine times; the undeclared days never render.
  expect(markup).toContain("السبت");
  expect(markup).toContain("الاثنين");
  expect(flat).toContain("09:00 — 17:00");
  expect(flat).toContain("10:30 — 18:00");
  expect(markup).not.toContain("الأربعاء");

  // G12 — the services menu: the priced row renders its price (major
  // units from integer cents) and its duration; the free row renders
  // without either. The digit system follows the runtime's ICU for
  // "ar" (Latin or Arabic-Indic — the format.test.ts dual pattern).
  expect(flat).toContain("تنظيف دوري");
  expect(flat).toMatch(/المدة: ?(90|٩٠) ?دقيقة/);
  expect(flat).toContain("استقبال المطار");

  // G13 — the resolved service areas by their Arabic names.
  expect(markup).toContain("قدسيا البلد");

  // G22 — the backend's LocalBusiness JSON-LD embedded VERBATIM (the
  // raw JSON rides the script tag; the checker sees the stars).
  expect(markup).toContain('type="application/ld+json"');
  expect(markup).toContain('"@type":"LocalBusiness"');
  expect(markup).toContain('"ratingValue":4.8');
  expect(markup).toContain('"Mo 10:30-18:00"');
  expect(markup).toContain('"name":"قدسيا البلد"');

  // W4 (G28) — the reviewer name is the LINK to the public reviewer
  // page, carried by the row's own reviewerId.
  expect(markup).toContain(`href="/users/${REVIEWER_ID}"`);
  expect(markup).toContain("رنا شاهين");

  // The follow button's client island is stubbed in.
  expect(markup).toContain("follow-provider-button-stub");
});

test("the reviewer page renders the identity block + the derived badges + the activity", async () => {
  const element = await ReviewerPublicPage({
    params: Promise.resolve({ id: REVIEWER_ID }),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);
  const flat = textOf(markup);

  // The name + the join date + the three honest counters.
  expect(markup).toContain("رنا شاهين");
  expect(flat).toContain("عضو منذ");
  expect(flat).toContain("مراجعة موثّقة");
  expect(flat).toContain("مراجعة عامة");
  expect(flat).toContain("صوت مفيد تلقّته مراجعاته");

  // G29 — the derived badges with the plan's own families.
  expect(markup).toContain(REVIEWER_BADGE_LABELS.VERIFIED_REVIEWER);
  expect(markup).toContain(REVIEWER_BADGE_LABELS.HELPFUL_REVIEWER);

  // The activity: the published row with its origin badge and the
  // published-only note.
  expect(markup).toContain("نشاط المراجع");
  expect(markup).toContain("موثّقة");
  expect(flat).toContain("المراجعات المنشورة فقط");
});

test("the category page renders the registry's own name + the dedicated browse", async () => {
  const element = await CategoryPage({
    params: Promise.resolve({ code: "stay" }),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);
  const flat = textOf(markup);

  // The registry IS the vocabulary: the Arabic display name resolved.
  expect(flat).toContain("إعلانات إقامة");
  // The dedicated category browse's real row + its detail link.
  expect(markup).toContain('href="/listings/fa528602-2ab0-4867-b7fc-3d7e2a912eba"');
  // The canonical SEO home link discipline.
  expect(markup).toContain('href="/listings"');
});

test("the notification matrix carries all NINE backend types (the N3 gap closed)", () => {
  expect(NOTIFICATION_TYPES).toHaveLength(9);
  expect(NOTIFICATION_TYPES).toContain("POST_REACTED");
  expect(NOTIFICATION_TYPES).toContain("FOLLOWED_PROVIDER_NEW_LISTING");
  // Every type carries its Arabic label (a missing label would render
  // the matrix row headless).
  for (const type of NOTIFICATION_TYPES) {
    expect(NOTIFICATION_TYPE_LABELS[type]).toBeTruthy();
  }
  expect(NOTIFICATION_TYPE_LABELS.FOLLOWED_PROVIDER_NEW_LISTING).toBe(
    "إعلان جديد لمزوّد تتابعه",
  );
});

test("the W2/W4 vocabularies match the backend enums' own values", () => {
  expect(PROVIDER_VERIFICATION_LABELS.VERIFIED).toBe("مالك موثّق");
  expect(PROVIDER_VERIFICATION_LABELS.PENDING).toBe("توثيق قيد المراجعة");
  expect(Object.keys(PROVIDER_VERIFICATION_LABELS)).toHaveLength(4);
  expect(WEEKDAY_ORDER).toHaveLength(7);
  expect(WEEKDAY_ORDER[0]).toBe("MONDAY");
});
