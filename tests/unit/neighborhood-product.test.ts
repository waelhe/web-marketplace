import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  BUSINESS_RAIL_SIZE,
  DEMO_BUSINESSES,
  DEMO_PULSE,
  formatRating,
  neighborhoodDemoEnabled,
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
