import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import NeighborhoodPage from "@/app/neighborhood/page";

/**
 * The MEMBER branch of /neighborhood — the automated net over the
 * integrated community+business product render (slice S7: the pulse
 * band, the business rail, the REAL local-listings bridge strip, and
 * the two-column feed; tests/unit/form-accessibility.test.ts is the
 * proven pattern: renderToStaticMarkup over a mocked async server
 * component; the Playwright smoke suite only ever reaches the anonymous
 * gate, so the layout, the initials avatar, and the category edge had
 * no coverage at all).
 *
 * The page is a server component with three branches; this test drives
 * the third one — an active membership + a feed with one LOST_FOUND
 * post + one REAL local listing — with every data channel mocked
 * (session, membership, feed, geo name resolution, /me identity, the
 * location-scoped public search) and the client islands stubbed so the
 * render stays server-safe (no useActionState, no server-action
 * modules).
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
  /** The REAL local-listings bridge read: one ACTIVE row scoped to the
   * membership's location — the marketplace bridge rendered with a real
   * UUID id (a real detail link exists) and a real provider name. */
  localListings: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "fa528602-2ab0-4867-b7fc-3d7e2a912eba",
          title: "شقة عائلية حديثة في الحي",
          category: "stay",
          price: 350,
          currency: "SAR",
          providerName: "qa-tester",
        },
      ],
      pageNumber: 0,
      pageSize: 4,
      totalElements: 1,
      totalPages: 1,
      last: true,
      empty: false,
    },
  },
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

vi.mock("@/lib/api/public", () => ({
  searchListings: vi.fn(async () => fixtures.localListings),
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

  // The design's two-column grid: the feed column + the widgets column
  // under the mood banner (the S10 owner-design anatomy).
  expect(markup).toContain('class="hy-grid"');
  expect(markup).toContain('class="hy-grid-main"');
  expect(markup).toContain('class="hy-grid-side"');
  expect(markup).toContain("hy-post");

  // The client islands are stubbed — the real forms would drag useActionState
  // and the "use server" action modules into this render.
  expect(markup).toContain("create-post-form-stub");
  expect(markup).toContain("leave-form-stub");
  expect(markup).toContain("message-neighbor-button-stub");
  expect(markup).not.toContain('id="post-title"');

  // The opaque author id shows its first two characters, uppercased —
  // inside the REAL feed row (the hy-real-item), the design's own card.
  const realItem = markup.match(/<li class="hy-real-item"[\s\S]*?<\/li>/)?.[0];
  expect(realItem).toBeDefined();
  const avatar = (realItem ?? "").match(/<span class="hy-avatar"[^>]*>([^<]*)<\/span>/)?.[1];
  expect(avatar).toBeDefined();
  expect(textOf(avatar ?? "")).toBe(fixtures.authorId.slice(0, 2).toUpperCase());
  expect(textOf(avatar ?? "")).toBe("AB");

  // The measured category vocabulary maps to the design's chip tone.
  expect(realItem ?? "").toContain('class="hy-post-chip" data-tone="primary">مفقودات');

  // The mood banner carries the design's greeting + zone chip + the
  // strength line with the owner's own Latin-digit numbers.
  expect(markup).toContain('class="hy-mood-title"');
  expect(markup).toContain("صباح الخير والمودّة");
  expect(markup).toContain("مربع 4 - واحة الأمان");
  expect(markup).toContain("832 عائلة");
  expect(markup).toContain("حراسة البوابات 100% متيقظة");
});

test("the member branch renders the integrated product layers: pulse widget, owner posts, real local listings", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // THE PLACE — the design's pulse widget: the two tiles + the safety
  // ring at 99 (the honest display-data disclosure rides the badge).
  expect(markup).toContain('aria-labelledby="pulse-heading"');
  expect(markup).toContain("نبض الحي اليوم");
  expect(markup).toContain('class="hy-pulse-tile"');
  expect(markup).toContain(">412<");
  expect(markup).toContain(">18<");
  expect(markup).toContain('stroke-dasharray="99, 100"');
  expect(markup).toContain("بيانات عرض");

  // THE OWNER'S OWN POSTS — the rich display cards (recommendation with
  // the embedded service card, lost&found, welcome): labeled, and NEVER
  // links (rule 4: the demo ids are not UUIDs).
  const ownerSection = markup.match(/<section aria-label="منشورات عرض الحي"[\s\S]*?<\/section>/)?.[0];
  expect(ownerSection).toBeDefined();
  expect(ownerSection ?? "").toContain("د. خالد التميمي");
  expect(ownerSection ?? "").toContain("أبو حاتم - صيانة التكييف المتقدمة");
  expect(ownerSection ?? "").toContain("العم أبو طارق السديري");
  expect(ownerSection ?? "").toContain("المهندس فيصل العتيبي");
  expect(ownerSection ?? "").not.toContain("href=");

  // THE MARKETPLACE BRIDGE — the REAL location-scoped strip: a real
  // listing card (a link to the real detail page) under its own heading,
  // with the design's market wing button beside it.
  expect(markup).toContain('aria-labelledby="local-heading"');
  expect(markup).toContain("إعلانات في حيّك");
  const localLink = markup.match(/href="\/listings\/fa528602-2ab0-4867-b7fc-3d7e2a912eba"/)?.[0];
  expect(localLink).toBeDefined();
  expect(markup).toContain('href="/neighborhood/market"');

  // The real feed stays the heart under its labelled heading.
  expect(markup).toContain('aria-labelledby="feed-heading"');
  expect(markup).toContain("منشورات جيرانك");
});

