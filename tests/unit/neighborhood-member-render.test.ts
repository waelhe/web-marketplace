import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import NeighborhoodPage from "@/app/neighborhood/page";

/**
 * The MEMBER branch of /neighborhood — the one automated net over the
 * two-column feed render (tests/unit/form-accessibility.test.ts is the
 * proven pattern: renderToStaticMarkup over a mocked async server
 * component; the Playwright smoke suite only ever reaches the anonymous
 * gate, so the layout, the initials avatar, and the category edge had no
 * coverage at all).
 *
 * The page is a server component with three branches; this test drives
 * the third one — an active membership + a feed with one LOST_FOUND post
 * — with every data channel mocked (session, membership, feed, geo name
 * resolution, /me identity) and the client islands stubbed so the render
 * stays server-safe (no useActionState, no server-action modules).
 */

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael",
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
  /** Two leading NON-digits — a digit-leading id would make the avatar assertion vacuous. */
  authorId: "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d",
  feed: {
    content: [
      {
        id: "55555555-5555-4555-8555-555555555501",
        authorId: "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d",
        locationId: "33333333-3333-4333-8333-333333333301",
        category: "LOST_FOUND",
        title: "مفقودات: مفتاح سيارة",
        body: "فقدت مفتاح السيارة أمام الصيدلية.",
        status: "VISIBLE",
        createdAt: "2026-03-05T12:00:00Z",
        updatedAt: "2026-03-05T12:00:00Z",
      },
    ],
    pageNumber: 0,
    pageSize: 10,
    totalElements: 1,
    totalPages: 1,
    last: true,
  },
  /** A DIFFERENT backend user id — the post stays someone else's (message affordance). */
  myBackendId: "00000000-0000-4000-8000-0000000000ff",
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
  getMyFeed: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.feed })),
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

vi.mock("@/lib/api/inbox", () => ({
  getMyBackendUser: vi.fn(async () => ({ ok: true, id: fixtures.myBackendId })),
}));

// The member branch's client islands (useActionState + "use server"
// actions) stay out of the server render — each stub renders its own
// marker, which the assertions below require as proof the stub is live.
vi.mock("@/app/neighborhood/forms", () => ({
  CreatePostForm: () => "create-post-form-stub",
  DeletePostButton: () => "delete-post-button-stub",
  LeaveForm: () => "leave-form-stub",
  MessageNeighborButton: () => "message-neighbor-button-stub",
}));

vi.mock("@/app/neighborhood/comments", () => ({
  CommentsSection: () => "comments-section-stub",
  ReportContentForm: () => "report-content-form-stub",
}));

/** Strip React's text-node separators so heading text can be compared. */
function textOf(inner: string): string {
  return inner.replace(/<!--.*?-->/g, "").trim();
}

test("the member branch renders the two-column feed with per-post identity", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The two-column layout: sticky sidebar (membership card + category nav
  // + composer) beside the feed.
  expect(markup).toContain('class="hood-layout"');
  expect(markup).toContain('class="hood-side"');
  expect(markup).toContain('class="hood-main"');
  expect(markup).toContain('class="hood-post"');

  // The client islands are stubbed — the real forms would drag useActionState
  // and the "use server" action modules into this render.
  expect(markup).toContain("create-post-form-stub");
  expect(markup).toContain("leave-form-stub");
  expect(markup).toContain("message-neighbor-button-stub");
  expect(markup).not.toContain('id="post-title"');

  // The opaque author id shows its first two characters, uppercased.
  const avatar = markup.match(/<span class="hood-avatar"[^>]*>([^<]*)<\/span>/)?.[1];
  expect(avatar).toBeDefined();
  expect(textOf(avatar ?? "")).toBe(fixtures.authorId.slice(0, 2).toUpperCase());
  expect(textOf(avatar ?? "")).toBe("AB");

  // The measured category vocabulary maps to its lowercased CSS edge.
  expect(markup).toContain("hood-cat-lost_found");

  // The neighborhood display name rides the geo projection into the title.
  const title = markup.match(/<h1 class="hood-title">([\s\S]*?)<\/h1>/)?.[1];
  expect(title).toBeDefined();
  expect(textOf(title ?? "")).toContain(fixtures.neighborhoodName);
  expect(textOf(title ?? "")).toContain("حارتي");
});
