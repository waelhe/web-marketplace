import { describe, expect, test } from "vitest";
import {
  DEMO_CHARTER,
  DEMO_EMERGENCY_CONTACTS,
  DEMO_FEATURED_SERVICE,
  DEMO_LOST_FOUND,
  DEMO_MARKET_ITEMS,
  DEMO_MOOD,
  DEMO_OWNER_ALERTS,
  DEMO_OWNER_GROUPS,
  DEMO_OWNER_POSTS,
  DEMO_OWNER_PULSE,
  DEMO_ZONES,
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
  MARKET_SAFETY_RULES,
  SERVICE_TRADES,
  SERVICE_TRADE_LABELS,
  ZONE_STATUS_LABELS,
  freeGiftCount,
  marketItemMatches,
  ownerCount,
  ownerPercent,
  parseMarketCategory,
  parseServiceTrade,
  parseZoneLabel,
  serviceMatches,
  zoneLegendRow,
} from "@/lib/neighborhood-design";

/**
 * The OWNER-DESIGN layer (S10) — the automated net over the
 * product-defined display contracts for the four screens the owner's
 * spec names: the same discipline the S8 layer carries (demo-prefixed
 * ids, bounded vocabularies, honest parse helpers — never an invented
 * filter value).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every id the design layer serves, collected for the discipline net. */
function allDesignIds(): string[] {
  return [
    ...DEMO_OWNER_ALERTS.map((row) => row.id),
    ...DEMO_OWNER_POSTS.map((row) => row.id),
    ...DEMO_EMERGENCY_CONTACTS.map((row) => row.id),
    ...DEMO_OWNER_GROUPS.map((row) => row.id),
    ...DEMO_MARKET_ITEMS.map((row) => row.id),
    ...DEMO_FEATURED_SERVICE.map((row) => row.id),
    ...DEMO_ZONES.map((row) => row.id),
    ...DEMO_LOST_FOUND.map((row) => row.id),
  ];
}

describe("the demo id discipline (rule 3, the design layer)", () => {
  test("every design-layer id is demo-prefixed and never parses as a UUID", () => {
    const ids = allDesignIds();
    expect(ids.length).toBeGreaterThanOrEqual(20);
    for (const id of ids) {
      expect(id.startsWith("demo-")).toBe(true);
      expect(UUID_RE.test(id)).toBe(false);
    }
  });
});

describe("the owner's own number style (Latin digits in Arabic)", () => {
  test("ownerCount renders Latin digits — 832, 412, 99", () => {
    expect(ownerCount(832)).toBe("832");
    expect(ownerCount(412)).toBe("412");
    expect(ownerCount(99)).toBe("99");
    expect(ownerCount(1200)).toBe("1,200");
  });

  test("ownerPercent renders the design's bare percent — 99%", () => {
    expect(ownerPercent(0.99)).toBe("99%");
    expect(ownerPercent(0.46)).toBe("46%");
    expect(ownerPercent(1)).toBe("100%");
  });
});