/* ── The S8 rich feed product (owner-supplied design spec 2026-09-29):
   the composer front door, the filter tabs, the featured zone (the
   pinned alert + the interactive poll — client islands WITHOUT server
   actions, so they render their REAL initial markup here), the product
   sub-navigation, and the smart sidebar widgets. ──────────────────── */

test("the member branch renders the filter pills over the real reads", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The design's chip row — one pill per MEASURED category value (the
  // real ?category= reads) plus the unfiltered home.
  expect(markup).toContain('aria-label="تصنيفات الخلاصة"');
  expect(markup).toContain('href="/neighborhood?category=RECOMMENDATION"');
  expect(markup).toContain('href="/neighborhood?category=LOST_FOUND"');
  expect(markup).toContain('href="/neighborhood?category=CLASSIFIED"');
  expect(markup).toContain('href="/neighborhood?category=GENERAL"');
  expect(markup).toContain('href="/neighborhood"');
});

test("the member branch renders the featured zone: the pinned alert + the interactive poll, both display-labeled", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // THE FEATURED ZONE — both cards render their REAL initial markup
  // (no server actions inside; only client state), each carrying the
  // honest display label.
  expect(markup).toContain('class="hy-alert-edge"');
  expect(markup).toContain("تنبيه حيوي مثبت");
  expect(markup).toContain("استطلاع رأي معتمد");
  // The design's works-map snippet + guidelines + parking ride the alert.
  expect(markup).toContain("مسار الأعمال الميدانية");
  expect(markup).toContain("توجيهات الحركة أثناء الأعمال");
  expect(markup).toContain("مواقف مخصصة مؤقتة بجوار مجمع المدارس");
  // The display labels ride BOTH cards (the S7 rule 2, restated).
  const featured = markup.match(/<section aria-label="مختارات الحي"[\s\S]*?<\/section>/)?.[0];
  expect(featured).toBeDefined();
  expect((featured ?? "").match(/بيانات عرض/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  // The poll's options are the design's interactive affordance.
  expect(featured ?? "").toContain("<button");
  expect(featured ?? "").toContain('class="hy-poll-option"');
});

test("the member branch renders the smart sidebar: weather, emergency, groups, charter — and the feed column leads", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The sidebar widgets: the weather (display-labeled), the emergency
  // directory (the REAL 940 line), the groups (display rows, never
  // links), and the charter badge.
  expect(markup).toContain('aria-labelledby="weather-heading"');
  expect(markup).toContain("طقس وبيئة الحي");
  expect(markup).toContain("جودة الهواء");
  expect(markup).toContain("ممتازة للمشي مساءً");
  expect(markup).toContain('aria-labelledby="emergency-heading"');
  expect(markup).toContain("طوارئ وتواصل الحي السريع");
  // The municipality's 940 line is the one REAL number — a live tel: link.
  expect(markup).toContain('href="tel:940"');
  expect(markup).toContain('aria-labelledby="groups-heading"');
  expect(markup).toContain("مجموعات الحي التخصصية");
  const groupsList = markup.match(/<ul class="hy-group-list"[\s\S]*?<\/ul>/)?.[0];
  expect(groupsList).toBeDefined();
  expect(groupsList).not.toContain("<a ");
  expect(groupsList).not.toContain("href");
  expect(markup).toContain("ميثاق الجيرة الطيبة");
  expect(markup).toContain("ما زال جبريل يوصيني بالجار");

  // The feed column LEADS the DOM (the product's reading order): the
  // main column's composer section renders before the widgets column.
  const mainAt = markup.indexOf('class="hy-grid-main"');
  const sideAt = markup.indexOf('class="hy-grid-side"');
  expect(mainAt).toBeGreaterThan(-1);
  expect(sideAt).toBeGreaterThan(-1);
  expect(mainAt).toBeLessThan(sideAt);

  // The composer rides the main column under its accessible heading.
  const composerAt = markup.indexOf('aria-labelledby="composer-heading"');
  expect(composerAt).toBeGreaterThan(-1);
  expect(composerAt).toBeGreaterThan(mainAt);
  expect(composerAt).toBeLessThan(sideAt);

  // The membership card stays in the sidebar (the S7 member anatomy).
  expect(markup).toContain('aria-labelledby="member-heading"');
  expect(markup).toContain("عضويتك");
  expect(markup).toContain("leave-form-stub");
});

