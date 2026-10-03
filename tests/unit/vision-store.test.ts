import { describe, expect, it } from "vitest";
import {
  CART_COOKIE,
  ORDERS_COOKIE,
  STORE_CATEGORIES,
  STORE_PRODUCTS,
  browseStoreProducts,
  cartGrandTotal,
  cartLinesWithProducts,
  encodeCart,
  findStoreProduct,
  groupCartByVendor,
  riyalGrammar,
  storePriceLine,
  vendorLine,
} from "@/lib/vision-store";

/**
 * The commerce display world's own rules — the discipline's five gates
 * plus the multi-vendor grouping the M3 wave will formalize.
 */
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

  it("findStoreProduct guards the demo- parse boundary", () => {
    expect(findStoreProduct("demo-product-blender")).not.toBeNull();
    // A UUID-shaped id never resolves — the route's own honest 404 gate.
    expect(findStoreProduct("7b1c2f3a-1111-2222-3333-444455556666")).toBeNull();
    expect(findStoreProduct("product-blender")).toBeNull();
  });

  it("browse filters by category and text honestly", () => {
    expect(browseStoreProducts({ category: "home" }).every((p) => p.category === "home")).toBe(true);
    expect(browseStoreProducts({ q: "خلاط" }).every((p) => p.titleAr.includes("خلاط") || p.summaryAr.includes("خلاط"))).toBe(true);
    expect(browseStoreProducts({ q: "لا-شيء-يطابق-هذا" })).toHaveLength(0);
    // The store's category vocabulary is its own closed set.
    expect(STORE_CATEGORIES.some((c) => c.code === "home")).toBe(true);
    expect(browseStoreProducts({ category: "not-a-real-category" })).toHaveLength(0);
  });

  it("the riyal grammar keeps the design's own classical rule", () => {
    expect(riyalGrammar(1)).toBe("ريال");
    expect(riyalGrammar(2)).toBe("ريالان");
    expect(riyalGrammar(5)).toBe("ريالات");
    expect(riyalGrammar(11)).toBe("ريالاً");
    expect(riyalGrammar(65)).toBe("ريالاً");
    expect(riyalGrammar(100)).toBe("ريال");
    expect(storePriceLine(180)).toBe("180 ريالاً");
    expect(storePriceLine(520)).toBe("520 ريالاً");
  });

  it("the vendor line is honest for first-party and new sellers", () => {
    const platform = STORE_PRODUCTS.find((p) => p.firstParty)!;
    expect(vendorLine(platform)).toBe("من المنصة");
    const unrated = STORE_PRODUCTS.find((p) => !p.firstParty && p.vendorRating === null);
    if (unrated) {
      expect(vendorLine(unrated)).toContain("بائع جديد");
    }
  });

  it("the cart grouping settles per vendor with first-party grouped apart", () => {
    const blender = findStoreProduct("demo-product-blender")!; // أدوات المطبخ الشامية
    const charger = findStoreProduct("demo-product-charger")!; // من المنصة
    const earbuds = findStoreProduct("demo-product-earbuds")!; // تقنية الواجهة
    const groups = groupCartByVendor([
      { product: blender, qty: 2 },
      { product: charger, qty: 1 },
      { product: earbuds, qty: 1 },
    ]);
    expect(groups).toHaveLength(3);
    const platform = groups.find((g) => g.firstParty)!;
    expect(platform.totalMajor).toBe(charger.priceMajor);
    const kitchen = groups.find((g) => g.vendorAr === "أدوات المطبخ الشامية")!;
    expect(kitchen.totalMajor).toBe(blender.priceMajor * 2);
    expect(cartGrandTotal([
      { product: blender, qty: 2 },
      { product: charger, qty: 1 },
    ])).toBe(blender.priceMajor * 2 + charger.priceMajor);
  });

  it("unknown cart ids drop honestly (a stale cookie never breaks the page)", () => {
    const joined = cartLinesWithProducts([
      { productId: "demo-product-blender", qty: 1 },
      { productId: "demo-product-gone-forever", qty: 3 },
    ]);
    expect(joined).toHaveLength(1);
    expect(joined[0].product.id).toBe("demo-product-blender");
  });

  it("the cookie contract carries its version and stable names", () => {
    expect(CART_COOKIE).toBe("marketplace-cart");
    expect(ORDERS_COOKIE).toBe("marketplace-orders");
    const encoded = JSON.parse(encodeCart([{ productId: "demo-product-blender", qty: 1 }]));
    expect(encoded.v).toBe(1);
    expect(encoded.lines).toEqual([{ productId: "demo-product-blender", qty: 1 }]);
  });
});
