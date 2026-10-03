import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  BUSINESS_RAIL_SIZE,
  DEMO_ALERTS,
  DEMO_BUSINESSES,
  DEMO_GROUPS,
  DEMO_POLL,
  DEMO_PULSE,
  DEMO_WEATHER,
  GROUPS_WIDGET_SIZE,
  airQualityBand,
  formatRating,
  neighborhoodDemoEnabled,
  pollTotalVotes,
} from "@/lib/neighborhood-product";
import { isUuid } from "@/lib/api/geo";

/**
 * The neighborhood product layer's honesty contracts — the discipline
 * tests for the first product-defined display layer (slice S7, the
 * methodology reversal). The rules are the demo-listings.ts discipline,
 * restated for the community+business surfaces: demo ids never parse as
 * backend UUIDs, display rows never carry links, every layer carries
 * its label and its one env off-switch, and the trust vocabulary
 * (rating/verified) renders in the shapes the product defined.
 *
 * House pattern: createElement (the suite is deliberately zero-JSX —
 * see vitest.config.ts's documented deviations).
 */

describe("the demo id discipline (rule 3)", () => {
  test("every demo business id is demo-prefixed and never parses as a UUID", () => {
    expect(DEMO_BUSINESSES.length).toBeGreaterThan(0);
    for (const biz of DEMO_BUSINESSES) {
      expect(biz.id.startsWith("demo-")).toBe(true);
      expect(isUuid(biz.id)).toBe(false);
    }
  });

  test("the rail size never exceeds the dataset", () => {
    expect(BUSINESS_RAIL_SIZE).toBeLessThanOrEqual(DEMO_BUSINESSES.length);
    expect(BUSINESS_RAIL_SIZE).toBeGreaterThan(0);
  });
});

describe("the trust vocabulary (the product-defined shapes)", () => {
  test("ratings stay in the 1–5 band or are the honest null (unrated)", () => {
    for (const biz of DEMO_BUSINESSES) {
      if (biz.rating === null) {
        expect(biz.reviews).toBe(0);
      } else {
        expect(biz.rating).toBeGreaterThanOrEqual(1);
        expect(biz.rating).toBeLessThanOrEqual(5);
        expect(biz.reviews).toBeGreaterThan(0);
      }
    }
  });

  test("the unrated business renders its honest new state, never a zero star", () => {
    const unrated = DEMO_BUSINESSES.find((biz) => biz.rating === null);
    expect(unrated).toBeDefined();
    expect(formatRating(unrated?.rating ?? null)).toBeNull();
  });

  test("formatRating renders one decimal (the aggregate's display band)", () => {
    // The measured runtime (node 24's ICU): the "ar" locale's default
    // numbering system is Latin digits — the app's own counts render
    // the same way, so the pin matches the MEASURED shape, never a
    // guessed one (measurement governs, protocol rule 5).
    expect(formatRating(4.8)).toBe("4.8");
    expect(formatRating(5)).toBe("5.0");
    expect(formatRating(null)).toBeNull();
  });
});

describe("the engagement gate (rule 5)", () => {
  test("unset keeps the display layers on — the owner's seed directive is the default", () => {
    delete process.env.DEMO_NEIGHBORHOOD;
    expect(neighborhoodDemoEnabled()).toBe(true);
  });

  test("DEMO_NEIGHBORHOOD=0|false kills the layers, anything else keeps them", () => {
    process.env.DEMO_NEIGHBORHOOD = "0";
    expect(neighborhoodDemoEnabled()).toBe(false);
    process.env.DEMO_NEIGHBORHOOD = "false";
    expect(neighborhoodDemoEnabled()).toBe(false);
    process.env.DEMO_NEIGHBORHOOD = "1";
    expect(neighborhoodDemoEnabled()).toBe(true);
    delete process.env.DEMO_NEIGHBORHOOD;
  });
});

describe("the pulse contract (the place band's data)", () => {
  test("the pulse dataset is exactly one row of three non-negative counts", () => {
    expect(DEMO_PULSE).toHaveLength(1);
    const pulse = DEMO_PULSE[0];
    expect(pulse.members).toBeGreaterThan(0);
    expect(pulse.postsThisWeek).toBeGreaterThan(0);
    expect(pulse.localBusinesses).toBeGreaterThan(0);
  });
});

describe("the demo card is never a link (rule 4, rendered proof)", () => {
  test("a rendered business card carries no anchor and no href", () => {
    // The page-level proof lives in neighborhood-member-render.test.ts;
    // this pins the CARD ANATOMY itself: trade, name, tagline, meta —
    // the four-block grid the CSS shapes, with no interactive element.
    const biz = DEMO_BUSINESSES[0];
    const card = renderToStaticMarkup(
      createElement(
        "li",
        { className: "biz-card" },
        createElement("p", { className: "biz-trade" }, biz.trade),
        createElement("h3", null, biz.name),
        createElement("p", { className: "biz-tagline" }, biz.tagline),
        createElement(
          "p",
          { className: "biz-meta listing-meta" },
          biz.rating !== null
            ? createElement("span", { className: "biz-rating" }, `★ ${formatRating(biz.rating)}`)
            : createElement("span", { className: "biz-rating biz-rating-new" }, "جديد — بلا تقييمات بعد"),
          biz.verified ? createElement("span", { className: "biz-verified" }, "موثّق") : null,
        ),
      ),
    );
    expect(card).not.toContain("<a");
    expect(card).not.toContain("href");
    expect(card).toContain(biz.name);
    expect(card).toContain(biz.trade);
  });
});

