"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  CART_COOKIE,
  ORDERS_COOKIE,
  encodeCart,
  encodeOrders,
  findStoreProduct,
  readCart,
  readOrders,
  type CartLine,
  type DisplayOrder,
} from "@/lib/vision-store";

/**
 * The cart's Server Actions — the framework's OFFICIAL cookie mutation
 * contract (cookies() writes inside Server Actions / Route Handlers
 * only — the same constraint the S2 web-session wave is scoped
 * against). No client state, no localStorage: the cart is first-class
 * server-persisted state, anonymous-safe (no session required — the
 * store is a public surface; checkout's honest gate below says the
 * order trail stays in the buyer's own browser until the M3 wave
 * formalizes accounts-anchored orders).
 *
 * Bounds mirror the dataset's own limits: qty 1..9, products only the
 * display world knows (a stale cookie id is dropped, never 500s).
 */

const CART_MAX_AGE = 90 * 24 * 60 * 60; // 90 days — the cart outlives sessions by design.

async function writeCart(lines: CartLine[]): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, encodeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
}

/** Add one product (cap at 9 — the honest stock grammar of the display world). */
export async function addToCart(productId: string): Promise<void> {
  if (!productId.startsWith("demo-")) return; // never a backend UUID contract
  const product = findStoreProduct(productId);
  if (!product || !product.inStock) return;
  const lines = await readCart();
  const existing = lines.find((l) => l.productId === productId);
  const next: CartLine[] = existing
    ? lines.map((l) =>
        l.productId === productId ? { ...l, qty: Math.min(9, l.qty + 1) } : l,
      )
    : [...lines, { productId, qty: 1 }];
  await writeCart(next);
  revalidatePath("/cart");
  revalidatePath(`/store/${productId}`);
  // The storefront family's whole tree re-renders: the unified cart bar
  // (the layout's server read) picks the new cart state — the attached
  // design's own behavior (stay on the market screen, the bar updates).
  revalidatePath("/store");
  revalidatePath("/store", "layout");
  // The attached design (PR #502) keeps the buyer on the storefront —
  // the cart bar's own «متابعة الطلب» is the single next step to /cart.
  // (N14's redirect-to-cart gave way to the binding design's behavior;
  // the official lane is unchanged: Server Action + cookie + fresh
  // server render, no client state.)
}

/** Set an exact quantity (0 removes the line). */
export async function setCartQty(productId: string, qty: number): Promise<void> {
  const lines = await readCart();
  const clamped = Math.max(0, Math.min(9, Math.floor(qty)));
  const next =
    clamped === 0
      ? lines.filter((l) => l.productId !== productId)
      : lines.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l));
  await writeCart(next);
  revalidatePath("/cart");
}

/** Remove one line outright. */
export async function removeFromCart(productId: string): Promise<void> {
  const lines = await readCart();
  await writeCart(lines.filter((l) => l.productId !== productId));
  revalidatePath("/cart");
}

/** Clear the whole cart. */
export async function clearCart(): Promise<void> {
  await writeCart([]);
  revalidatePath("/cart");
}

/**
 * Checkout — places one DISPLAY order per vendor group (the multi-vendor
 * rule the M3 wave will formalize: each vendor settles separately). The
 * order lands in the orders cookie (the buyer's own browser trail,
 * honestly stated on the surface); the cart empties.
 */
export async function checkout(): Promise<void> {
  const lines = await readCart();
  if (lines.length === 0) return;
  const joined = lines.flatMap((l) => {
    const product = findStoreProduct(l.productId);
    return product ? [{ product, qty: l.qty }] : [];
  });
  if (joined.length === 0) return;

  // Group per vendor (first-party rows group under «من المنصة»).
  const groups = new Map<string, DisplayOrder>();
  for (const row of joined) {
    const key = row.product.firstParty ? "\u0000platform" : row.product.vendorAr;
    const existing = groups.get(key);
    if (existing) {
      existing.rows = [
        ...existing.rows,
        {
          titleAr: row.product.titleAr,
          qty: row.qty,
          priceMajor: row.product.priceMajor,
        },
      ];
      existing.totalMajor += row.product.priceMajor * row.qty;
    } else {
      groups.set(key, {
        id: `demo-order-${Date.now().toString(36)}-${key.length}`,
        placedAt: new Date().toISOString(),
        state: "PREPARING",
        vendorAr: row.product.vendorAr,
        firstParty: row.product.firstParty,
        rows: [
          {
            titleAr: row.product.titleAr,
            qty: row.qty,
            priceMajor: row.product.priceMajor,
          },
        ],
        totalMajor: row.product.priceMajor * row.qty,
      });
    }
  }

  const existingOrders = await readOrders();
  const nextOrders = [...groups.values(), ...existingOrders].slice(0, 20);
  const jar = await cookies();
  jar.set(ORDERS_COOKIE, encodeOrders(nextOrders), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
  await writeCart([]);
  revalidatePath("/orders");
  revalidatePath("/cart");
  // The official post-action navigation: placing the order lands the
  // buyer on their orders trail — the lifecycle's own single next step.
  redirect("/orders");
}
