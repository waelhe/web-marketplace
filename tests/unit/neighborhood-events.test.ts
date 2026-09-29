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
 * «إدارة الفعاليات وتجمعات الحي»). The discipline is the S7/S8
 * discipline restated: demo ids never UUIDs, bounded vocabularies,
 * exactly one featured initiative, seats math bounded, display
 * interactions never links, and the page's privacy gates mirror the
 * feed's own branches.
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
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));
vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
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

describe("the events page (the member branch)", () => {
  test("renders the product surface: launcher, filters, featured, grid, calendar, activity, ideas, safety", async () => {
    const markup = await renderMember();

    // The sanctuary identity + the product tabs with الفعاليات active
    // (the ACTIVE tab is a span — this page IS the events surface).
    expect(markup).toContain('class="hood-app"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/neighborhood"');
    expect(markup).toContain('href="/listings"');

    // The prominent create launcher (the design's «+») and its modal.
    expect(markup).toContain("تنظيم فعالية جديدة");
    expect(markup).toContain("<dialog");

    // The board: filter chips, the featured initiative, the grid.
    expect(markup).toContain("لوحة فعاليات الحي");
    expect(markup).toContain("هذا الأسبوع");
    expect(markup).toContain("فعالياتي");
    expect(markup).toContain("مبادرة الأسبوع");
    expect(markup).toContain(DEMO_EVENTS[0].title);
    expect(markup).toContain("مقاعد محدودة");
    expect(markup).toContain("مفتوح للجميع");
    expect(markup).toContain("حجز طاولات");

    // The sidebar: calendar with dots, activity badge, ideas, safety.
    expect(markup).toContain("تقويم الحي");
    expect(markup).toContain('data-dots');
    expect(markup).toContain("نشاطك الاجتماعي");
    expect(DEMO_ACTIVITY[0].badge.length).toBeGreaterThan(0);
    expect(markup).toContain(DEMO_ACTIVITY[0].badge);
    expect(markup).toContain("اقترح تجمّعًا");
    expect(markup).toContain(DEMO_IDEAS[0].text);
    expect(markup).toContain("سلامة الفعاليات");
  });

  test("the display labels ride every demo zone (rule 2)", async () => {
    const markup = await renderMember();
    const labels = markup.match(/بيانات عرض/g) ?? [];
    // The zones: the board head, the featured card, the calendar, the
    // activity, the ideas box — every display layer carries its label.
    expect(labels.length).toBeGreaterThanOrEqual(5);
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

describe("the create modal's honest gate", () => {
  test("the form renders the registered-contract note BEFORE any submission", async () => {
    const { EventCreateLauncher } = await import("@/app/neighborhood/events/event-create");
    const markup = renderToStaticMarkup(createElement(EventCreateLauncher));
    expect(markup).toContain("نظّم تجمّعًا لجيرانك");
    expect(markup).toContain("الإنشاء الحقيقي بانتظار عقد الباك اند");
    // The full product form is present — every field the design lists.
    expect(markup).toContain('id="event-title"');
    expect(markup).toContain('id="event-category"');
    expect(markup).toContain('id="event-date"');
    expect(markup).toContain('id="event-time"');
    expect(markup).toContain('id="event-location"');
    expect(markup).toContain('id="event-description"');
    expect(markup).toContain('id="event-capacity"');
  });
});
