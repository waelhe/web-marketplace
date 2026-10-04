import { describe, expect, it } from "vitest";
import {
  CART_COOKIE,
  ORDERS_COOKIE,
  STORE_CATEGORIES,
  STORE_PRODUCTS,
  SUQ_SECTIONS,
  browseStoreProducts,
  cartGrandTotal,
  cartLinesWithProducts,
  encodeCart,
  findStoreProduct,
  groupCartByVendor,
  riyalGrammar,
  storePriceLine,
  suqOffers,
  suqStorefrontSections,
  vendorLine,
} from "@/lib/vision-store";

/**
 * The commerce display world's own rules — the discipline's five gates
 * plus the multi-vendor grouping the M3 wave will formalize. The world
 * itself is the attached design's سوق الحي (PR #502, 2026-10-04).
 */

/** Arabic-Indic digit guard (the attached design's own number style). */
const ARABIC_INDIC = /^[٠-٩]/;

describe("vision-store — the commerce display world", () => {
  it("every product id carries the demo- prefix (never a backend UUID)", () => {
    for (const p of STORE_PRODUCTS) {
      expect(p.id.startsWith("demo-")).toBe(true);
    }
  });

  it("first-party rows are exactly the «من المنصة» ones", () => {
    const firstParty = STORE_PRODUCTS.filter((p) => p.firstParty);
    expect(firstParty.length).toBeGreaterThan(0);
    expect(firstParty.every((p) => p.vendorAr === "من المنصة")).toBe(true);
    expect(STORE_PRODUCTS.filter((p) => !p.firstParty).every((p) => p.vendorAr !== "من المنصة")).toBe(true);
  });

  it("the design's own dictionary: eight categories, seven sections", () => {
    expect(STORE_CATEGORIES).toHaveLength(8);
    expect(STORE_CATEGORIES.map((c) => c.code)).toEqual([
      "bakery",
      "produce",
      "meats",
      "coffee",
      "fashion",
      "kids",
      "homekitchen",
      "perfumes",
    ]);
    expect(SUQ_SECTIONS).toHaveLength(7);
    // Every section maps to a real category; the eighth (عطور وعناية)
    // is a chip-only category — its section waits for rows.
    for (const s of SUQ_SECTIONS) {
      expect(STORE_CATEGORIES.some((c) => c.code === s.category)).toBe(true);
    }
    expect(SUQ_SECTIONS.some((s) => s.category === "perfumes")).toBe(false);
  });

  it("the storefront sections compose with their rows (honest drops)", () => {
    const sections = suqStorefrontSections();
    expect(sections).toHaveLength(7);
    for (const s of sections) {
      expect(s.rows.length).toBeGreaterThan(0);
      expect(s.rows.every((r) => r.category === s.category)).toBe(true);
    }
    // The design's own section vocabulary rides the composition.
    expect(sections.some((s) => s.titleAr === "أفران ومعجنات دمر والشام")).toBe(true);
    expect(sections.some((s) => s.titleAr === "الأسر المنتجة")).toBe(true);
  });

  it("the offers rail resolves to REAL product rows", () => {
    const offers = suqOffers();
    expect(offers).toHaveLength(3);
    for (const o of offers) {
      expect(o.product.id).toBe(o.productId);
    }
    // The design's own offers: the platform basket (first-party), the
    // produce box, and the coffee card.
    expect(offers.some((o) => o.badgeAr === "خصم ٣٠٪" && o.product.firstParty)).toBe(true);
    expect(offers.some((o) => o.badgeAr === "عرض العصرونية" && o.product.category === "coffee")).toBe(true);
  });

  it("findStoreProduct guards the demo- parse boundary", () => {
    expect(findStoreProduct("demo-suq-bread-tourist")).not.toBeNull();
    // A UUID-shaped id never resolves — the route's own honest 404 gate.
    expect(findStoreProduct("7b1c2f3a-1111-2222-3333-444455556666")).toBeNull();
    expect(findStoreProduct("suq-bread-tourist")).toBeNull();
  });

  it("browse filters by category and text honestly", () => {
    expect(browseStoreProducts({ category: "bakery" }).every((p) => p.category === "bakery")).toBe(true);
    expect(browseStoreProducts({ q: "خبز" }).every((p) => p.titleAr.includes("خبز") || p.summaryAr.includes("خبز"))).toBe(true);
    expect(browseStoreProducts({ q: "لا-شيء-يطابق-هذا" })).toHaveLength(0);
    // The store's category vocabulary is its own closed set.
    expect(STORE_CATEGORIES.some((c) => c.code === "bakery")).toBe(true);
    expect(browseStoreProducts({ category: "not-a-real-category" })).toHaveLength(0);
    // The chip-only category answers its honest empty.
    expect(browseStoreProducts({ category: "perfumes" })).toHaveLength(0);
  });

  it("the riyal grammar keeps the design's own classical rule", () => {
    expect(riyalGrammar(1)).toBe("ريال");
    expect(riyalGrammar(2)).toBe("ريالان");
    expect(riyalGrammar(5)).toBe("ريالات");
    expect(riyalGrammar(11)).toBe("ريالاً");
    expect(riyalGrammar(65)).toBe("ريالاً");
    expect(riyalGrammar(100)).toBe("ريال");
  });

  it("the price line follows the attached design's Arabic-Indic digits", () => {
    // The PR #502 mockup renders ١٢,٠٠٠ everywhere — the storefront
    // family follows its binding design's number style.
    expect(storePriceLine(15)).toBe("١٥ ريالاً");
    expect(storePriceLine(195)).toBe("١٩٥ ريالاً");
    expect(storePriceLine(520)).toBe("٥٢٠ ريالاً");
    expect(storePriceLine(15)).toMatch(ARABIC_INDIC);
  });

  it("the vendor line is honest for first-party and new sellers", () => {
    const platform = STORE_PRODUCTS.find((p) => p.firstParty)!;
    expect(vendorLine(platform)).toBe("من المنصة");
    const unrated = STORE_PRODUCTS.find((p) => !p.firstParty && p.vendorRating === null);
    if (unrated) {
      expect(vendorLine(unrated)).toContain("بائع جديد");
    }
    // The rated line carries the design's digit style too.
    const rated = STORE_PRODUCTS.find((p) => !p.firstParty && p.vendorRating !== null)!;
    expect(vendorLine(rated)).toMatch(/[٠-٩]٫[٠-٩] من ٥/);
  });

  it("the cart grouping settles per vendor with first-party grouped apart", () => {
    const bread = findStoreProduct("demo-suq-bread-tourist")!; // مخبز ضاحية قدسيا
    const basket = findStoreProduct("demo-suq-breakfast-basket")!; // من المنصة
    const lamb = findStoreProduct("demo-suq-lamb-awaas")!; // قصابة ضاحية قدسيا البلدية
    const groups = groupCartByVendor([
      { product: bread, qty: 2 },
      { product: basket, qty: 1 },
      { product: lamb, qty: 1 },
    ]);
    expect(groups).toHaveLength(3);
    const platform = groups.find((g) => g.firstParty)!;
    expect(platform.totalMajor).toBe(basket.priceMajor);
    const bakery = groups.find((g) => g.vendorAr === "مخبز ضاحية قدسيا")!;
    expect(bakery.totalMajor).toBe(bread.priceMajor * 2);
    expect(cartGrandTotal([
      { product: bread, qty: 2 },
      { product: basket, qty: 1 },
    ])).toBe(bread.priceMajor * 2 + basket.priceMajor);
  });

  it("unknown cart ids drop honestly (a stale cookie never breaks the page)", () => {
    const joined = cartLinesWithProducts([
      { productId: "demo-suq-bread-tourist", qty: 1 },
      { productId: "demo-product-blender", qty: 3 }, // the retired N14 world
      { productId: "demo-suq-gone-forever", qty: 3 },
    ]);
    expect(joined).toHaveLength(1);
    expect(joined[0].product.id).toBe("demo-suq-bread-tourist");
  });

  it("the cookie contract carries its version and stable names", () => {
    expect(CART_COOKIE).toBe("marketplace-cart");
    expect(ORDERS_COOKIE).toBe("marketplace-orders");
    const encoded = JSON.parse(encodeCart([{ productId: "demo-suq-bread-tourist", qty: 1 }]));
    expect(encoded.v).toBe(1);
    expect(encoded.lines).toEqual([{ productId: "demo-suq-bread-tourist", qty: 1 }]);
  });
});
