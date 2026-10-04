import Link from "next/link";
import {
  cartGrandTotal,
  cartLinesWithProducts,
  groupCartByVendor,
  readCart,
  storePriceLine,
} from "@/lib/vision-store";

/**
 * شريط السلة الموحد — the attached design's fixed cart bar, carried by
 * the REAL cart state (the official cookie read, server-rendered fresh
 * on every navigation and revalidated after every add by the action
 * itself). An empty cart renders NOTHING (the design's demo state shows
 * two items; ours never fakes a count).
 *
 * The design's two-mode tabs (store cart / unified neighborhood cart)
 * are deliberately absent: the one real cart IS multi-vendor
 * (groupCartByVendor) and no second mode is served — the spec §2.5 rule.
 */

/** The honest item grammar for the summary line. */
function itemsLine(count: number): string {
  if (count === 1) return "عنصر واحد";
  if (count === 2) return "عنصران";
  if (count >= 3 && count <= 10) return `${new Intl.NumberFormat("ar-SA").format(count)} عناصر`;
  return `${new Intl.NumberFormat("ar-SA").format(count)} عنصرًا`;
}

/** The vendor-count chip: «متجر واحد» / «متجران» / «N متاجر». */
function vendorsLine(count: number): string {
  if (count <= 1) return "متجر واحد";
  if (count === 2) return "متجران";
  return `${new Intl.NumberFormat("ar-SA").format(count)} متاجر`;
}

export async function CartBar() {
  const lines = await readCart();
  const joined = cartLinesWithProducts(lines);
  if (joined.length === 0) return null; // honest: no cart, no bar

  const count = joined.reduce((sum, r) => sum + r.qty, 0);
  const total = cartGrandTotal(joined);
  const vendorCount = groupCartByVendor(joined).length;

  return (
    <aside className="suq-cartbar" aria-label="سلة المتجر">
      <div className="suq-cartbar-inner">
        <div className="suq-cartbar-info">
          <span className="suq-cartbar-bag" aria-hidden="true">
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="suq-cartbar-count">{new Intl.NumberFormat("ar-SA").format(count)}</span>
          </span>
          <span className="suq-cartbar-text">
            <span className="suq-cartbar-title">
              سلة المتجر
              <span className="suq-cartbar-store">{vendorsLine(vendorCount)}</span>
            </span>
            <span className="suq-cartbar-summary">
              {itemsLine(count)} — الإجمالي: {storePriceLine(total)}
            </span>
          </span>
        </div>
        <Link className="suq-cartbar-cta" href="/cart">
          متابعة الطلب
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>
      </div>
    </aside>
  );
}
