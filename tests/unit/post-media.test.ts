import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import NeighborhoodPage from "@/app/neighborhood/page";
import { createPostAction } from "@/app/neighborhood/actions";
import { createNeighborhoodPost } from "@/lib/api/community";
import { completeUpload, putToPresignedUrl, requestPostUpload } from "@/lib/api/media";

/**
 * L48 — post images (gap #2): the surface's own unit net (the
 * post-reactions pattern: the member-branch page renders under mocked
 * channels with its islands stubbed; the server action runs against
 * mocked channels):
 *
 * - the GALLERY: the feed row itself carries the photos (the backend's
 *   widened projection) — the thumbnail rides the card (the L28 null
 *   fallback is the contract's own, never an invented placeholder), the
 *   link opens the original, and a photo-less post keeps the honest
 *   card;
 * - the NOTE: ?photoFailures renders the composer's honest
 *   partial-success line (the text post IS live);
 * - the ACTION: the photos ride the created post (declare → PUT →
 *   confirm), a bad pick never creates a post (the up-front type/size/
 *   count mirrors), and a failed round counts + redirects with the
 *   honest URL — the post's text stays live either way.
 */

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael",
    email: "member@example.test",
  },
  locationId: "33333333-3333-4333-8333-333333333301",
  membership: {
    id: "44444444-4444-4444-8444-444444444401",
    userId: "00000000-0000-4000-8000-000000000001",
    locationId: "33333333-3333-4333-8333-333333333301",
    verificationState: "SELF_DECLARED",
    memberSince: "2026-02-01T08:30:00Z",
    createdAt: "2026-02-01T08:30:00Z",
    updatedAt: "2026-02-01T08:30:00Z",
  },
  authorId: "ab7c1d90-2f4e-4a6b-9c8d-1e2f3a4b5c6d",
  media: [
    {
      mediaId: "77777777-7777-4777-8777-777777777701",
      url: "https://storage.example/posts/p1/original.jpg?sig=1",
      thumbUrl: "https://storage.example/posts/p1/thumb.jpg?sig=1",
      contentType: "image/jpeg",
      position: 1,
    },
    {
      mediaId: "77777777-7777-4777-8777-777777777702",
      url: "https://storage.example/posts/p2/original.png?sig=2",
      thumbUrl: null,
      contentType: "image/png",
      position: 2,
    },
  ],
}));

function feedWith(media: typeof fixtures.media) {
  return {
    content: [
      {
        id: "55555555-5555-4555-8555-555555555501",
        authorId: fixtures.authorId,
        locationId: fixtures.locationId,
        category: "GENERAL",
        title: "الطقس جميل اليوم",
        body: "من يدعو لجولة مشي مسائية؟",
        status: "VISIBLE",
        reactionsCount: 3,
        reactedByMe: false,
        media,
        createdAt: "2026-03-05T12:00:00Z",
        updatedAt: "2026-03-05T12:00:00Z",
      },
    ],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 1,
    totalPages: 1,
    last: true,
    empty: false,
  };
}

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
  getMyFeed: vi.fn(async () => ({ ok: true, status: 200, data: feedWith(fixtures.media) })),
  createNeighborhoodPost: vi.fn(),
}));

vi.mock("@/lib/api/geo", () => ({
  findGeoNodeById: vi.fn(async () => ({
    id: fixtures.locationId,
    parentId: "33333333-3333-4333-8333-333333333300",
    level: 3,
    nameAr: "حي القدس",
    nameEn: "Al-Quds",
    slug: "al-quds",
    children: [],
  })),
  isUuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
}));

vi.mock("@/lib/api/inbox", () => ({
  getMyBackendUser: vi.fn(async () => ({
    ok: true,
    id: "00000000-0000-4000-8000-000000000002",
  })),
  openDirectConversation: vi.fn(),
}));

