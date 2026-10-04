import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import StoreLayout from "@/app/store/layout";

/**
 * The storefront chrome — the attached design's app shell net: the
 * Tajawal-scoped `.suq` frame, the REAL-state unified cart bar (the
 * official cookie read: a filled cart renders the design's bar with its
 * honest count/total/vendors; an empty cart renders NOTHING), and the
 * floating pill nav's mounting point (the client nav stubbed the
 * wing-shell way — its own anatomy is the e2e net's job).
 *
 * Render note (the async-component discipline): the CartBar is an async
 * server component — it is CALLED directly and awaited (its own element
 * tree is fully sync), never rendered as a suspended child of a
 * static-markup pass (the measured "suspended while responding to
 * synchronous input" failure).
 */

const fixtures = vi.hoisted(() => ({
  cart: {
    v: 1,
    lines: [
      { productId: "demo-suq-bread-tourist", qty: 2 },
      { productId: "demo-suq-breakfast-basket", qty: 1 },
    ],
  },
}));

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/font/google", () => ({
  Tajawal: () => ({ variable: "--font-tajawal" }),
}));

vi.mock("@/app/store/storefront-nav", () => ({
  StorefrontNav: () => "storefront-nav-stub",
}));

vi.mock("@/app/store/cart-bar", () => ({
  CartBar: () => "cart-bar-stub",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "marketplace-cart" && cookieJar.value !== undefined
        ? { value: cookieJar.value }
        : undefined,
  })),
}));

test("the layout wraps the family in the .suq scope with the chrome mounted", async () => {
  cookieJar.value = undefined;
  const html = renderToStaticMarkup(await StoreLayout({ children: <p>store-child</p> }));
  expect(html).toContain("suq"); // the scope class + the frame
  expect(html).toContain("store-child");
  // The chrome rides the layout: the REAL-state cart bar + the client
  // floating nav (both stubbed here; their own nets are below / e2e).
  expect(html).toContain("cart-bar-stub");
  expect(html).toContain("storefront-nav-stub");
});

test("the cart bar renders the REAL cart state with the design's own words", async () => {
  const { CartBar: RealCartBar } = await vi.importActual<
    typeof import("@/app/store/cart-bar")
  >("@/app/store/cart-bar");
  cookieJar.value = JSON.stringify(fixtures.cart);
  const html = renderToStaticMarkup(await RealCartBar());
  // 3 items (2 bread + 1 basket) — the honest count, Arabic-Indic.
  expect(html).toContain("٣");
  // The multi-vendor truth: two stores in one cart.
  expect(html).toContain("متجران");
  // 2×15 + 1×195 = 225 — the design's digit style.
  expect(html).toContain("٢٢٥ ريالاً");
  // The design's CTA — the single next step.
  expect(html).toContain("متابعة الطلب");
  expect(html).toContain("/cart");
});

test("the empty cart renders NO bar (never a faked count)", async () => {
  const { CartBar: RealCartBar } = await vi.importActual<
    typeof import("@/app/store/cart-bar")
  >("@/app/store/cart-bar");
  cookieJar.value = undefined;
  const html = renderToStaticMarkup(await RealCartBar());
  expect(html).toBe("");
});

test("a stale cart cookie drops its unknown ids and renders the honest rest", async () => {
  const { CartBar: RealCartBar } = await vi.importActual<
    typeof import("@/app/store/cart-bar")
  >("@/app/store/cart-bar");
  cookieJar.value = JSON.stringify({
    v: 1,
    lines: [
      { productId: "demo-suq-mint-parsley", qty: 1 },
      { productId: "demo-product-blender", qty: 2 }, // the retired N14 world
    ],
  });
  const html = renderToStaticMarkup(await RealCartBar());
  expect(html).toContain("متجر واحد");
  expect(html).toContain("٨ ريالات"); // the mint row alone (grammar: 3-10 → ريالات)
  expect(html).not.toContain("blender");
});
