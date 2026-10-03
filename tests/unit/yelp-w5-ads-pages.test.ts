import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { expect, test, vi } from "vitest";
import ProviderAdsPage from "@/app/provider/ads/page";
import ListingPage from "@/app/listings/[id]/page";
import { getMyAdCampaigns, getAdCampaignCharges, recordAdClick } from "@/lib/api/ads";
import type { AdCampaignView } from "@/lib/api/ads-contract";

/**
 * N13 — the W5 ads & billing frontend wave's PAGE net (the
 * yelp-w3-pages pattern: the async server page renders with every data
 * channel mocked and the client islands stubbed so the render stays
 * server-safe — the streaming SSR API resolves suspending children the
 * way Next's own runtime does):
 *
 * - the ads board's own states: the sign-in gate, the no-profile
 *   funnel, the honest empty start, and the served campaign row (the
 *   frozen money state + the status vocabulary + the charges
 *   disclosure with a frozen window);
 * - the public detail page FIRES the wave's one public write (the
 *   click recording) on render.
 */

const CAMPAIGN_ID = "0dc56ab0-5f2a-4648-aeca-401903b2e245";
const LISTING_ID = "36363636-3636-4363-8363-363636360008";

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "n", email: "e" })),
}));

vi.mock("@/lib/api/ads", () => ({
  getMyAdCampaigns: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  getAdCampaignCharges: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  createAdCampaign: vi.fn(),
  pauseAdCampaign: vi.fn(),
  resumeAdCampaign: vi.fn(),
  recordAdClick: vi.fn(async () => ({ ok: true, status: 200, data: { campaignId: CAMPAIGN_ID } })),
}));

// The me-chain (the wave's measured lesson): the picker's id-keyed read
// resolves the BACKEND user UUID through /users/me — never the Better
// Auth session id.
const SAMIRA_BACKEND_ID = "33333333-3333-4333-8333-333333330002";
vi.mock("@/lib/api/inbox", () => ({
  getMyBackendUser: vi.fn(async () => ({ ok: true, id: SAMIRA_BACKEND_ID })),
}));

vi.mock("@/lib/api/public", () => ({
  getProviderListings: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: LISTING_ID,
          title: "بنتهاوس بتراس خاص — إطلالة جبلية",
          category: "stay",
          price: 380,
          currency: "SAR",
        },
      ],
      totalElements: 1,
      last: true,
    },
  })),
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

vi.mock("@/app/provider/ads/forms", () => ({
  CreateCampaignForm: () => "create-campaign-stub",
  PauseCampaignForm: () => "pause-campaign-stub",
  ResumeCampaignForm: () => "resume-campaign-stub",
}));

vi.mock("@/app/auth-buttons", () => ({
  SignInButton: () => "sign-in-stub",
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

const campaign: AdCampaignView = {
  id: CAMPAIGN_ID,
  listingId: LISTING_ID,
  budgetCents: 50000,
  clickPriceCents: 100,
  impressionPriceCents: 25,
  consumedCents: 0,
  remainingCents: 50000,
  currency: "SAR",
  status: "ACTIVE",
  startsAt: "2026-10-03T16:52:54Z",
  endsAt: "2026-11-02T16:52:53Z",
  billedThrough: "2026-10-04",
  createdAt: "2026-10-03T16:52:54Z",
};

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
    writable.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

test("the ads board answers the sign-in gate for the anonymous caller", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const markup = renderToStaticMarkup(
    await ProviderAdsPage({} as never),
  );
  expect(markup).toContain("sign-in-stub");
  expect(markup).toContain("الحملات الإعلانية للمزوّدين المسجّلين");
});

test("the ads board's 404 IS the no-profile funnel input", async () => {
  vi.mocked(getMyAdCampaigns).mockResolvedValueOnce({
    ok: false,
    status: 404,
    problem: {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No provider profile",
    },
    unauthenticated: false,
  } as never);
  const markup = renderToStaticMarkup(await ProviderAdsPage({} as never));
  expect(markup).toContain("لا ملف مزوّد لحسابك بعد");
  expect(markup).toContain("إلى لوحة المزوّد");
});

test("the honest empty start — no campaigns yet", async () => {
  const markup = renderToStaticMarkup(await ProviderAdsPage({} as never));
  expect(markup).toContain("لم تروّج بعد");
  expect(markup).toContain("create-campaign-stub");
});

test("a served campaign row renders the frozen money state + the status vocabulary + the charges disclosure", async () => {
  vi.mocked(getMyAdCampaigns).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: [campaign],
  } as never);
  vi.mocked(getAdCampaignCharges).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: [
      {
        windowStart: "2026-10-03",
        windowEnd: "2026-10-04",
        impressions: 12,
        clicks: 2,
        amountCents: 500,
        currency: "SAR",
        frozenAt: "2026-10-04T04:45:01Z",
      },
    ],
  } as never);
  const markup = renderToStaticMarkup(await ProviderAdsPage({} as never));
  // The status vocabulary's Arabic label (the served value verbatim).
  expect(markup).toContain("نشطة");
  // The frozen money state's own labels.
  expect(markup).toContain("الميزانية");
  expect(markup).toContain("المُستهلك المجمّد");
  expect(markup).toContain("المتبقي");
  expect(markup).toContain("سعر النقرة / الظهور");
  expect(markup).toContain("آخر نافذة فوترة");
  // The listing link rides the campaign's own listingId.
  expect(markup).toContain(`href="/listings/${LISTING_ID}"`);
  expect(markup).toContain("بنتهاوس بتراس خاص");
  // The ACTIVE row carries the hold form.
  expect(markup).toContain("pause-campaign-stub");
  // The charges disclosure carries the frozen window + the freeze note.
  expect(markup).toContain("سجل الفوترة المجمّدة");
  expect(markup).toContain("سجل غير قابل للتعديل");
});

test("a PAUSED row carries the lift form instead of the hold", async () => {
  vi.mocked(getMyAdCampaigns).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: [{ ...campaign, status: "PAUSED" }],
  } as never);
  const markup = renderToStaticMarkup(await ProviderAdsPage({} as never));
  expect(markup).toContain("موقوفة");
  expect(markup).toContain("resume-campaign-stub");
  expect(markup).not.toContain("pause-campaign-stub");
});

test("the public detail page FIRES the click recording on render (the wave's one public write)", async () => {
  const element = await ListingPage({
    params: Promise.resolve({ id: LISTING_ID }),
    searchParams: Promise.resolve({}),
  });
  const markup = await renderStreamed(element);
  expect(markup).toContain("بنتهاوس بتراس خاص");
  expect(recordAdClick).toHaveBeenCalledWith(LISTING_ID);
});
