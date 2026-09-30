import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import NotificationsPage from "@/app/neighborhood/notifications/page";

/**
 * The N1 notifications surface — the automated net over the wing's own
 * REAL channel (the same reads /inbox rides): the member branch (feed
 * rows with the unread tint + the type labels + the mark-read island +
 * the L22 preference matrix + the pager) and the anonymous branch (the
 * sign-in gate — never a probe). The same proven pattern as
 * neighborhood-member-render.test.ts: renderToStaticMarkup over a
 * mocked async server component, client islands stubbed.
 */

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael",
    email: "member@example.test",
  },
  notifications: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "66666666-6666-4666-8666-666666666601",
          recipientId: "00000000-0000-4000-8000-000000000001",
          type: "POST_COMMENTED",
          message: "علّق أبو حاتم على منشورك «مفقودات: مفتاح سيارة».",
          read: false,
          createdAt: "2026-09-28T10:00:00Z",
        },
        {
          id: "66666666-6666-4666-8666-666666666602",
          recipientId: "00000000-0000-4000-8000-000000000001",
          type: "NEW_LISTING_IN_NEIGHBORHOOD",
          message: "إعلان جديد في حارتك: شقة عائلية حديثة.",
          read: true,
          createdAt: "2026-09-27T09:00:00Z",
        },
      ],
      pageNumber: 0,
      pageSize: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
    },
  },
  unread: { ok: true, status: 200, data: { unreadCount: 1 } },
  preferences: {
    ok: true,
    status: 200,
    data: [
      { type: "POST_COMMENTED", channel: "DB", enabled: true },
      { type: "POST_COMMENTED", channel: "EMAIL", enabled: false },
    ],
  },
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/inbox", () => ({
  getMyNotifications: vi.fn(async () => fixtures.notifications),
  getMyUnreadNotificationCount: vi.fn(async () => fixtures.unread),
  getMyPreferences: vi.fn(async () => fixtures.preferences),
}));

// The client islands (useActionState + the inbox's "use server" actions
// re-exported through them) stay out of the server render — each stub
// renders its own marker, which the assertions below require as proof.
vi.mock("@/app/neighborhood/notifications/forms", () => ({
  MarkReadForm: () => "mark-read-form-stub",
  PreferencesMatrix: () => "preferences-matrix-stub",
}));

test("the member branch renders the real feed: rows, unread tint, type labels, matrix", async () => {
  const element = await NotificationsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The wing's card anatomy: the page's own headings in the hy design.
  expect(markup).toContain('aria-labelledby="notifications-heading"');
  expect(markup).toContain("إشعاراتك");
  expect(markup).toContain('class="hy-card"');

  // The badge count rides the backend's own number (1 unread — the
  // ar locale's own Latin digits, the ICU default the wing rides).
  expect(markup).toContain("1 غير مقروء");

  // Both rows render; ONLY the unread one carries the tint class —
  // and only it renders the mark-read island.
  const rows = markup.match(/<li class="hy-real-item[^"]*"/g) ?? [];
  expect(rows.length).toBe(2);
  expect(markup).toContain('class="hy-real-item hy-unread"');
  expect(markup.match(/mark-read-form-stub/g)?.length ?? 0).toBe(1);

  // The measured type vocabulary maps to its Arabic label.
  expect(markup).toContain("تعليق على منشورك");
  expect(markup).toContain("إعلان جديد في حارتك");

  // The backend's own messages render verbatim.
  expect(markup).toContain("علّق أبو حاتم على منشورك");
  expect(markup).toContain("إعلان جديد في حارتك: شقة عائلية حديثة.");

  // The pager's honest count line + the preferences island.
  expect(markup).toContain("2 إشعاراً");
  expect(markup).toContain("preferences-matrix-stub");
  expect(markup).toContain('aria-labelledby="preferences-heading"');

  // The back-to-feed affordance.
  expect(markup).toContain('href="/neighborhood"');
});

test("the member branch renders the pager links on a multi-page feed", async () => {
  const { getMyNotifications } = await import("@/lib/api/inbox");
  vi.mocked(getMyNotifications).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "66666666-6666-4666-8666-666666666603",
          recipientId: "00000000-0000-4000-8000-000000000001",
          type: "BOOKING_CREATED",
          message: "حجز جديد على إعلانك.",
          read: true,
          createdAt: "2026-09-26T08:00:00Z",
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      totalElements: 12,
      totalPages: 2,
      last: true,
    },
  });
  const element = await NotificationsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({
      page: "2",
    }),
  });
  const markup = renderToStaticMarkup(element);

  // The pager preserves the inbox's own 1-based convention: on human
  // page 2 (0-based 1), the previous link is the CLEAN canonical first
  // page (no ?page= noise) — and the mock asked the channel for 0-based 1.
  expect(markup).toContain('href="/neighborhood/notifications"');
  // The mock asked the channel for the 0-based page 1 (?page=2 human).
  expect(getMyNotifications).toHaveBeenLastCalledWith(1);
  // The last page renders no forward link.
  expect(markup).not.toContain("الصفحة التالية");
});

test("the anonymous branch renders the sign-in gate — never a probe", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const { getMyNotifications } = await import("@/lib/api/inbox");

  const element = await NotificationsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  expect(markup).toContain("الإشعارات للأعضاء المسجّلين");
  expect(getMyNotifications).not.toHaveBeenCalled();
});