test("the filter pills ride the REAL ?category= read: the active pill and the filtered feed", async () => {
  // The deterministic proof the browser round cannot flake on: the page
  // receives ?category=RECOMMENDATION and must (1) ask the real feed
  // channel with THAT category and (2) mark only the matching pill active.
  const { getMyFeed } = await import("@/lib/api/community");
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({
      category: "RECOMMENDATION",
    }),
  });
  const markup = renderToStaticMarkup(element);

  expect(getMyFeed).toHaveBeenCalledWith(0, 10, "RECOMMENDATION");

  // The active pill: only توصيات carries data-active; الكل does not.
  const pills = markup.match(/<a class="hy-pill"[^>]*>/g) ?? [];
  expect(pills.length).toBe(5);
  const active = markup.match(/<a class="hy-pill" data-active="true"[^>]*>[\s\S]*?<\/a>/)?.[0];
  expect(active).toBeDefined();
  expect(active ?? "").toContain("توصيات");
  expect(active ?? "").toContain("category=RECOMMENDATION");
  const homePill = markup.match(/<a class="hy-pill" data-active="true" href="\/neighborhood">/)?.[0];
  expect(homePill).toBeUndefined();

  // An INVALID category value drops to null (no invented filters) —
  // the unfiltered read, never a 400.
  await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({
      category: "NOT_A_CATEGORY",
    }),
  });
  expect(getMyFeed).toHaveBeenLastCalledWith(0, 10, null);
});

test("the sidebar previews the upcoming gatherings and links the events wing", async () => {
  const element = await NeighborhoodPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The events wing (slice S9's route) links from the feed's sidebar.
  expect(markup).toContain('href="/neighborhood/events"');

  // The sidebar's upcoming-events preview: the design's widget, labeled
  // display data, rows are NOT links (rule 4) but the «كل فعاليات الحي»
  // button links the REAL events surface.
  expect(markup).toContain('aria-labelledby="upcoming-heading"');
  expect(markup).toContain("فعاليات قريبة");
  const preview = markup.match(/<ul class="hy-events-list"[\s\S]*?<\/ul>/)?.[0];
  expect(preview).toBeDefined();
  expect(preview).not.toContain("<a ");
  expect(preview).not.toContain("href");
  expect(markup).toContain("كل فعاليات الحي");
});
