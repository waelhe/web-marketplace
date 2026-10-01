import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import EventsPage from "@/app/neighborhood/events/page";
import {
  DEMO_ACTIVITY,
  DEMO_EVENTS,
  DEMO_IDEAS,
  EVENT_CATEGORIES,
  EVENT_FILTERS,
  EVENT_REGISTRATIONS,
  featuredEvent,
  filterEvents,
  seatsRemaining,
} from "@/lib/neighborhood-events";
import { isUuid } from "@/lib/api/geo";

/**
 * The events product layer's honesty contracts + the /neighborhood/
 * events surface's structure (slice S9, the owner-supplied design
 * «إدارة الفعاليات وتجمعات الحي»; re-pinned N6 2026-10-01 — gap #4
 * served: the board read went REAL through the backend's own L49
 * contract, so the page pins now ride the served rows: UUID ids, the
 * live attending counts, the read's own rsvpedByMe, the RSVP write
 * forms, and the real organize submission. The demo discipline stays
 * for the layers that have no served contract yet (the ideas box, the
 * activity badge): demo ids never UUIDs, bounded vocabularies, display
 * interactions never links.)
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
  // The served board (L49's NeighborhoodEventView shape — UUID ids,
  // the two attendance facts, the backend's own label fields).
  board: {
    content: [
      {
        id: "aaaaaaaa-0000-4000-8000-000000000001",
        authorId: "00000000-0000-4000-8000-000000000002",
        locationId: "33333333-3333-4333-8333-333333333301",
        category: "VOLUNTEER",
        title: "حملة تشجير حديقة الحي الحقيقية",
        description: "غرس شتلات زيتون على الممشى الرئيسي.",
        startsAt: "2026-10-02T08:00:00Z",
        endsAt: "2026-10-02T11:00:00Z",
        locationLabel: "حديقة الحي — البوابة الرئيسية",
        organizerLabel: "لجنة تطوير الحي",
        capacity: null,
        attending: 28,
        registration: "OPEN",
        featured: true,
        rsvpedByMe: true,
        createdAt: "2026-09-28T08:00:00Z",
        updatedAt: "2026-09-28T08:00:00Z",
      },
      {
        id: "bbbbbbbb-0000-4000-8000-000000000002",
        authorId: "00000000-0000-4000-8000-000000000003",
        locationId: "33333333-3333-4333-8333-333333333301",
        category: "SPORTS_FAMILY",
        title: "دوري كرة القدم الحقيقي",
        description: "أربع فرق، نظام دوري من جولتين.",
        startsAt: "2026-10-03T16:30:00Z",
        endsAt: "2026-10-03T18:00:00Z",
        locationLabel: "ملعب الحي الشرقي",
        organizerLabel: "نادي شباب الحي",
        capacity: 16,
        attending: 4,
        registration: "LIMITED_SEATS",
        featured: false,
        rsvpedByMe: false,
        createdAt: "2026-09-28T08:00:00Z",
        updatedAt: "2026-09-28T08:00:00Z",
      },
      {
        id: "cccccccc-0000-4000-8000-000000000003",
        authorId: "00000000-0000-4000-8000-000000000004",
        locationId: "33333333-3333-4333-8333-333333333301",
        category: "MARKET",
        title: "سوق مقايضة حقيقي",
        description: "اطرح ما كبر عنه أطفالك وخذ ما يناسبهم.",
        startsAt: "2026-10-10T10:00:00Z",
        endsAt: "2026-10-10T12:00:00Z",
        locationLabel: "ساحة المسجد — الظل الشمالي",
        organizerLabel: "صباح الأمهات",
        capacity: 12,
        attending: 7,
        registration: "TABLE_RESERVATION",
        featured: false,
        rsvpedByMe: false,
        createdAt: "2026-09-28T08:00:00Z",
        updatedAt: "2026-09-28T08:00:00Z",
      },
      {
        id: "dddddddd-0000-4000-8000-000000000004",
        authorId: "00000000-0000-4000-8000-000000000005",
        locationId: "33333333-3333-4333-8333-333333333301",
        category: "SOCIAL",
        title: "ديوانية الحي الحقيقية",
        description: "لقاء الجيران الشهري — قهوة وتمر على حساب الديوانية.",
        startsAt: "2026-10-08T20:30:00Z",
        endsAt: null,
        locationLabel: "ديوانية البوابة الجنوبية",
        organizerLabel: "ديوانية الحي",
        capacity: null,
        attending: 19,
        registration: "OPEN",
        featured: false,
        rsvpedByMe: false,
        createdAt: "2026-09-28T08:00:00Z",
        updatedAt: "2026-09-28T08:00:00Z",
      },
    ],
    totalElements: 4,
    pageNumber: 0,
    pageSize: 20,
    totalPages: 1,
  },
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));
vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
  getMyNeighborhoodEvents: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: fixtures.board,
  })),
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
  isUuid: vi.fn((value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  ),
}));

/** Render the member branch of the events page. */
async function renderMember(): Promise<string> {
  const element = await EventsPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({}),
  });
  return renderToStaticMarkup(element);
}