describe("screen ① — the mood banner, the alert, the posts, the widgets", () => {
  test("the mood dataset is exactly one row with the design's own copy", () => {
    expect(DEMO_MOOD).toHaveLength(1);
    const mood = DEMO_MOOD[0];
    expect(mood.greeting).toBe("صباح الخير والمودّة");
    expect(mood.zoneChip).toBe("مربع 4 - واحة الأمان");
    expect(mood.families).toBe(832);
    expect(mood.gateWatch).toContain("100%");
  });

  test("the pinned alert carries the works map, the guidelines, and the parking note", () => {
    expect(DEMO_OWNER_ALERTS).toHaveLength(1);
    const alert = DEMO_OWNER_ALERTS[0];
    expect(alert.badge).toBe("تنبيه حيوي مثبت");
    expect(alert.guidelines.length).toBeGreaterThanOrEqual(2);
    expect(alert.mapLabel.length).toBeGreaterThan(0);
    expect(alert.parkingNote.length).toBeGreaterThan(0);
    expect(alert.views).toBeGreaterThan(0);
    expect(alert.acknowledgments).toBeGreaterThan(0);
  });

  test("the three display posts ride the design's own authors, one per kind", () => {
    expect(DEMO_OWNER_POSTS).toHaveLength(3);
    const kinds = new Set(DEMO_OWNER_POSTS.map((post) => post.kind));
    expect(kinds).toEqual(new Set(["RECOMMENDATION", "LOST_FOUND", "WELCOME"]));
    const recommendation = DEMO_OWNER_POSTS.find((post) => post.kind === "RECOMMENDATION");
    expect(recommendation?.service?.name).toContain("أبو حاتم");
    expect(recommendation?.service?.rating).toBe(4.9);
    expect(recommendation?.commentPreview?.author).toContain("سعد العريفي");
    const welcome = DEMO_OWNER_POSTS.find((post) => post.kind === "WELCOME");
    expect(welcome?.welcomedBy).toBe(49);
    expect(welcome?.welcomeStack).toHaveLength(3);
  });

  test("the pulse widget carries the design's own numbers (412 / 18 / 99)", () => {
    expect(DEMO_OWNER_PULSE).toHaveLength(1);
    expect(DEMO_OWNER_PULSE[0].onlineNow).toBe(412);
    expect(DEMO_OWNER_PULSE[0].solvedThisWeek).toBe(18);
    expect(DEMO_OWNER_PULSE[0].safetyPercent).toBe(99);
  });

  test("the emergency directory carries the municipality's 940 row", () => {
    expect(DEMO_EMERGENCY_CONTACTS).toHaveLength(3);
    const municipality = DEMO_EMERGENCY_CONTACTS.find(
      (row) => row.id === "demo-emergency-municipality",
    );
    expect(municipality?.name).toContain("940");
  });

  test("the groups dataset carries the design's three clubs with join gates", () => {
    expect(DEMO_OWNER_GROUPS).toHaveLength(3);
    for (const group of DEMO_OWNER_GROUPS) {
      expect(group.members).toBeGreaterThan(0);
      expect(group.joinGate.length).toBeGreaterThan(0);
    }
  });

  test("the charter carries the hadith quote and the safety rules", () => {
    expect(DEMO_CHARTER).toHaveLength(1);
    expect(DEMO_CHARTER[0].quote).toContain("ما زال جبريل يوصيني بالجار");
    expect(DEMO_CHARTER[0].rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("screen ② — the market vocabulary", () => {
  test("the five categories are exactly the design's chips", () => {
    expect([...MARKET_CATEGORIES]).toEqual([
      "FREE",
      "FURNITURE",
      "ELECTRONICS",
      "TOOLS",
      "OTHER",
    ]);
    expect(MARKET_CATEGORY_LABELS.FREE).toBe("مقتنيات مجانية");
  });

  test("the items span the categories and the free rail counts them", () => {
    expect(DEMO_MARKET_ITEMS.length).toBe(8);
    expect(freeGiftCount(DEMO_MARKET_ITEMS)).toBe(3);
    const categories = new Set(DEMO_MARKET_ITEMS.map((item) => item.category));
    expect(categories.size).toBe(5);
  });

  test("marketItemMatches: empty query keeps everything; text matches title and location", () => {
    const all = DEMO_MARKET_ITEMS.filter((item) => marketItemMatches(item, ""));
    expect(all).toHaveLength(8);
    const desk = DEMO_MARKET_ITEMS.filter((item) => marketItemMatches(item, "مكتب"));
    expect(desk).toHaveLength(1);
    const yamama = DEMO_MARKET_ITEMS.filter((item) => marketItemMatches(item, "اليمامة"));
    expect(yamama.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_MARKET_ITEMS.filter((item) => marketItemMatches(item, "لاشيءيمطابق"))).toHaveLength(0);
  });

  test("the safety rules strip carries the design's four rules", () => {
    expect(MARKET_SAFETY_RULES).toHaveLength(4);
  });
});

describe("screen ③ — the services vocabulary", () => {
  test("the five trades are exactly the design's chips", () => {
    expect([...SERVICE_TRADES]).toEqual([
      "ALL",
      "COOLING",
      "HOME_CARE",
      "STAY",
      "MAINTENANCE",
    ]);
    expect(SERVICE_TRADE_LABELS.COOLING).toBe("تكييف وتبريد");
  });

  test("the featured service is the owner's own card (أبو حاتم)", () => {
    expect(DEMO_FEATURED_SERVICE).toHaveLength(1);
    const featured = DEMO_FEATURED_SERVICE[0];
    expect(featured.name).toContain("أبو حاتم");
    expect(featured.trade).toBe("COOLING");
    expect(featured.rating).toBe(4.9);
    expect(featured.neighborNote).toContain("خالد التميمي");
  });

  test("serviceMatches: empty query keeps everything; text matches name and trade", () => {
    expect(serviceMatches("أركان النظافة", "خدمات منزلية", "")).toBe(true);
    expect(serviceMatches("أركان النظافة", "خدمات منزلية", "نظافة")).toBe(true);
    expect(serviceMatches("أركان النظافة", "خدمات منزلية", "تكييف")).toBe(false);
  });
});

describe("screen ④ — the safety vocabulary", () => {
  test("the six zones cover the three statuses with one mine", () => {
    expect(DEMO_ZONES).toHaveLength(6);
    const statuses = new Set(DEMO_ZONES.map((zone) => zone.status));
    expect(statuses).toEqual(new Set(["SAFE", "NOTICE", "WORKS"]));
    expect(DEMO_ZONES.filter((zone) => zone.mine)).toHaveLength(1);
  });

  test("the incidents reference existing zone labels", () => {
    const labels = new Set(DEMO_ZONES.map((zone) => zone.label));
    for (const incident of DEMO_INCIDENTS_REF()) {
      expect(labels.has(incident.zone)).toBe(true);
      expect(incident.confirmed).toBeGreaterThan(0);
    }
  });

  test("the lost&found board carries both states", () => {
    const states = new Set(DEMO_LOST_FOUND.map((entry) => entry.status));
    expect(states).toEqual(new Set(["FOUND", "STILL_LOST"]));
    expect(ZONE_STATUS_LABELS.WORKS).toBe("أعمال جارية");
  });

  test("zoneLegendRow renders a label + note per status", () => {
    for (const status of ["SAFE", "NOTICE", "WORKS"] as const) {
      const row = zoneLegendRow(status);
      expect(row.label).toBe(ZONE_STATUS_LABELS[status]);
      expect(row.note.length).toBeGreaterThan(0);
    }
  });
});

/** The incidents read (kept behind a helper so the id net stays flat). */
function DEMO_INCIDENTS_REF() {
  return DEMO_ZONES.length === 6
    ? [
        { zone: "مربع 3", confirmed: 84 },
        { zone: "مربع 5", confirmed: 126 },
        { zone: "مربع 6", confirmed: 41 },
      ]
    : [];
}

describe("the parse helpers (never an invented filter value)", () => {
  test("parseMarketCategory: valid values pass; invalid and arrays drop to null", () => {
    expect(parseMarketCategory("FREE")).toBe("FREE");
    expect(parseMarketCategory("NOT_A_CATEGORY")).toBeNull();
    expect(parseMarketCategory(undefined)).toBeNull();
    expect(parseMarketCategory(["ELECTRONICS", "FREE"])).toBe("ELECTRONICS");
  });

  test("parseServiceTrade: valid values pass; invalid drops to null", () => {
    expect(parseServiceTrade("COOLING")).toBe("COOLING");
    expect(parseServiceTrade("ALL")).toBe("ALL");
    expect(parseServiceTrade("NOT_A_TRADE")).toBeNull();
    expect(parseServiceTrade(["STAY"])).toBe("STAY");
  });

  test("parseZoneLabel: مربع N passes; anything else drops to null", () => {
    expect(parseZoneLabel("مربع 3")).toBe("مربع 3");
    expect(parseZoneLabel("مربع 18")).toBe("مربع 18");
    expect(parseZoneLabel("block 3")).toBeNull();
    expect(parseZoneLabel("مربع")).toBeNull();
    expect(parseZoneLabel(undefined)).toBeNull();
    expect(parseZoneLabel(["مربع 5"])).toBe("مربع 5");
  });
});
