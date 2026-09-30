import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import NeighborhoodLayout from "@/app/neighborhood/layout";

/**
 * The N1 shell — the automated net over the REAL bell wiring: the
 * backend's own unread-count drives the badge (and the aria-label),
 * the messages entry links the real inbox (no badge — the measured
 * no-list-op gap), and the member chip becomes the profile entry. The
 * anonymous branch renders the sign-in button with NO probe. Fonts and
 * the client tab bar are stubbed (the layout is otherwise a server
 * component over the same mocked reads the pages ride).
 */

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael H",
    email: "member@example.test",
  },
  membership: {
    ok: true,
    status: 200,
    data: {
      id: "44444444-4444-4444-8444-444444444401",
      userId: "00000000-0000-4000-8000-000000000001",
      locationId: "33333333-3333-4333-8333-333333333301",
      verificationState: "SELF_DECLARED",
      memberSince: "2026-02-01T08:30:00Z",
      createdAt: "2026-02-01T08:30:00Z",
      updatedAt: "2026-02-01T08:30:00Z",
    },
  },
}));

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "--font-manrope" }),
  Plus_Jakarta_Sans: () => ({ variable: "--font-jakarta" }),
}));

vi.mock("@/app/neighborhood/wing-tab-bar", () => ({
  WingTabBar: () => "wing-tab-bar-stub",
}));

vi.mock("@/app/auth-buttons", () => ({
  SignInButton: () => "sign-in-button-stub",
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => fixtures.membership),
}));

vi.mock("@/lib/api/inbox", () => ({
  getMyUnreadNotificationCount: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { unreadCount: 0 },
  })),
}));

vi.mock("@/lib/api/geo", () => ({
  findGeoNodeById: vi.fn(async () => ({
    id: "33333333-3333-4333-8333-333333333301",
    parentId: "33333333-3333-4333-8333-333333333300",
    level: 3,
    nameAr: "حي القدس",
    nameEn: "Al-Quds",
    slug: "al-quds",
    children: [],
  })),
}));

async function renderShell(): Promise<string> {
  const element = await NeighborhoodLayout({ children: "PAGE" });
  return renderToStaticMarkup(element);
}

test("the member shell wires the REAL bell: badge + label + the wing's page behind it", async () => {
  const { getMyUnreadNotificationCount } = await import("@/lib/api/inbox");
  vi.mocked(getMyUnreadNotificationCount).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: { unreadCount: 4 },
  });
  const markup = await renderShell();

  // The bell is a LINK now (never the disabled button it was), pointing
  // at the wing's own notifications surface — scoped to the bell itself
  // (the aside's visitor-pass affordance stays disabled BY DESIGN).
  const bellLink = markup.match(
    /<a class="hy-notif"[^>]*href="\/neighborhood\/notifications"[^>]*>/,
  )?.[0];
  expect(bellLink).toBeDefined();
  expect(bellLink ?? "").not.toContain("disabled");

  // The badge rides the backend's own count (Latin digits — the ar
  // locale's ICU default) and the aria-label carries the full count.
  expect(markup).toContain('class="hy-notif-badge"');
  expect(markup).toContain(">4<");
  expect(markup).toContain("4 غير مقروء");

  // The messages entry links the real inbox; the member chip links the
  // member profile; the tab bar island rides under the header.
  expect(markup).toContain('href="/inbox"');
  expect(markup).toContain('href="/neighborhood/me"');
  expect(markup).toContain("wing-tab-bar-stub");

  // The honest role line (SELF_DECLARED — never «موثق»).
  expect(markup).toContain("جارك في حيّنا");
  expect(markup).not.toContain("جار موثق");
});

test("a zero-count bell renders the quiet dot — no badge, no count noise", async () => {
  const markup = await renderShell();

  expect(markup).toContain('class="hy-notif-dot"');
  expect(markup).not.toContain('class="hy-notif-badge"');
  // The plain label carries no unread claim.
  expect(markup).toContain('aria-label="الإشعارات"');
});

test("a failing unread read degrades to the quiet dot (honest, never a probe)", async () => {
  const { getMyUnreadNotificationCount } = await import("@/lib/api/inbox");
  vi.mocked(getMyUnreadNotificationCount).mockResolvedValueOnce({
    ok: false,
    status: 401,
    problem: null,
    unauthenticated: true,
  });
  const markup = await renderShell();

  // The failure state is the quiet dot — the badge never invents a
  // count, and the link still points at the surface (its own honest
  // re-auth line handles the rest).
  expect(markup).toContain('class="hy-notif-dot"');
  expect(markup).not.toContain('class="hy-notif-badge"');
});

test("the anonymous shell renders the sign-in entry — no membership, no unread probe", async () => {
  const { getSession } = await import("@/lib/dal");
  const { getMyMembership } = await import("@/lib/api/community");
  const { getMyUnreadNotificationCount } = await import("@/lib/api/inbox");
  vi.mocked(getSession).mockResolvedValueOnce(null);

  const markup = await renderShell();

  expect(markup).toContain("sign-in-button-stub");
  expect(getMyMembership).not.toHaveBeenCalled();
  expect(getMyUnreadNotificationCount).not.toHaveBeenCalled();
});