describe("the events demo id discipline (rule 3)", () => {
  test("every event and idea id is demo-prefixed and never parses as a UUID", () => {
    for (const event of DEMO_EVENTS) {
      expect(event.id.startsWith("demo-")).toBe(true);
      expect(isUuid(event.id)).toBe(false);
    }
    for (const idea of DEMO_IDEAS) {
      expect(idea.id.startsWith("demo-")).toBe(true);
      expect(isUuid(idea.id)).toBe(false);
    }
  });
});

describe("the event contract (the bounded vocabularies)", () => {
  test("every category and registration value rides the product's own vocabulary", () => {
    for (const event of DEMO_EVENTS) {
      expect(EVENT_CATEGORIES).toContain(event.category);
      expect(EVENT_REGISTRATIONS).toContain(event.registration);
    }
  });

  test("exactly ONE featured initiative — the design's weekly highlight", () => {
    expect(DEMO_EVENTS.filter((event) => event.featured)).toHaveLength(1);
    expect(featuredEvent(DEMO_EVENTS)?.featured).toBe(true);
    expect(featuredEvent([])).toBeNull();
  });

  test("counts stay bounded: attending ≤ capacity, non-negative everywhere", () => {
    for (const event of DEMO_EVENTS) {
      expect(event.attending).toBeGreaterThanOrEqual(0);
      if (event.capacity !== null) {
        expect(event.capacity).toBeGreaterThan(0);
        expect(event.attending).toBeLessThanOrEqual(event.capacity);
      }
    }
  });

  test("seatsRemaining is the honest math (null when open, floored at zero)", () => {
    const open = DEMO_EVENTS.find((event) => event.registration === "OPEN");
    expect(open).toBeDefined();
    expect(seatsRemaining(open!)).toBeNull();
    const limited = DEMO_EVENTS.find((event) => event.registration === "LIMITED_SEATS");
    expect(limited).toBeDefined();
    expect(seatsRemaining(limited!)).toBe(limited!.capacity! - limited!.attending);
    expect(
      seatsRemaining({ ...limited!, capacity: 2, attending: 5 }),
    ).toBe(0);
  });

  test("the events carry the design's three registration states across the dataset", () => {
    const states = new Set(DEMO_EVENTS.map((event) => event.registration));
    expect(states.has("LIMITED_SEATS")).toBe(true);
    expect(states.has("OPEN")).toBe(true);
    expect(states.has("TABLE_RESERVATION")).toBe(true);
  });
});