vi.mock("@/lib/api/public", () => ({
  searchListings: vi.fn(async () => ({
    content: [],
    pageNumber: 0,
    pageSize: 4,
    totalElements: 0,
    totalPages: 0,
    last: true,
    empty: true,
  })),
}));

vi.mock("@/lib/api/media", () => ({
  requestPostUpload: vi.fn(),
  putToPresignedUrl: vi.fn(),
  completeUpload: vi.fn(),
  requestUpload: vi.fn(),
  listListingMedia: vi.fn(),
  deleteMedia: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

// The member branch's client islands stay out of the server render.
vi.mock("@/app/neighborhood/forms", () => ({
  CreatePostForm: () => "create-post-form-stub",
  DeletePostButton: () => "delete-post-button-stub",
  LeaveForm: () => "leave-form-stub",
  MessageNeighborButton: () => "message-neighbor-button-stub",
  ReactButton: () => "react-button-stub",
  VerificationCard: () => "verification-card-stub",
}));

vi.mock("@/app/neighborhood/comments", () => ({
  CommentsSection: () => "comments-section-stub",
  ReportContentForm: () => "report-content-form-stub",
}));

const created = vi.mocked(createNeighborhoodPost);
const declare = vi.mocked(requestPostUpload);
const put = vi.mocked(putToPresignedUrl);
const confirm = vi.mocked(completeUpload);

const POST_ID = "55555555-5555-4555-8555-555555555599";

function postFormData() {
  const data = new FormData();
  data.set("locationId", fixtures.locationId);
  data.set("category", "GENERAL");
  data.set("title", "جولة مشي");
  data.set("body", "من يدعو لجولة مسائية اليوم؟");
  return data;
}

function fileOf(type: string, size: number) {
  return new File([new Uint8Array(size)], "photo.jpg", { type });
}

/* ── The gallery: the photos ride the feed row itself ── */

test("the member feed renders the post's photos: thumbnails on the card, originals behind the link", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The gallery wraps two frames; the count rides the data attribute (the CSS grid's own axis).
  expect(markup).toContain('class="hy-real-media" data-count="2"');

  // Photo 1: the processed thumbnail rides the card, the signed original behind the link.
  expect(markup).toContain(`href="${fixtures.media[0].url}"`);
  expect(markup).toContain(`src="${fixtures.media[0].thumbUrl}"`);

  // Photo 2: thumbUrl null — the contract's own L28 fallback to the original,
  // never an invented placeholder pixel.
  expect(markup).toContain(`src="${fixtures.media[1].url}"`);

  // The originals open in their own tab; the frames stream lazily.
  expect(markup).toContain('target="_blank"');
  expect(markup).toContain('loading="lazy"');
});

test("a photo-less post keeps the honest card — no gallery markup at all", async () => {
  const { getMyFeed } = await import("@/lib/api/community");
  vi.mocked(getMyFeed).mockResolvedValueOnce({
    ok: true,
    status: 200,
    data: feedWith([]),
  } as unknown as Awaited<ReturnType<typeof getMyFeed>>);

  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  expect(markup).not.toContain("hy-real-media");
  expect(markup).toContain("من يدعو لجولة مشي مسائية؟");
});

test("?photoFailures renders the honest partial-success note — the text post IS live", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({
      photoFailures: "2",
    }),
  });
  const markup = renderToStaticMarkup(element);

  expect(markup).toContain("hy-photo-note");
  expect(markup).toContain("نُشر منشورك نصًّا");
  // The wing's own Latin-digit convention (the N3 numbering finding — the
  // same convention the reactions count and the feed's total ride).
  expect(markup).toContain("2 صور تعذّر رفعها");
});

test("garbage ?photoFailures values drop to null — the note never renders invented state", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({
      photoFailures: "not-a-number",
    }),
  });
  const markup = renderToStaticMarkup(element);

  expect(markup).not.toContain("hy-photo-note");
});

/* ── The action: the photos ride the created post ── */

