import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test } from "vitest";
import {
  DEMO_LISTINGS,
  DEMO_STOREFRONT_FLOOR,
  demoCategoryLabel,
  demoListingsEnabled,
  isDemoStorefront,
} from "@/lib/demo-listings";
import { DemoShowcase } from "@/components/ui/demo-card";
import { isUuid } from "@/lib/api/geo";
import type { ListingCategory } from "@/lib/api/types";

// The display-data layer (بيانات عرض — the owner's seed-content decision,
// 2026-09-29) under test. The layer's whole value is its DISCIPLINE, so
// the suite asserts the rules as contracts: the env gate matrix, the
// storefront floor, the dataset's never-a-UUID ids and
// registry-compatible codes, and the rendered showcase's two honesty
// invariants — the «بيانات عرض» label on every card and ZERO links.

/** The measured live vocabulary (2026-09-29, staging + production). */
const STAY: ListingCategory = { code: "stay", nameEn: "Stay", nameAr: "إقامة" };
const EN_ONLY: ListingCategory = { code: "hajj", nameEn: "Hajj", nameAr: null };

describe("demoListingsEnabled(): the env off-switch matrix", () => {
  beforeEach(() => {
    delete process.env.DEMO_LISTINGS;
  });

  test("UNSET keeps the layer ON — the owner's directive is the default", () => {
    expect(demoListingsEnabled()).toBe(true);
  });

  test("'0' and 'false' (case/whitespace-insensitive) kill the layer", () => {
    for (const raw of ["0", "false", "FALSE", " 0 ", " False "]) {
      process.env.DEMO_LISTINGS = raw;
      expect(demoListingsEnabled(), `DEMO_LISTINGS=${raw}`).toBe(false);
    }
  });

  test("any other value keeps it on", () => {
    for (const raw of ["1", "true", "on", "yes"]) {
      process.env.DEMO_LISTINGS = raw;
      expect(demoListingsEnabled(), `DEMO_LISTINGS=${raw}`).toBe(true);
    }
  });
});

describe("isDemoStorefront(): the floor rule", () => {
  beforeEach(() => {
    delete process.env.DEMO_LISTINGS;
  });

  test("below the floor (0, 1, 3 — today's production serves 1) engages", () => {
    expect(isDemoStorefront(0)).toBe(true);
    expect(isDemoStorefront(1)).toBe(true);
    expect(isDemoStorefront(DEMO_STOREFRONT_FLOOR - 1)).toBe(true);
  });

  test("at or above the floor the layer is OFF — self-retiring", () => {
    expect(isDemoStorefront(DEMO_STOREFRONT_FLOOR)).toBe(false);
    expect(isDemoStorefront(DEMO_STOREFRONT_FLOOR + 1)).toBe(false);
    expect(isDemoStorefront(12)).toBe(false);
  });

  test("the env off-switch beats scarcity — never demo when disabled", () => {
    process.env.DEMO_LISTINGS = "0";
    expect(isDemoStorefront(0)).toBe(false);
    expect(isDemoStorefront(1)).toBe(false);
  });
});

describe("DEMO_LISTINGS: the dataset's invariants", () => {
  test("a full storefront page: exactly 8 rows, all unique", () => {
    expect(DEMO_LISTINGS).toHaveLength(8);
    expect(new Set(DEMO_LISTINGS.map((l) => l.id)).size).toBe(8);
  });

  test("every id carries the demo- prefix and NEVER parses as a backend UUID", () => {
    // The isUuid guards across the app (route params, saved-search
    // surfaces) must never mistake a display row for a real one.
    for (const listing of DEMO_LISTINGS) {
      expect(listing.id.startsWith("demo-"), listing.id).toBe(true);
      expect(isUuid(listing.id), listing.id).toBe(false);
    }
  });

  test("categories stay inside the live registry's vocabulary (charter J2/S2 — no invention)", () => {
    // Measured 2026-09-29: V70 seeds exactly one category, stay/Stay/إقامة.
    for (const listing of DEMO_LISTINGS) {
      expect(listing.category).toBe("stay");
    }
  });

  test("prices, currency, provider names, and titles are well-formed", () => {
    for (const listing of DEMO_LISTINGS) {
      expect(Number.isFinite(listing.price)).toBe(true);
      expect(listing.price).toBeGreaterThan(0);
      expect(listing.currency).toBe("SAR");
      expect(listing.providerName.trim().length).toBeGreaterThan(0);
      expect(listing.title.trim().length).toBeGreaterThan(0);
    }
  });
});

test("demoCategoryLabel: the registry's own naming chain (nameAr → nameEn → code)", () => {
  expect(demoCategoryLabel([STAY], "stay")).toBe("إقامة");
  expect(demoCategoryLabel([EN_ONLY], "hajj")).toBe("Hajj");
  expect(demoCategoryLabel([{ code: "rawa", nameEn: null, nameAr: null }], "rawa")).toBe("rawa");
  // The degraded honesty: no registry (failed read) or an unknown code
  // renders the raw code — never an invented label.
  expect(demoCategoryLabel(null, "stay")).toBe("stay");
  expect(demoCategoryLabel([STAY], "unknown")).toBe("unknown");
});

describe("DemoShowcase: the rendered honesty invariants", () => {
  test("every card carries the «بيانات عرض» badge and the notice states the real count", () => {
    const markup = renderToStaticMarkup(
      createElement(DemoShowcase, {
        listings: DEMO_LISTINGS.slice(0, 3),
        categories: [STAY],
        realCount: 1,
      }),
    );
    // One badge per card, the notice's real count (the SAME formatter the
    // component uses — environment-consistent, never a hardcoded glyph),
    // the registry's Arabic label — the labeled showcase, visibly not
    // real inventory.
    expect(markup.match(/بيانات عرض/g)?.length).toBeGreaterThanOrEqual(3);
    expect(markup).toContain("بيانات عرض توضيحية");
    expect(markup).toContain(
      `الإعلانات النشطة الحقيقية حاليًا: ${new Intl.NumberFormat("ar").format(1)}`,
    );
    expect(markup).toContain("إقامة");
    expect(markup).toContain("demo-listing-card");
  });

  test("ZERO anchors — a display card is never a link to a fake detail page", () => {
    // The demo ids are not backend UUIDs: the public detail read would
    // 404, and faking detail pages (or their JSON-LD) would poison the
    // SEO surface the S5 layer just built. Rule 4, enforced as markup.
    const markup = renderToStaticMarkup(
      createElement(DemoShowcase, {
        listings: DEMO_LISTINGS,
        categories: null,
        realCount: 0,
      }),
    );
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("href");
    // Degraded registry: the raw code shows (never an invented label).
    expect(markup).toContain("stay");
  });
});
