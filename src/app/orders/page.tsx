import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  ORDER_STATE_LABELS,
  readOrders,
  storePriceLine,
  type DisplayOrder,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { formatDateTime } from "@/lib/format";

/**
 * طلباتي — the full-vision spec §5.2's buyer surface: the order
 * lifecycle with honest states (قيد التحضير → قيد الشحن → تم التسليم →
 * تم الاستلام). The order trail is the buyer's own browser cookie
 * (display discipline — the M3/M5 waves anchor orders to accounts);
 * the state vocabulary is the backend wave's own future contract,
 * rendered here exactly.
 */

type OrdersPageProps = PageProps<"/orders">;

export const metadata: Metadata = {
  title: "طلباتي",
  robots: { index: false },
};

/** The state chip's honest tone mapping (PREPARING/SHIPPED in flight,
 * DELIVERED/RECEIVED done — the badge family's own semantics). */
function stateTone(state: DisplayOrder["state"]): "muted" | "new" | "active" {
  if (state === "PREPARING") return "muted";
  if (state === "SHIPPED") return "new";
  return "active";
}

export default async function OrdersPage(_: OrdersPageProps) {
  const orders = await readOrders();

  return (
    <main>
      <PageHeader title="طلباتي" />
      <p className="page-note">
        دورة حياة كل طلب بحالاتها الصادقة — التسوية يدوية مع البائع حتى تُفتح
        بوابة الدفع. <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
      </p>

      {orders.length === 0 ? (
        <EmptyState
          title="لا طلبات بعد"
          hint="أتمّ طلبًا من السلة وسيظهر هنا بحالته الكاملة."
        />
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id} className="card order-card">
              <div className="order-head">
                <h2>
                  {o.firstParty ? <Badge tone="featured">من المنصة</Badge> : o.vendorAr}
                </h2>
                <Badge tone={stateTone(o.state)}>{ORDER_STATE_LABELS[o.state]}</Badge>
              </div>
              <p className="page-note">وُضع في {formatDateTime(o.placedAt)}</p>
              <ul className="order-rows">
                {o.rows.map((r) => (
                  <li key={r.titleAr}>
                    <span>
                      {r.titleAr} × {r.qty}
                    </span>
                    <span className="page-note">{storePriceLine(r.priceMajor * r.qty)}</span>
                  </li>
                ))}
              </ul>
              <p className="store-price">{storePriceLine(o.totalMajor)}</p>
              <p className="page-note">
                {o.state === "RECEIVED"
                  ? "اكتمل الطلب — تقييم البائع يُفتح هنا عند توفر عقده (موجة M5)."
                  : "حالة الطلب تتبعها هنا حتى الاستلام."}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/store">المتجر</Link>
      </p>
    </main>
  );
}