/* ── The S8 product-defined contracts — the rich feed layer
   (owner-supplied design spec 2026-09-29). Same discipline, restated
   for every new display shape: demo ids never UUIDs, bounded
   vocabularies, non-negative counts, honest bands. ──────────────── */

describe("the S8 demo id discipline (rule 3, restated)", () => {
  test("every poll, alert, and group id is demo-prefixed and never parses as a UUID", () => {
    for (const poll of DEMO_POLL) {
      expect(poll.id.startsWith("demo-")).toBe(true);
      expect(isUuid(poll.id)).toBe(false);
    }
    for (const alert of DEMO_ALERTS) {
      expect(alert.id.startsWith("demo-")).toBe(true);
      expect(isUuid(alert.id)).toBe(false);
    }
    for (const group of DEMO_GROUPS) {
      expect(group.id.startsWith("demo-")).toBe(true);
      expect(isUuid(group.id)).toBe(false);
    }
  });

  test("the widgets' display sizes never exceed their datasets", () => {
    expect(GROUPS_WIDGET_SIZE).toBeLessThanOrEqual(DEMO_GROUPS.length);
    expect(GROUPS_WIDGET_SIZE).toBeGreaterThan(0);
  });
});

describe("the poll contract (the interactive featured card)", () => {
  test("the active poll is exactly one row with 2–5 options and non-negative votes", () => {
    expect(DEMO_POLL).toHaveLength(1);
    const poll = DEMO_POLL[0];
    expect(poll.options.length).toBeGreaterThanOrEqual(2);
    expect(poll.options.length).toBeLessThanOrEqual(5);
    for (const option of poll.options) {
      expect(option.votes).toBeGreaterThanOrEqual(0);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  test("pollTotalVotes sums the options (the percentage denominators)", () => {
    const poll = DEMO_POLL[0];
    const manual = poll.options.reduce((sum, option) => sum + option.votes, 0);
    expect(pollTotalVotes(poll)).toBe(manual);
    expect(manual).toBeGreaterThan(0);
  });

  // N12 (L52 — gap #7 served): the CARD itself moved to the served
  // contract (tests/unit/polls-board.test.ts — the real write, the
  // live counts, the caller's own choice); the display dataset above
  // stays the S8 module's documented shape with its discipline tests,
  // retired from every surface's consumption (the page rides the
  // served board's newest row).
});

describe("the pinned alert contract (the featured zone's urgent card)", () => {
  test("the active alert is exactly one row with the bounded severity vocabulary", () => {
    expect(DEMO_ALERTS).toHaveLength(1);
    const alert = DEMO_ALERTS[0];
    expect(["HIGH", "MEDIUM"]).toContain(alert.severity);
    expect(alert.acknowledgments).toBeGreaterThanOrEqual(0);
    expect(alert.title.length).toBeGreaterThan(0);
    expect(alert.body.length).toBeGreaterThan(0);
  });

  test("the alert card renders its acknowledgment as a display interaction", async () => {
    const { AlertCard } = await import("@/app/neighborhood/alert-card");
    // The S10 owner-design skin: the card rides the design layer's
    // OwnerAlert contract (the works map, the guidelines, the parking).
    const { DEMO_OWNER_ALERTS } = await import("@/lib/neighborhood-design");
    const markup = renderToStaticMarkup(createElement(AlertCard, { alert: DEMO_OWNER_ALERTS[0] }));
    expect(markup).toContain("hy-card");
    expect(markup).toContain(DEMO_OWNER_ALERTS[0].badge);
    expect(markup).toContain("بيانات عرض");
    expect(markup).toContain(DEMO_OWNER_ALERTS[0].ackLabel);
    expect(markup).toContain(DEMO_OWNER_ALERTS[0].issuer);
    // The design's works-map snippet + guidelines ride the card.
    expect(markup).toContain(DEMO_OWNER_ALERTS[0].mapLabel);
    expect(markup).toContain(DEMO_OWNER_ALERTS[0].parkingNote);
  });
});

describe("the weather contract (the sidebar widget)", () => {
  test("the weather dataset is exactly one row with bounded signals", () => {
    expect(DEMO_WEATHER).toHaveLength(1);
    const weather = DEMO_WEATHER[0];
    expect(weather.temperature).toBeGreaterThan(-10);
    expect(weather.temperature).toBeLessThan(60);
    expect(weather.airQuality).toBeGreaterThanOrEqual(0);
    expect(weather.airQuality).toBeLessThanOrEqual(200);
    expect(weather.walkability.length).toBeGreaterThan(0);
  });

  test("airQualityBand renders the three measured bands", () => {
    expect(airQualityBand(0)).toBe("جيدة");
    expect(airQualityBand(50)).toBe("جيدة");
    expect(airQualityBand(51)).toBe("متوسطة");
    expect(airQualityBand(100)).toBe("متوسطة");
    expect(airQualityBand(101)).toBe("ضعيفة");
    expect(airQualityBand(200)).toBe("ضعيفة");
  });
});

describe("the groups contract (the sidebar's clubs widget)", () => {
  test("every group carries a positive member count and non-empty copy", () => {
    expect(DEMO_GROUPS.length).toBeGreaterThanOrEqual(GROUPS_WIDGET_SIZE);
    for (const group of DEMO_GROUPS) {
      expect(group.members).toBeGreaterThan(0);
      expect(group.name.length).toBeGreaterThan(0);
      expect(group.description.length).toBeGreaterThan(0);
    }
  });
});