test("createPostAction with a photo runs the full presigned round on the created post", async () => {
  created.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      id: POST_ID,
      authorId: fixtures.session.userId,
      locationId: fixtures.locationId,
      category: "GENERAL",
      title: "جولة مشي",
      body: "من يدعو لجولة مسائية اليوم؟",
      status: "VISIBLE",
      reactionsCount: 0,
      reactedByMe: false,
      media: [],
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
    },
  });
  declare.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      mediaId: "88888888-8888-4888-8888-888888888801",
      objectKey: `posts/${POST_ID}/x.jpg`,
      uploadUrl: "https://storage.example/signed-put",
      urlLifetime: "PT15M",
    },
  });
  put.mockResolvedValue({ ok: true, status: 200 });
  confirm.mockResolvedValue({
    ok: true,
    status: 200,
    data: null,
  } as unknown as Awaited<ReturnType<typeof confirm>>);

  const data = postFormData();
  data.append("photos", fileOf("image/jpeg", 1024));

  await expect(createPostAction({ status: "idle" }, data)).rejects.toMatchObject({
    digest: expect.any(String),
  });

  // The post was created first (the target-first discipline), then the
  // photo's round ran against THE created post's id.
  expect(created).toHaveBeenCalledWith({
    locationId: fixtures.locationId,
    category: "GENERAL",
    title: "جولة مشي",
    body: "من يدعو لجولة مسائية اليوم؟",
  });
  expect(declare).toHaveBeenCalledWith(POST_ID, "image/jpeg", 1024);
  expect(put).toHaveBeenCalledWith(
    "https://storage.example/signed-put",
    "image/jpeg",
    expect.any(ArrayBuffer),
  );
  expect(confirm).toHaveBeenCalledWith("88888888-8888-4888-8888-888888888801");
});

test("an unsupported photo type never creates the post — the mirror answers in the owner's Arabic", async () => {
  const data = postFormData();
  data.append("photos", fileOf("video/mp4", 1024));

  const state = await createPostAction({ status: "idle" }, data);

  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain("نوع الصورة غير مدعوم");
  expect(created).not.toHaveBeenCalled();
  expect(declare).not.toHaveBeenCalled();
});

test("an oversize photo never creates the post", async () => {
  const data = postFormData();
  data.append("photos", fileOf("image/jpeg", 10_485_761));

  const state = await createPostAction({ status: "idle" }, data);

  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain("حجم الصورة يتجاوز الحد");
  expect(created).not.toHaveBeenCalled();
});

test("more than four photos never creates the post", async () => {
  const data = postFormData();
  for (let i = 0; i < 5; i += 1) {
    data.append("photos", fileOf("image/jpeg", 512));
  }

  const state = await createPostAction({ status: "idle" }, data);

  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain("لا أكثر من 4 صور");
  expect(created).not.toHaveBeenCalled();
});

test("a failed photo round redirects with the honest count — the text post stays live", async () => {
  created.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      id: POST_ID,
      authorId: fixtures.session.userId,
      locationId: fixtures.locationId,
      category: "GENERAL",
      title: "جولة مشي",
      body: "من يدعو لجولة مسائية اليوم؟",
      status: "VISIBLE",
      reactionsCount: 0,
      reactedByMe: false,
      media: [],
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
    },
  });
  declare.mockResolvedValue({
    ok: false,
    status: 403,
    problem: { title: "Forbidden", detail: "not the author", errorCode: "AUTHZ-001" },
  } as unknown as Awaited<ReturnType<typeof declare>>);

  const data = postFormData();
  data.append("photos", fileOf("image/png", 256));

  // The action's redirect carries the failed count — the post itself is live.
  await expect(createPostAction({ status: "idle" }, data)).rejects.toMatchObject({
    digest: expect.stringContaining("/neighborhood?photoFailures=1#feed"),
  });
  expect(created).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
});
