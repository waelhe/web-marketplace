import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  cartGrandTotal,
  cartLinesWithProducts,
  groupCartByVendor,
  readCart,
  storePriceLine,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { checkout, clearCart, removeFromCart, setCartQty } from "../store/actions";

/**
 * سلّة المشتريات — the full-vision spec §5.2: the multi-vendor cart.
 * Each vendor settles separately (the M3 wave's order-per-vendor rule,
 * shaped here); first-party rows group under «من المنصة» with their own
 * badge. The cart is REAL cookie state; the product world is display
 * (the badge rides the page).
 *
 * Quantity forms + remove forms are plain server-action forms (progressive
 * enhancement — the house pattern).
 */

type CartPageProps = PageProps<"/cart">;

export const metadata: Metadata = {
  title: "سلّة المشتريات",
  robots: { index: false },
};

export default async function CartPage(_: CartPageProps) {
  const lines = await readCart();
  const joined = cartLinesWithProducts(lines);
  const groups = groupCartByVendor(joined);
  const total = cartGrandTotal(joined);

  return (
    <main>
      <PageHeader
        title="سلّة المشتريات"
        actions={
          joined.length > 0 ? (
            <form action={clearCart}>
              <button type="submit" className="button">
                أفرغ السلة
              </button>
            </form>
          ) : null
        }
      />
      <p className="page-note">
        سلة واحدة متعددة البائعين — كل بائع يُسوّى على حدة عند الإتمام.{" "}
        <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
      </p>

      {joined.length === 0 ? (
        <EmptyState
          title="سلتك فارغة"
          hint="تصفّح المتجر وأضف ما يعجبك — السلة تبقى في متصفحك تسعين يومًا."
        />
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.vendorAr} className="card" aria-label={`سلة ${g.vendorAr}`}>
              <h2>
                {g.firstParty ? (
                  <>
                    <Badge tone="featured">من المنصة</Badge>
                  </>
                ) : (
                  g.vendorAr
                )}
                <span className="page-note"> — {storePriceLine(g.totalMajor)}</span>
              </h2>
              <ul className="cart-lines">
                {g.rows.map(({ product, qty }) => (
                  <li key={product.id} className="cart-line">
                    <div className="cart-line-main">
                      <Link href={`/store/${product.id}`}>{product.titleAr}</Link>
                      <p className="page-note">{storePriceLine(product.priceMajor)} للواحدة</p>
                    </div>
                    <div className="cart-line-controls">
                      <form action={setCartQty.bind(null, product.id, qty - 1)}>
                        <button type="submit" className="button" aria-label={`قلّل كمية ${product.titleAr}`}>
                          −
                        </button>
                      </form>
                      <span aria-live="polite">{qty}</span>
                      <form action={setCartQty.bind(null, product.id, Math.min(9, qty + 1))}>
                        <button type="submit" className="button" aria-label={`زد كمية ${product.titleAr}`}>
                          +
                        </button>
                      </form>
                      <form action={removeFromCart.bind(null, product.id)}>
                        <button type="submit" className="button" aria-label={`أزل ${product.titleAr} من السلة`}>
                          أزل
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="card" aria-labelledby="checkout-heading">
            <h2 id="checkout-heading">إتمام الطلب</h2>
            <p className="store-price store-price-lg">الإجمالي: {storePriceLine(total)}</p>
            <p className="page-note">
              الإتمام يضع طلبًا لكل بائع بحالة «قيد التحضير» — التسوية يدوية مع
              البائع (بوابة الدفع قرار مالك معلّق)، وسجل طلباتك يبقى في متصفحك
              حتى تُشدّ الطلبات إلى حسابك في موجة العقود القادمة.
            </p>
            <form action={checkout}>
              <button type="submit" className="button" data-variant="primary">
                أتمّ الطلب
              </button>
            </form>
          </section>
        </>
      )}

      <p>
        <Link href="/store">تابع التسوّق</Link>
      </p>
    </main>
  );
}
