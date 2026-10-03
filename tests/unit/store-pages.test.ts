import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import StorePage from "@/app/store/page";
import ProductPage from "@/app/store/[id]/page";
import CartPage from "@/app/cart/page";
import OrdersPage from "@/app/orders/page";

/**
 * The full-vision store surfaces — the automated net over the commerce
 * column's display world (the neighborhood-screens pattern: a mocked
 * async server component rendered through renderToStaticMarkup with
 * cookies() stubbed — the cart's own read path). The anatomy asserted:
 * the store's browse vocabulary, the honest plate (no faked photos),
 * the first-party badge, the product page's Q&A, the cart's
 * multi-vendor grouping, and the orders' lifecycle words.
 */

const fixtures = vi.hoisted(() => ({
  blender: {
    productId: "demo-product-blender",
    qty: 2,
  },
  charger: {
    productId: "demo-product-charger",
    qty: 1,
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "marketplace-cart") {
        return {
          value: JSON.stringify({
            v: 1,
            lines: [fixtures.blender, fixtures.charger],
          }),
        };
      }
      if (name === "marketplace-orders") {
        return {
          value: JSON.stringify({
            v: 1,
            orders: [
              {
                id: "demo-order-test1",
                placedAt: "2026-10-04T09:00:00Z",
                state: "PREPARING",
                vendorAr: "أدوات المطبخ الشامية",
                firstParty: false,
                rows: [
                  { titleAr: "خلاط زجاجي 1.5 لتر بثلاث سرعات", qty: 2, priceMajor: 180 },
                ],
                totalMajor: 360,
              },
            ],
          }),
        };
      }
      return undefined;
    },
  })),
}));

/** The house async-render helper. */
async function render(node: React.ReactNode): Promise<string> {
  return renderToStaticMarkup(await Promise.resolve(node));
}

test("the store browse renders the categories rail, the badge, and honest plates", async () => {
  const html = await render(
    StorePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("المتجر");
  expect(html).toContain("كل الفئات");
  expect(html).toContain("المنزل والمطبخ");
  expect(html).toContain("بيانات عرض");
  // The honest plate: the category symbol renders, no <img> anywhere.
  expect(html).toContain("material-symbols-outlined");
  expect(html).not.toContain("<img");
  // The first-party badge and the price grammar.
  expect(html).toContain("من المنصة");
  expect(html).toContain("180 ريالاً");
});

test("the store browse filters by category honestly", async () => {
  const html = await render(
    StorePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ category: "home" }),
    }),
  );
  expect(html).toContain("خلاط زجاجي");
  expect(html).not.toContain("سماعات لاسلكية");
});

test("the product page renders price, vendor line, Q&A, and the honest payment note", async () => {
  const html = await render(
    ProductPage({
      params: Promise.resolve({ id: "demo-product-blender" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("خلاط زجاجي 1.5 لتر بثلاث سرعات");
  expect(html).toContain("4.6 من ٥");
  expect(html).toContain("أسئلة وأجوبة");
  expect(html).toContain("أضف إلى السلة");
  expect(html).toContain("التسوية اليدوية");
});

test("the product page answers an honest 404 for non-demo ids", async () => {
  await expect(
    render(
      ProductPage({
        params: Promise.resolve({ id: "7b1c2f3a-1111-2222-3333-444455556666" }),
        searchParams: Promise.resolve({}),
      }),
    ).catch((e: unknown) => {
      // next/navigation's notFound() throws its own digest error — the
      // honest 404 gate; assert it is exactly that.
      expect(String((e as { digest?: string }).digest ?? "")).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
      throw e;
    }),
  ).rejects.toThrow();
});

test("the cart groups per vendor with the platform rows apart", async () => {
  const html = await render(CartPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }));
  expect(html).toContain("أدوات المطبخ الشامية");
  expect(html).toContain("من المنصة");
  expect(html).toContain("الإجمالي:");
  // 2×180 + 1×95 = 455
  expect(html).toContain("455 ريالاً");
  expect(html).toContain("أتمّ الطلب");
});

test("the orders page renders the lifecycle's own words", async () => {
  const html = await render(OrdersPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }));
  expect(html).toContain("طلباتي");
  expect(html).toContain("قيد التحضير");
  expect(html).toContain("360 ريالاً");
  expect(html).toContain("بيانات عرض");
});
