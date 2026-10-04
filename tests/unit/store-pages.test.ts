import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import StorePage from "@/app/store/page";
import ProductPage from "@/app/store/[id]/page";
import CartPage from "@/app/cart/page";
import OrdersPage from "@/app/orders/page";

/**
 * The storefront surfaces — the automated net over the سوق الحي design
 * (the attached PR #502 binding design): the storefront's own anatomy
 * (mode tabs, category chips, merchant CTA, offers rail, the seven
 * market sections), the honest plate (no faked photos), the first-party
 * badge, the product page's Q&A, the cart's multi-vendor grouping, and
 * the orders' lifecycle words (the neighborhood-screens pattern: a
 * mocked async server component rendered through renderToStaticMarkup
 * with cookies() stubbed — the cart's own read path).
 */

const fixtures = vi.hoisted(() => ({
  bread: {
    productId: "demo-suq-bread-tourist",
    qty: 2,
  },
  basket: {
    productId: "demo-suq-breakfast-basket",
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
            lines: [fixtures.bread, fixtures.basket],
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
                vendorAr: "مخبز ضاحية قدسيا",
                firstParty: false,
                rows: [
                  { titleAr: "خبز سياحي ممتاز وصمون", qty: 2, priceMajor: 15 },
                ],
                totalMajor: 30,
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

test("the storefront renders the design's anatomy: tabs, chips, CTA, offers, sections", async () => {
  const html = await render(
    StorePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
  // The storefront's own headline + the honest display badge.
  expect(html).toContain("سوق الحي");
  expect(html).toContain("بيانات عرض");
  // The design's 3-way market mode tabs (real destinations).
  expect(html).toContain("منتجات ومتاجر");
  expect(html).toContain("المستعمل");
  expect(html).toContain("الخدمات");
  // The design's category dictionary rides the chips rail.
  expect(html).toContain("مخابز وحلويات");
  expect(html).toContain("أسر منتجة ومطابخ");
  // The merchant CTA banner (the design's own words).
  expect(html).toContain("كن تاجراً، وافتح متجرك بالحي");
  expect(html).toContain("سجّل كتاجر وافتح متجرك مجاناً");
  // The offers rail + the design's own badges.
  expect(html).toContain("عروض سريعة");
  expect(html).toContain("خصم ٣٠٪");
  // The seven market sections (the design's own titles).
  expect(html).toContain("أفران ومعجنات دمر والشام");
  expect(html).toContain("الأسر المنتجة");
  // The honest plate: the category symbol renders, no <img> anywhere.
  expect(html).toContain("material-symbols-outlined");
  expect(html).not.toContain("<img");
  // The first-party badge and the design's Arabic-Indic price style.
  expect(html).toContain("من المنصة");
  expect(html).toContain("١٩٥ ريالاً");
});

test("the storefront filters by category honestly", async () => {
  const html = await render(
    StorePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ category: "bakery" }),
    }),
  );
  expect(html).toContain("خبز سياحي ممتاز وصمون");
  expect(html).not.toContain("فراولة مضايا");
});

test("the storefront search is the honest flat read", async () => {
  const html = await render(
    StorePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ q: "فراولة" }),
    }),
  );
  expect(html).toContain("فراولة مضايا الجبلية العسلية");
  expect(html).not.toContain("خبز سياحي");
  expect(html).toContain("نتائج البحث");
});

test("the product page renders price, vendor line, Q&A, and the honest payment note", async () => {
  const html = await render(
    ProductPage({
      params: Promise.resolve({ id: "demo-suq-bread-tourist" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("خبز سياحي ممتاز وصمون");
  expect(html).toContain("٤٫٦ من ٥");
  expect(html).toContain("أسئلة وأجوبة");
  expect(html).toContain("أضف إلى السلة");
  expect(html).toContain("التسوية اليدوية");
  expect(html).toContain("١٥ ريالاً");
});

test("the product page answers an honest 404 for non-demo ids", async () => {
  await expect(
    render(
      ProductPage({
        params: Promise.resolve({ id: "7b1c2f3a-1111-2222-3333-444455556666" }),
        searchParams: Promise.resolve({}),
      }).catch((e: unknown) => {
        // next/navigation's notFound() throws its own digest error — the
        // honest 404 gate; assert it is exactly that.
        expect(String((e as { digest?: string }).digest ?? "")).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
        throw e;
      }),
    ),
  ).rejects.toThrow();
});

test("the cart groups per vendor with the platform rows apart", async () => {
  const html = await render(CartPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }));
  expect(html).toContain("مخبز ضاحية قدسيا");
  expect(html).toContain("من المنصة");
  expect(html).toContain("الإجمالي:");
  // 2×15 + 1×195 = 225 — the design's digit style.
  expect(html).toContain("٢٢٥ ريالاً");
  expect(html).toContain("أتمّ الطلب");
});

test("the orders page renders the lifecycle's own words", async () => {
  const html = await render(OrdersPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }));
  expect(html).toContain("طلباتي");
  expect(html).toContain("قيد التحضير");
  expect(html).toContain("٣٠ ريالاً");
  expect(html).toContain("بيانات عرض");
});