describe("the board's filters (the design's chips)", () => {
  test("the filter vocabulary is the design's five chips", () => {
    expect(EVENT_FILTERS.map(({ value }) => value)).toEqual([
      "ALL",
      "THIS_WEEK",
      "SPORTS_FAMILY",
      "VOLUNTEER",
      "MINE",
    ]);
  });

  test("filterEvents: ALL keeps everything; categories filter by value; MINE by the attendance set", () => {
    expect(filterEvents(DEMO_EVENTS, "ALL", new Set())).toHaveLength(DEMO_EVENTS.length);
    expect(filterEvents(DEMO_EVENTS, "VOLUNTEER", new Set())).toHaveLength(
      DEMO_EVENTS.filter((event) => event.category === "VOLUNTEER").length,
    );
    expect(filterEvents(DEMO_EVENTS, "SPORTS_FAMILY", new Set())).toHaveLength(
      DEMO_EVENTS.filter((event) => event.category === "SPORTS_FAMILY").length,
    );
    const mine = new Set([DEMO_EVENTS[0].id]);
    expect(filterEvents(DEMO_EVENTS, "MINE", mine)).toEqual([DEMO_EVENTS[0]]);
  });

  test("filterEvents THIS_WEEK keeps the 7-day window (bounded by a fixed today)", () => {
    const today = new Date("2026-09-29T12:00:00Z");
    const week = filterEvents(DEMO_EVENTS, "THIS_WEEK", new Set(), today);
    const horizon = today.getTime() + 7 * 24 * 60 * 60 * 1000;
    for (const event of week) {
      const at = new Date(event.startsAt).getTime();
      expect(at).toBeGreaterThanOrEqual(today.getTime() - 24 * 60 * 60 * 1000);
      expect(at).toBeLessThanOrEqual(horizon);
    }
    expect(week.length).toBeGreaterThan(0);
    expect(week.length).toBeLessThan(DEMO_EVENTS.length);
  });
});

describe("the events page (the member branch — the served board)", () => {
  test("renders the product surface: launcher, filters, featured, grid, calendar, activity, ideas, safety — on the REAL rows", async () => {
    const markup = await renderMember();

    // The sanctuary identity + the product tabs with الفعاليات active
    // (the ACTIVE tab is a span — this page IS the events surface).
    expect(markup).toContain('class="hood-app"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/neighborhood"');
    expect(markup).toContain('href="/listings"');

    // The prominent create launcher (the design's «+») and its modal —
    // N6: the submission is the REAL organize write (the form carries
    // the caller's own neighborhood id as the write's target).
    expect(markup).toContain("تنظيم فعالية جديدة");
    expect(markup).toContain("<dialog");
    expect(markup).toContain(`name="locationId" value="${fixtures.locationId}"`);

    // The board: filter chips, the featured initiative, the grid — on
    // the served rows (the backend's own titles and labels, verbatim).
    expect(markup).toContain("لوحة فعاليات الحي");
    expect(markup).toContain("هذا الأسبوع");
    expect(markup).toContain("فعالياتي");
    expect(markup).toContain("مبادرة الأسبوع");
    expect(markup).toContain(fixtures.board.content[0].title);
    expect(markup).toContain(fixtures.board.content[1].title);
    expect(markup).toContain(fixtures.board.content[0].locationLabel);
    expect(markup).toContain(fixtures.board.content[0].organizerLabel);
    expect(markup).toContain("مقاعد محدودة");
    expect(markup).toContain("مفتوح للجميع");
    expect(markup).toContain("حجز طاولات");

    // The RSVP write forms: every card carries the real seat toggle —
    // the read's own rsvpedByMe flag rides the hidden field (never
    // client-invented state), and the server's own attending count
    // renders (28 — no client arithmetic on top). Latin digits are the
    // owner design's own convention (the «832 عائلة» rule).
    expect(markup).toContain('name="rsvpedByMe" value="true"');
    expect(markup).toContain('name="rsvpedByMe" value="false"');
    expect(markup).toContain("حضورك مؤكّد ✓");
    expect(markup).toContain("أكّد حضورك");
    expect(markup).toContain("<strong>28</strong> جارًا");

    // The sidebar: calendar with dots on the REAL rows, activity
    // badge, ideas, safety.
    expect(markup).toContain("تقويم الحي");
    expect(markup).toContain("data-dots");
    expect(markup).toContain("نشاطك الاجتماعي");
    expect(DEMO_ACTIVITY[0].badge.length).toBeGreaterThan(0);
    expect(markup).toContain(DEMO_ACTIVITY[0].badge);
    expect(markup).toContain("اقترح تجمّعًا");
    expect(markup).toContain(DEMO_IDEAS[0].text);
    expect(markup).toContain("سلامة الفعاليات");
  });

  test("the served rows are the backend's own — UUID ids and the read's own counts (rule 3, inverted)", async () => {
    const markup = await renderMember();
    // The real contract's ids ARE UUIDs (the demo prefix retired with
    // the demo dataset) — the honesty rule flips: a served row MUST
    // carry its backend id verbatim (the RSVP form targets it).
    for (const row of fixtures.board.content) {
      expect(markup).toContain(`name="eventId" value="${row.id}"`);
      expect(isUuid(row.id)).toBe(true);
    }
    // The demo-prefixed ids never render on the events surface again.
    for (const demo of DEMO_EVENTS) {
      expect(markup).not.toContain(`value="${demo.id}"`);
    }
  });

  test("the display labels ride the REMAINING display zones only (rule 2, re-pinned)", async () => {
    const markup = await renderMember();
    const labels = markup.match(/بيانات عرض/g) ?? [];
    // N6: the board, the featured card, and the calendar went REAL —
    // the badge survives only on the layers with no served contract
    // yet (the activity widget + the ideas box).
    expect(labels.length).toBeGreaterThanOrEqual(2);
    expect(labels.length).toBeLessThan(5);
  });

  test("no display row is ever a link (rule 4)", async () => {
    const markup = await renderMember();
    // The event cards, the calendar days, and the ideas are NEVER links.
    const grid = markup.match(/<ul class="event-grid"[\s\S]*?<\/ul>/)?.[0];
    expect(grid).toBeDefined();
    expect(grid).not.toContain("<a ");
    const calendar = markup.match(/<table class="calendar-grid"[\s\S]*?<\/table>/)?.[0];
    expect(calendar).toBeDefined();
    expect(calendar).not.toContain("<a ");
    const ideas = markup.match(/<ul class="ideas-list"[\s\S]*?<\/ul>/)?.[0];
    expect(ideas).toBeDefined();
    expect(ideas).not.toContain("<a ");
  });

  test("a board read failure renders the honest problem note — never a fake empty board", async () => {
    const { getMyNeighborhoodEvents } = await import("@/lib/api/community");
    vi.mocked(getMyNeighborhoodEvents).mockResolvedValueOnce({
      ok: false,
      status: 503,
      problem: null,
    } as never);
    const markup = await renderMember();
    expect(markup).toContain("تعذّرت قراءة فعاليات حارتك (رمز 503)");
    expect(markup).not.toContain("event-grid");
  });
});

