import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { CreateCampaignForm, PauseCampaignForm, ResumeCampaignForm } from "@/app/provider/ads/forms";
import {
  createAdCampaignAction,
  pauseAdCampaignAction,
  resumeAdCampaignAction,
} from "@/app/provider/ads/actions";
import { recordAdClick } from "@/lib/api/ads";
import { backendSend, backendSendPublic } from "@/lib/api/server";

/**
 * N13 — the W5 ads & billing frontend wave's ISLAND net (the
 * yelp-w3-islands pattern: the client islands render under a mocked
 * useActionState; the server actions run against the mocked server
 * channel layer — the REAL ads channel rides it, so the wire paths and
 * bodies are asserted literally):
 *
 * - G24: the creation form (the picker + the money trio + the optional
 *   UTC end) renders with the backend's own bean bounds mirrored in
 *   HTML, and the empty inventory answers the honest note — never a
 *   form that cannot succeed;
 * - the hold/lift pair per status;
 * - the actions: the lossless major→cents conversion, the SAR house
 *   currency, the endsAt → ISO instant convention, every gate's own
 *   words on refusal, and the wire paths;
 * - the wave's ONE public write: the click recording's own lane
 *   (backendSendPublic — the L34 lead form's discipline).
 */

const actionState = vi.hoisted(() => ({
  current: { status: "idle" } as unknown,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [actionState.current, () => undefined, false],
  };
});

const CAMPAIGN_ID = "0dc56ab0-5f2a-4648-aeca-401903b2e245";
const LISTING_ID = "36363636-3636-4363-8363-363636360008";

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "n", email: "e" })),
}));

// The server channel layer — the REAL ads channel rides these mocks, so
// the assertions see the literal wire paths and bodies.
vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  backendSend: vi.fn(async () => ({
    ok: true,
    status: 201,
    data: {
      id: CAMPAIGN_ID,
      listingId: LISTING_ID,
      budgetCents: 50000,
      clickPriceCents: 100,
      impressionPriceCents: 0,
      consumedCents: 0,
      remainingCents: 50000,
      currency: "SAR",
      status: "ACTIVE",
      startsAt: "2026-10-03T16:52:54Z",
      endsAt: null,
      billedThrough: "2026-10-04",
      createdAt: "2026-10-03T16:52:54Z",
    },
  })),
  backendSendPublic: vi.fn(async () => ({ ok: true, status: 200, data: { campaignId: CAMPAIGN_ID } })),
}));

// The actions' refresh() runs only inside a real Server Action — the
// w3 islands' own mock (the re-read itself is the browser round's job).
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const idle = () => ({ status: "idle" }) as never;

// ---------------------------------------------------------------------------
// G24 — the creation form's islands
// ---------------------------------------------------------------------------

test("the creation form renders the picker + the money trio + the optional UTC end", () => {
  const markup = renderToStaticMarkup(
    createElement(CreateCampaignForm, {
      listings: [
        { id: LISTING_ID, title: "بنتهاوس بتراس خاص", price: "380.00 ر.س." },
        { id: "36363636-3636-4363-8363-363636360016", title: "شقة تراثية دمشقية", price: "230.00 ر.س." },
      ],
    }),
  );
  expect(markup).toContain('name="listingId"');
  expect(markup).toContain("بنتهاوس بتراس خاص");
  expect(markup).toContain("شقة تراثية دمشقية");
  // The bean bounds mirrored in HTML: budget strictly positive, prices
  // non-negative, whole units (the lossless cents conversion). The
  // house lesson (measured 2026-09-29): React's attribute ORDER is not
  // guaranteed — assert each attribute independently, never one regex
  // over the whole tag.
  expect(markup).toContain('name="budget"');
  expect(markup).toContain('min="1"');
  expect(markup).toContain('name="clickPrice"');
  expect(markup).toContain('min="0"');
  expect(markup).toContain('name="impressionPrice"');
  expect(markup).toContain('step="1"');
  // The house rule: numeric inputs are LTR.
  expect(markup).toContain('dir="ltr"');
  // The optional end rides the booking form's own convention.
  expect(markup).toContain('name="endsAt"');
  expect(markup).toContain('type="datetime-local"');
  expect(markup).toContain("ابدأ الترويج المدفوع");
});

test("an empty ACTIVE inventory answers the honest note — never a form that cannot succeed", () => {
  const markup = renderToStaticMarkup(createElement(CreateCampaignForm, { listings: [] }));
  expect(markup).toContain("لا إعلانات نشطة لديك الآن");
  expect(markup).not.toContain('name="budget"');
});

test("the hold/lift pair renders per status with the campaign's own key", () => {
  const pause = renderToStaticMarkup(createElement(PauseCampaignForm, { campaignId: CAMPAIGN_ID }));
  expect(pause).toContain(`value="${CAMPAIGN_ID}"`);
  expect(pause).toContain("أوقف الحملة");
  const resume = renderToStaticMarkup(createElement(ResumeCampaignForm, { campaignId: CAMPAIGN_ID }));
  expect(resume).toContain(`value="${CAMPAIGN_ID}"`);
  expect(resume).toContain("استأنف الحملة");
});

