import { describe, expect, test } from "vitest";
import {
  formatMarketPrice,
  formatMarketWhen,
  isFreeGift,
  marketCategoryIcon,
  sellerBadgeLabel,
} from "@/lib/neighborhood-market";

/**
 * The market board's display helpers (L50 — gap #5 served): every
 * rule is pinned against the design's own display vocabulary (the
 * DEMO_MARKET_ITEMS labels are the grammar's ground truth — «350
 * ريالاً»، «مجاني — إهداء»، «منذ ساعتين»، «منذ 4 ساعات»، «منذ 11
 * ساعة»، «منذ يوم»، «منذ يومين») and the served contract's own
 * facts (the badge is earned, the gift carries no price).
 */

describe("formatMarketPrice — the design's own Arabic money grammar", () => {
  test("a gift renders the green band's own words", () => {
    expect(formatMarketPrice(null, null)).toBe("مجاني — إهداء");
  });

  test("the display dataset's own prices land in their measured labels", () => {
    // 120/150/350/480/260 — the tens tail governs: ريالاً.
    expect(formatMarketPrice(12000, "SAR")).toBe("120 ريالاً");
    expect(formatMarketPrice(15000, "SAR")).toBe("150 ريالاً");
    expect(formatMarketPrice(35000, "SAR")).toBe("350 ريالاً");
    expect(formatMarketPrice(48000, "SAR")).toBe("480 ريالاً");
    expect(formatMarketPrice(26000, "SAR")).toBe("260 ريالاً");
  });

  test("the grammar's own classes: dual, plural, singular accusative, exact hundreds", () => {
    expect(formatMarketPrice(100, "SAR")).toBe("1 ريال");
    expect(formatMarketPrice(200, "SAR")).toBe("2 ريالان");
    expect(formatMarketPrice(500, "SAR")).toBe("5 ريالات");
    expect(formatMarketPrice(1100, "SAR")).toBe("11 ريالاً");
    expect(formatMarketPrice(20000, "SAR")).toBe("200 ريال");
    expect(formatMarketPrice(20500, "SAR")).toBe("205 ريالات");
  });

  test("a non-SAR currency falls to the house Intl formatter, never an invented label", () => {
    // The ar-locale currency formatter carries its own symbol/digits —
    // the honest check is that NO invented riyal label leaks.
    expect(formatMarketPrice(1000, "USD")).not.toContain("ريال");
    expect(formatMarketPrice(1000, "USD")).not.toBe("مجاني — إهداء");
  });
});

describe("isFreeGift — the ONE pricing rule's own render", () => {
  test("null cents is the gift; priced cents is not", () => {
    expect(isFreeGift(null)).toBe(true);
    expect(isFreeGift(12000)).toBe(false);
  });
});

describe("formatMarketWhen — the design's own Arabic time grammar", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  test("the display dataset's own durations land in their measured labels", () => {
    expect(formatMarketWhen("2026-10-02T10:00:00Z", now)).toBe("منذ ساعتين");
    expect(formatMarketWhen("2026-10-02T08:00:00Z", now)).toBe("منذ 4 ساعات");
    expect(formatMarketWhen("2026-10-02T01:00:00Z", now)).toBe("منذ 11 ساعة");
    expect(formatMarketWhen("2026-10-01T12:00:00Z", now)).toBe("منذ يوم");
    expect(formatMarketWhen("2026-09-30T12:00:00Z", now)).toBe("منذ يومين");
  });

  test("the grammar's own classes: now, singular, dual, plural, accusative", () => {
    expect(formatMarketWhen("2026-10-02T12:00:00Z", now)).toBe("الآن");
    expect(formatMarketWhen("2026-10-02T11:59:00Z", now)).toBe("منذ دقيقة");
    expect(formatMarketWhen("2026-10-02T11:58:00Z", now)).toBe("منذ دقيقتين");
    expect(formatMarketWhen("2026-10-02T11:55:00Z", now)).toBe("منذ 5 دقائق");
    expect(formatMarketWhen("2026-10-02T11:00:00Z", now)).toBe("منذ ساعة");
    expect(formatMarketWhen("2026-10-02T07:00:00Z", now)).toBe("منذ 5 ساعات");
    expect(formatMarketWhen("2026-09-27T12:00:00Z", now)).toBe("منذ 5 أيام");
    expect(formatMarketWhen("2026-09-25T12:00:00Z", now)).toBe("منذ 7 أيام");
    expect(formatMarketWhen("2026-09-20T12:00:00Z", now)).toBe("منذ 12 يومًا");
  });

  test("a future timestamp clamps to الآن, never a negative label", () => {
    expect(formatMarketWhen("2026-10-02T13:00:00Z", now)).toBe("الآن");
  });
});

describe("marketCategoryIcon — the category's own derivation", () => {
  test("every category maps to its Material Symbols icon", () => {
    expect(marketCategoryIcon("FREE")).toBe("redeem");
    expect(marketCategoryIcon("FURNITURE")).toBe("chair");
    expect(marketCategoryIcon("ELECTRONICS")).toBe("devices");
    expect(marketCategoryIcon("TOOLS")).toBe("carpenter");
    expect(marketCategoryIcon("OTHER")).toBe("sell");
  });
});

describe("sellerBadgeLabel — earned, never claimed", () => {
  test("the verified state earns the badge; every other state renders the honest floor", () => {
    expect(sellerBadgeLabel(true)).toBe("جار موثق");
    expect(sellerBadgeLabel(false)).toBe("جار");
  });
});
