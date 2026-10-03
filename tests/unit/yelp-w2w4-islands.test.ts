import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { FollowProviderButton } from "@/app/providers/[id]/forms";
import { UnfollowForm } from "@/app/profile/forms";
import {
  BusinessHoursForm,
  ServiceAddForm,
  ServiceAreaAddForm,
  VerificationSubmitForm,
} from "@/app/provider/business/forms";
import { followProviderAction } from "@/app/providers/[id]/actions";
import { unfollowProviderAction } from "@/app/profile/actions";
import {
  addServiceAction,
  replaceBusinessHoursAction,
} from "@/app/provider/business/actions";
import { followProvider, unfollowProvider } from "@/lib/api/follows";
import { replaceBusinessHours, addOfferedService } from "@/lib/api/provider";
import { WEEKDAY_ORDER } from "@/lib/api/reputation-contract";

/**
 * N10 — the W2+W4 frontend waves' ISLAND net (the review-surface
 * pattern: the client islands render under a mocked useActionState;
 * the server actions run against mocked channels; the CONTRACT is
 * asserted literally):
 *
 * - W4 (G21): the follow button + the unfollow form + their actions'
 *   gates (the session gate, the UUID gate, the channel call, the
 *   honest failure path surfaces the backend's own words);
 * - W2 (G11/G12): the hours editor's replacement law (the checked days
 *   alone ride the week) + the service money-pair law (together or not
 *   at all; MAJOR units convert to integer cents on the wire).
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

const PROVIDER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const FOLLOW_ID = "44444444-4444-4444-8444-444444444444";

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "n", email: "e" })),
}));

vi.mock("@/lib/api/follows", () => ({
  followProvider: vi.fn(async () => ({
    ok: true,
    status: 201,
    data: {
      id: FOLLOW_ID,
      providerId: PROVIDER_ID,
      providerDisplayName: "أحمد السيد — إقامة الجبل",
      createdAt: "2026-10-03T09:00:00Z",
    },
  })),
  getMyFollows: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { content: [], totalElements: 0 },
  })),
  unfollowProvider: vi.fn(async () => ({ ok: true, status: 204 })),
}));

vi.mock("@/lib/api/reputation", () => ({
  getProviderPublicPage: vi.fn(async () => ({ ok: true, status: 200, data: null })),
  getReviewMedia: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  getReviewerPublicProfile: vi.fn(async () => ({ ok: true, status: 200, data: null })),
  getReviewsByReviewer: vi.fn(async () => ({ ok: true, status: 200, data: null })),
  updateReview: vi.fn(async () => ({ ok: true, status: 200, data: null })),
}));

vi.mock("@/lib/api/provider", () => ({
  replaceBusinessHours: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  addOfferedService: vi.fn(async () => ({ ok: true, status: 200, data: null })),
  updateOfferedService: vi.fn(async () => ({ ok: true, status: 200, data: null })),
  moveOfferedService: vi.fn(async () => ({ ok: true, status: 200, data: [] })),
  removeOfferedService: vi.fn(async () => ({ ok: true, status: 204 })),
  addServiceArea: vi.fn(async () => ({ ok: true, status: 204 })),
  removeServiceArea: vi.fn(async () => ({ ok: true, status: 204 })),
  submitProviderVerification: vi.fn(async () => ({ ok: true, status: 200, data: {} })),
}));

vi.mock("@/lib/api/media", () => ({
  putToPresignedUrl: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/api/community", () => ({
  createContentReport: vi.fn(async () => ({ ok: true, status: 201 })),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

/** Strip React's text-node separators so composite text can be compared. */
function textOf(markup: string): string {
  return markup.replace(/<!--.*?-->/g, "");
}

test("the follow button renders blind (crawler parity — no session state on the page)", () => {
  const markup = renderToStaticMarkup(
    createElement(FollowProviderButton, {
      providerId: PROVIDER_ID,
      providerName: "أحمد السيد — إقامة الجبل",
    }),
  );
  expect(markup).toContain(`value="${PROVIDER_ID}"`);
  expect(textOf(markup)).toContain("تابع هذا المزوّد");
  expect(markup).toContain("أحمد السيد");
});

test("the unfollow form carries the follow ROW id (never the provider id)", () => {
  const markup = renderToStaticMarkup(
    createElement(UnfollowForm, { followId: FOLLOW_ID }),
  );
  expect(markup).toContain(`name="followId"`);
  expect(markup).toContain(`value="${FOLLOW_ID}"`);
  expect(textOf(markup)).toContain("ألغِ المتابعة");
});

test("the hours editor renders all seven weekday rows with the declared prefill", () => {
  const markup = renderToStaticMarkup(
    createElement(BusinessHoursForm, {
      profileId: PROVIDER_ID,
      initial: WEEKDAY_ORDER.map((day) => ({
        dayOfWeek: day,
        dayLabel: day,
        declared: day === "MONDAY",
        opensAt: "09:00",
        closesAt: "17:00",
      })),
    }),
  );
  // All seven rows render (the replacement law's whole week visible).
  for (const day of WEEKDAY_ORDER) {
    expect(markup).toContain(`declared-${day}`);
    expect(markup).toContain(`opens-${day}`);
  }
  // The declared day's checkbox carries defaultChecked.
  expect(markup).toContain('checked=""');
  // The time inputs ride type="time" (the LocalTime partial) LTR.
  expect(markup).toContain('type="time"');
});