// ---------------------------------------------------------------------------
// The actions — the wire bodies and every gate's own words
// ---------------------------------------------------------------------------

test("createAdCampaignAction: the lossless conversion rides the wire (major → cents, SAR, no endsAt when blank)", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "500");
  fd.set("clickPrice", "1");
  fd.set("impressionPrice", "0");
  fd.set("endsAt", "");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("success");
  expect(backendSend).toHaveBeenCalledWith("POST", "/api/v1/providers/me/ads/campaigns", {
    listingId: LISTING_ID,
    budgetCents: 50000,
    clickPriceCents: 100,
    impressionPriceCents: 0,
    currency: "SAR",
  });
});

test("createAdCampaignAction: a valid endsAt travels as an ISO instant (the UTC convention)", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "500");
  fd.set("clickPrice", "1");
  fd.set("impressionPrice", "0");
  fd.set("endsAt", "2026-11-02T16:52");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("success");
  const call = vi.mocked(backendSend).mock.calls.at(-1);
  const body = call?.[2] as { endsAt?: string };
  expect(body.endsAt).toBe("2026-11-02T16:52:00.000Z");
});

test("createAdCampaignAction: a zero budget never reaches the channel (the bean bound mirrored)", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "0");
  fd.set("clickPrice", "1");
  fd.set("impressionPrice", "0");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") expect(out.field).toBe("budget");
  expect(vi.mocked(backendSend).mock.calls.length).toBe(0);
});

test("createAdCampaignAction: a negative price never reaches the channel", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "500");
  fd.set("clickPrice", "-1");
  fd.set("impressionPrice", "0");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") expect(out.field).toBe("clickPrice");
  expect(vi.mocked(backendSend).mock.calls.length).toBe(0);
});

test("createAdCampaignAction: a past endsAt never reaches the channel", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "500");
  fd.set("clickPrice", "1");
  fd.set("impressionPrice", "0");
  fd.set("endsAt", "2020-01-01T00:00");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") expect(out.field).toBe("endsAt");
  expect(vi.mocked(backendSend).mock.calls.length).toBe(0);
});

test("createAdCampaignAction: the single-promotion 409's own userMessage surfaces (the problemMessage priority)", async () => {
  vi.mocked(backendSend).mockResolvedValueOnce({
    ok: false,
    status: 409,
    problem: {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail:
        `Listing ${LISTING_ID} already has a live campaign (${CAMPAIGN_ID}) — the single-promotion law: pause or let it end first`,
      instance: "/api/v1/providers/me/ads/campaigns",
      userMessage: "The resource changed while you were working on it. Please try again.",
    },
    unauthenticated: false,
  } as never);
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  fd.set("budget", "500");
  fd.set("clickPrice", "1");
  fd.set("impressionPrice", "0");
  const out = await createAdCampaignAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") {
    expect(out.message).toContain("The resource changed while you were working on it");
  }
});

test("createAdCampaignAction: the anonymous gate answers the re-auth note", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const out = await createAdCampaignAction(idle(), new FormData());
  expect(out).toEqual({
    status: "error",
    message: "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.",
  } as { status: "error"; message: string });
});

test("pauseAdCampaignAction / resumeAdCampaignAction: the wire paths and the success notes", async () => {
  const fd = new FormData();
  fd.set("campaignId", CAMPAIGN_ID);
  const pause = await pauseAdCampaignAction(idle(), fd);
  expect(pause.status).toBe("success");
  expect(backendSend).toHaveBeenCalledWith(
    "POST",
    `/api/v1/providers/me/ads/campaigns/${CAMPAIGN_ID}/pause`,
    {},
  );
  const resume = await resumeAdCampaignAction(idle(), fd);
  expect(resume.status).toBe("success");
  expect(backendSend).toHaveBeenCalledWith(
    "POST",
    `/api/v1/providers/me/ads/campaigns/${CAMPAIGN_ID}/resume`,
    {},
  );
});

// ---------------------------------------------------------------------------
// The wave's ONE public write — the click recording's own lane
// ---------------------------------------------------------------------------

test("recordAdClick rides backendSendPublic (the L34 lead form's lane) with the listing's own path", async () => {
  const out = await recordAdClick(LISTING_ID);
  expect(out.ok).toBe(true);
  expect(backendSendPublic).toHaveBeenCalledWith(
    "POST",
    `/api/v1/ads/listings/${LISTING_ID}/clicks`,
  );
});

test("recordAdClick swallows the honest 404 no-op as data (an unpromoted click is nobody's to bill)", async () => {
  vi.mocked(backendSendPublic).mockResolvedValueOnce({
    ok: false,
    status: 404,
    problem: null,
    unauthenticated: false,
  } as never);
  const out = await recordAdClick(LISTING_ID);
  expect(out.ok).toBe(false);
  expect(out.status).toBe(404);
});
