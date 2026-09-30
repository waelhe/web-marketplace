import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import MePage from "@/app/neighborhood/me/page";

/**
 * The N1 member profile — the automated net over the wing's own honest
 * identity projection: the member branch (the session's identity seams,
 * the measured SELF_DECLARED membership state — never «موثق» — the
 * «منشوراتي» page-filter with its gap note, and the quick surfaces)
 * and the anonymous branch (the sign-in gate). The same proven pattern
 * as neighborhood-member-render.test.ts.
 */

const MY_ID = "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d";

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael H",
    email: "member@example.test",
  },
  locationId: "33333333-3333-4333-8333-333333333301",
  neighborhoodName: "حي القدس",
  membership: {
    id: "44444444-4444-4444-8444-444444444401",
    userId: "00000000-0000-4000-8000-000000000001",
    locationId: "33333333-3333-4333-8333-333333333301",
    verificationState: "SELF_DECLARED",
    memberSince: "2026-02-01T08:30:00Z",
    createdAt: "2026-02-01T08:30:00Z",
    updatedAt: "2026-02-01T08:30:00Z",
  },
  me: { ok: true, id: "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d" },
  unread: { ok: true, status: 200, data: { unreadCount: 3 } },
  feed: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "55555555-5555-4555-8555-555555555501",
          authorId: "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "RECOMMENDATION",
          title: "توصية: سباك ممتاز",
          body: "جرّبنا أبو حاتم وكان ممتازًا.",
          status: "VISIBLE",
          createdAt: "2026-03-05T12:00:00Z",
          updatedAt: "2026-03-05T12:00:00Z",
        },
        {
          id: "55555555-5555-4555-8555-555555555502",
          authorId: "00000000-0000-4000-8000-0000000000ff",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "LOST_FOUND",
          title: "مفقودات: مفتاح سيارة",
          body: "فقدت مفتاح السيارة أمام الصيدلية.",
          status: "VISIBLE",
          createdAt: "2026-03-06T12:00:00Z",
          updatedAt: "2026-03-06T12:00:00Z",
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 2,
      totalPages: 1,
      last: true,
    },
  },
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/inbox", () => ({
  getMyBackendUser: vi.fn(async () => fixtures.me),
  getMyUnreadNotificationCount: vi.fn(async () => fixtures.unread),
}));

vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
  getMyFeed: vi.fn(async () => fixtures.feed),
}));

vi.mock("@/lib/api/geo", () => ({
  findGeoNodeById: vi.fn(async () => ({
    id: fixtures.locationId,
    parentId: "33333333-3333-4333-8333-333333333300",
    level: 3,
    nameAr: fixtures.neighborhoodName,
    nameEn: "Al-Quds",
    slug: "al-quds",
    children: [],
  })),
}));

test("the member branch renders the honest identity + membership projection", async () => {
  const element = await MePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // Identity: the session's own seams — the display name, the email
  // (LTR), and the backend id as an OPAQUE tail only.
  expect(markup).toContain("Wael H");
  expect(markup).toContain("member@example.test");
  expect(markup).toContain(`${MY_ID.slice(0, 8)}…`);

  // The initials avatar renders the name's own two leading initials.
  expect(markup).toContain("W H");

  // Membership: the hood's resolved name + the measured state —
  // «إقرار ذاتي», NEVER the unmeasured «موثق».
  expect(markup).toContain("حي القدس");
  expect(markup).toContain("إقرار ذاتي");
  expect(markup).toContain("SELF_DECLARED");
  expect(markup).not.toContain("جار موثق");
  expect(markup).toContain("عضو منذ");

  // The unread summary rides the backend's own count (Latin digits —
  // the ar locale's ICU default).
  expect(markup).toContain("3 إشعارًا غير مقروء");
});

test("«منشوراتي» renders ONLY the caller's own posts + the gap note", async () => {
  const element = await MePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // My post renders with its category chip in the design's tone.
  expect(markup).toContain("توصية: سباك ممتاز");
  expect(markup).toContain('data-tone="tertiary">توصيات');

  // The neighbor's post NEVER renders (the authorId filter is honest).
  expect(markup).not.toContain("مفقودات: مفتاح سيارة");

  // The honest gap note rides the section (no author-scoped read yet).
  expect(markup).toContain("لا يوفر قراءة");
  expect(markup).toContain("في هذه الصفحة");

  // The quick surfaces: the wing's notifications, the REAL inbox, and
  // the marketplace profile.
  expect(markup).toContain('href="/neighborhood/notifications"');
  expect(markup).toContain('href="/inbox"');
  expect(markup).toContain('href="/profile"');
});

test("the anonymous branch renders the sign-in gate — never a probe", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const { getMyMembership } = await import("@/lib/api/community");

  const element = await MePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  expect(markup).toContain("الملف للأعضاء المسجّلين");
  expect(getMyMembership).not.toHaveBeenCalled();
});

test("the no-membership branch renders the join invitation, not a broken profile", async () => {
  const { getMyMembership } = await import("@/lib/api/community");
  vi.mocked(getMyMembership).mockResolvedValueOnce({
    ok: false,
    status: 404,
    problem: { title: "Not Found" },
    unauthenticated: false,
  });
  const { getMyFeed } = await import("@/lib/api/community");

  const element = await MePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The honest state: join first; NO feed read fires (the membership
  // gates it), and the منشوراتي section does not render at all.
  expect(markup).toContain("لست عضوًا في أي حي بعد");
  expect(getMyFeed).not.toHaveBeenCalled();
  expect(markup).not.toContain('aria-labelledby="myposts-heading"');
});