test("the service add form mirrors the entity's own authored bounds", () => {
  const markup = renderToStaticMarkup(
    createElement(ServiceAddForm, { profileId: PROVIDER_ID }),
  );
  expect(markup).toContain('maxLength="200"');
  expect(markup).toContain('maxLength="1000"');
  expect(markup).toContain('min="1"');
  expect(markup).toContain('step="0.01"');
  expect(markup).toContain('placeholder="SAR"');
});

test("the area declaration + the verification claim render their gates", () => {
  const areaMarkup = renderToStaticMarkup(
    createElement(ServiceAreaAddForm, {
      profileId: PROVIDER_ID,
      locationId: "11111111-1111-4111-8111-111111111104",
    }),
  );
  expect(areaMarkup).toContain('name="locationId"');
  expect(textOf(areaMarkup)).toContain("أعلنها نطاق خدمة");

  const verificationMarkup = renderToStaticMarkup(
    createElement(VerificationSubmitForm, { profileId: PROVIDER_ID }),
  );
  expect(textOf(verificationMarkup)).toContain("قدّم طلب توثيق الملكية");
});

function form(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) fd.append(key, value);
  return fd;
}

test("followProviderAction: the session gate + the channel call + the success message", async () => {
  const state = await followProviderAction(
    { status: "idle" },
    form({ providerId: PROVIDER_ID }),
  );
  expect(followProvider).toHaveBeenCalledWith(PROVIDER_ID);
  expect(state.status).toBe("success");
  expect(state.status === "success" && state.message).toContain("تتابع");
});

test("followProviderAction: a malformed id never reaches the channel", async () => {
  vi.mocked(followProvider).mockClear();
  const state = await followProviderAction(
    { status: "idle" },
    form({ providerId: "not-a-uuid" }),
  );
  expect(state.status).toBe("error");
  expect(followProvider).not.toHaveBeenCalled();
});

test("unfollowProviderAction: the follow row id rides the channel", async () => {
  const state = await unfollowProviderAction(
    { status: "idle" },
    form({ followId: FOLLOW_ID }),
  );
  expect(unfollowProvider).toHaveBeenCalledWith(FOLLOW_ID);
  expect(state.status).toBe("success");
});

test("replaceBusinessHoursAction: the checked days alone ride the week (the replacement law)", async () => {
  const state = await replaceBusinessHoursAction(
    { status: "idle" },
    form({
      profileId: PROVIDER_ID,
      "declared-MONDAY": "on",
      "opens-MONDAY": "10:30",
      "closes-MONDAY": "18:00",
      "opens-SATURDAY": "09:00",
      "closes-SATURDAY": "17:00",
    }),
  );
  expect(replaceBusinessHours).toHaveBeenCalledWith(PROVIDER_ID, [
    { dayOfWeek: "MONDAY", opensAt: "10:30", closesAt: "18:00" },
  ]);
  expect(state.status).toBe("success");
});

test("replaceBusinessHoursAction: a malformed window is rejected before any channel call", async () => {
  vi.mocked(replaceBusinessHours).mockClear();
  const state = await replaceBusinessHoursAction(
    { status: "idle" },
    form({
      profileId: PROVIDER_ID,
      "declared-FRIDAY": "on",
      "opens-FRIDAY": "25:00",
      "closes-FRIDAY": "17:00",
    }),
  );
  expect(state.status).toBe("error");
  expect(replaceBusinessHours).not.toHaveBeenCalled();
});

test("addServiceAction: the money pair law (together or not at all)", async () => {
  // A price without a currency is the V96 CHECK's own defect — the
  // action rejects it before any channel call.
  vi.mocked(addOfferedService).mockClear();
  const bad = await addServiceAction(
    { status: "idle" },
    form({ profileId: PROVIDER_ID, title: "تنظيف", price: "150" }),
  );
  expect(bad.status).toBe("error");
  expect(bad.status === "error" && bad.message).toContain("معًا");
  expect(addOfferedService).not.toHaveBeenCalled();

  // The declared pair converts MAJOR units to integer cents on the
  // wire, and the currency rides ISO-uppercase.
  const good = await addServiceAction(
    { status: "idle" },
    form({
      profileId: PROVIDER_ID,
      title: "تنظيف دوري",
      description: "",
      price: "150.25",
      currency: "sar",
    }),
  );
  expect(good.status).toBe("success");
  expect(addOfferedService).toHaveBeenCalledWith(PROVIDER_ID, {
    title: "تنظيف دوري",
    description: null,
    durationMinutes: null,
    priceCents: 15025,
    currency: "SAR",
  });
});
