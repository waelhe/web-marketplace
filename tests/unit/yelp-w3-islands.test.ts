import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { SaveFavoriteButton } from "@/app/listings/[id]/save-favorite-button";
import { UnsaveFavoriteForm } from "@/app/profile/forms";
import { saveFavoriteAction } from "@/app/listings/actions";
import { unsaveFavoriteAction } from "@/app/profile/actions";
import { saveListingFavorite } from "@/lib/api/favorites";
import { unsaveListingFavorite } from "@/lib/api/favorites";
import {
  criteriaFromLink,
  linkFromCriteria,
  savedSearchLabel,
} from "@/lib/api/saved-searches";

/**
 * N11 — the W3 frontend wave's ISLAND net (the yelp-w2w4-islands
 * pattern: the client islands render under a mocked useActionState;
 * the server actions run against mocked channels; the CONTRACT is
 * asserted literally):
 *
 * - G19: the save button (the blind-button discipline — the anonymous
 *   and the logged-in page are the same HTML) + the unsave form + their
 *   actions' gates (the session gate, the UUID gate, the channel call,
 *   the honest failure path surfaces the backend's own words);
 * - G17: the saved-search round-trip carries the min-stars floor (the
 *   backend's matcher composes it for free — the member the matcher
 *   will re-apply).
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

const LISTING_ID = "36363636-3636-4363-8363-363636360008";

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "n", email: "e" })),
}));

vi.mock("@/lib/api/favorites", () => ({
  saveListingFavorite: vi.fn(async () => ({
    ok: true,
    status: 201,
    data: {
      listingId: LISTING_ID,
      savedAt: "2026-10-03T06:51:09Z",
      title: "بنتهاوس بتراس خاص",
      priceCents: 38000,
      currency: "SAR",
      status: "ACTIVE",
    },
  })),
  unsaveListingFavorite: vi.fn(async () => ({ ok: true, status: 204, data: null })),
  getMyFavorites: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: [], totalElements: 0 },
  })),
}));

// The listings actions module also imports the saved-searches channel
// (its own sibling surface) — stub it so the module graph stays flat.
vi.mock("@/lib/api/saved-searches", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/saved-searches")>();
  return { ...actual };
});

// The actions' refresh() runs only inside a real Server Action — the
// w2w4 islands' own mock (the re-read itself is the browser round's
// job, not the unit net's).
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const idle = () => ({ status: "idle" }) as never;

test("the save button renders BLIND (crawler parity — no session read, no state guess)", () => {
  const markup = renderToStaticMarkup(
    createElement(SaveFavoriteButton, { listingId: LISTING_ID }),
  );
  expect(markup).toContain('name="listingId"');
  expect(markup).toContain("احفظ لاحقاً");
  // The public-page discipline: the aria affordance names the round trip.
  expect(markup).toContain('aria-label="احفظ هذا الإعلان لتعود إليه لاحقاً من ملفك الشخصي"');
  // The blind button never renders a favorite STATE (the state lives in
  // «مفضلاتي» where the live rows are served).
  expect(markup).not.toContain("محفوظ");
});

test("the unsave form carries the LISTING id (the pair's own key, not a row id)", () => {
  const markup = renderToStaticMarkup(
    createElement(UnsaveFavoriteForm, { listingId: LISTING_ID }),
  );
  expect(markup).toContain('name="listingId"');
  expect(markup).toContain("اسحبه من مفضلاتك");
});

test("saveFavoriteAction: the channel call + the success note names the list", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  const out = await saveFavoriteAction(idle(), fd);
  expect(out).toEqual({
    status: "success",
    message: "حُفظ الإعلان في مفضلاتك — «مفضلاتي» في ملفك الشخصي تجدها.",
  });
  expect(saveListingFavorite).toHaveBeenCalledWith(LISTING_ID);
});

test("saveFavoriteAction: the anonymous gate answers the re-auth note", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const out = await saveFavoriteAction(idle(), new FormData());
  expect(out).toEqual({
    status: "error",
    message: "سجّل الدخول أولًا — حفظ الإعلانات لعملاء المنصة المسجّلين.",
  } as { status: "error"; message: string });
});

test("saveFavoriteAction: a malformed listing id never reaches the channel", async () => {
  const fd = new FormData();
  fd.set("listingId", "not-a-uuid");
  const out = await saveFavoriteAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") expect(out.message).toContain("غير صالح");
  expect(saveListingFavorite).not.toHaveBeenCalledWith("not-a-uuid");
});

test("saveFavoriteAction: the 409's own userMessage surfaces (the problemMessage priority: userMessage before detail)", async () => {
  vi.mocked(saveListingFavorite).mockResolvedValueOnce({
    ok: false,
    status: 409,
    problem: {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "Listing already saved — DELETE /api/v1/me/favorites/{listingId} withdraws it",
      instance: "/api/v1/me/favorites/36363636-3636-4363-8363-363636360008",
      userMessage: "The resource changed while you were working on it. Please try again.",
    },
    unauthenticated: false,
  });
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  const out = await saveFavoriteAction(idle(), fd);
  expect(out.status).toBe("error");
  // MEASURED (K2, 2026-10-03): the conflict's userMessage is the generic
  // retry line — the house priority surfaces it before the detail (the
  // 409's teaching words live in the backend's own log/detail channel).
  if (out.status === "error") {
    expect(out.message).toContain("The resource changed while you were working");
  }
});

test("saveFavoriteAction: with NO userMessage the backend's own detail words surface", async () => {
  vi.mocked(saveListingFavorite).mockResolvedValueOnce({
    ok: false,
    status: 409,
    problem: {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "Listing already saved — DELETE /api/v1/me/favorites/{listingId} withdraws it",
      instance: "/api/v1/me/favorites/36363636-3636-4363-8363-363636360008",
    },
    unauthenticated: false,
  });
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  const out = await saveFavoriteAction(idle(), fd);
  expect(out.status).toBe("error");
  if (out.status === "error") {
    expect(out.message).toContain("Listing already saved");
  }
});

test("unsaveFavoriteAction: the 204 path + the channel call", async () => {
  const fd = new FormData();
  fd.set("listingId", LISTING_ID);
  const out = await unsaveFavoriteAction(idle(), fd);
  expect(out).toEqual({ status: "success", message: "سُحب الإعلان من مفضلاتك." });
  expect(unsaveListingFavorite).toHaveBeenCalledWith(LISTING_ID);
});

test("unsaveFavoriteAction: the anonymous gate answers the session re-auth note", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const out = await unsaveFavoriteAction(idle(), new FormData());
  expect(out.status).toBe("error");
  if (out.status === "error") expect(out.message).toContain("جلستك انتهت");
});

// ---------------------------------------------------------------------------
// G17 — the saved-search round-trip carries the min-stars floor
// ---------------------------------------------------------------------------

test("criteriaFromLink carries minRating as the record's own numeric component", () => {
  const criteria = criteriaFromLink({
    q: "شقة",
    minRating: "4",
  });
  expect(criteria.minRating).toBe(4);
  // An out-of-range arriving value is forwarded as-is ONLY through the
  // URL map when finite — the backend's own [1,5] gate answers 400 at
  // save time (its words teach); the URL parse keeps the lossless form.
  const handBuilt = criteriaFromLink({ minRating: "9" });
  expect(handBuilt.minRating).toBe(9);
  const invalid = criteriaFromLink({ minRating: "abc" });
  expect(invalid.minRating).toBeUndefined();
});

test("linkFromCriteria restores minRating onto the /listings URL (lossless)", () => {
  const link = linkFromCriteria({ minRating: 4.5 });
  expect(link.minRating).toBe("4.5");
  // The MEASURED null form (the backend re-serializes every absent
  // component as JSON null) fails the typeof guard — the filter stays
  // absent from the link, never forwarded blindly.
  const nullForm = linkFromCriteria({ minRating: null as unknown as number });
  expect(nullForm.minRating).toBeUndefined();
});

test("savedSearchLabel renders the stars floor as a human part", () => {
  expect(savedSearchLabel({ minRating: 4 })).toContain("تقييم");
  expect(savedSearchLabel({ minRating: 4 })).toContain("4+");
  // Out-of-range values stay silent (the label renders what the matcher
  // would honor — the same [1,5] bounds).
  expect(savedSearchLabel({ minRating: 9 })).not.toContain("تقييم");
});