describe("the events page (the privacy gates)", () => {
  test("anonymous → the sign-in gate, no board render", async () => {
    const { getSession } = await import("@/lib/dal");
    vi.mocked(getSession).mockResolvedValueOnce(null);
    const markup = await renderMember();
    expect(markup).toContain("هذا القسم لأعضاء الحارات");
    expect(markup).not.toContain("event-grid");
  });

  test("no membership → the picker invitation, no board render", async () => {
    const { getMyMembership } = await import("@/lib/api/community");
    vi.mocked(getMyMembership).mockResolvedValueOnce({ ok: false, status: 404 } as never);
    const markup = await renderMember();
    expect(markup).toContain("لم تنتمِ إلى حارة بعد");
    expect(markup).not.toContain("event-grid");
  });
});

describe("the create modal's real submission", () => {
  test("the form carries the REAL organize contract — every design field plus the hidden neighborhood target", async () => {
    const { EventCreateLauncher } = await import("@/app/neighborhood/events/event-create");
    const markup = renderToStaticMarkup(
      createElement(EventCreateLauncher, { locationId: fixtures.locationId }),
    );
    expect(markup).toContain("نظّم تجمّعًا لجيرانك");
    // N6: the registered-pending note retired with the served contract —
    // the submit is the real write now.
    expect(markup).not.toContain("بانتظار عقد الباك اند");
    expect(markup).not.toContain("بانتظار عقود الباك اند");
    // The write's target: the caller's own neighborhood id.
    expect(markup).toContain(`name="locationId" value="${fixtures.locationId}"`);
    // The full product form is present — every field the design lists.
    expect(markup).toContain('id="event-title"');
    expect(markup).toContain('id="event-category"');
    expect(markup).toContain('id="event-date"');
    expect(markup).toContain('id="event-time"');
    expect(markup).toContain('id="event-location"');
    expect(markup).toContain('id="event-description"');
    expect(markup).toContain('id="event-capacity"');
    expect(markup).toContain("سجّل الفعالية");
  });
});
