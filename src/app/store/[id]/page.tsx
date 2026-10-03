import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  findStoreProduct,
  storePriceLine,
  vendorLine,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { AddToCartForm } from "../add-to-cart-form";

/**
 * صفحة المنتج — the full-vision spec §5.2's product card: gallery plate,
 * price, vendor line with rating, the Q&A block, and the fulfillment
 * promise. The product world is display data (badged on the page); the
 * cart write is REAL (the official cookie contract).
 *
 * The `demo-` prefix is the route's own parse boundary: an id without
 * it answers the store's honest 404 — a stale URL can never fake a
 * backend UUID read.
 */

type ProductPageProps = PageProps<"/store/[id]">;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = id.startsWith("demo-") ? findStoreProduct(id) : null;
  if (!product) return { title: "منتج غير موجود", robots: { index: false } };
  return {
    title: `${product.titleAr} — المتجر`,
    description: product.summaryAr,
    alternates: { canonical: `/store/${product.id}` },
  };
}

/** The display Q&A world (the M2 wave's real contract pending). */
const PRODUCT_QA: ReadonlyArray<{ q: string; a: string; author: string }> = [
  {
    q: "هل الضمان من البائع أم من المتجر؟",
    a: "ضمان البائع نفسه سنة كاملة — والمتجر يتوسط إن تعذّر الرد خلال أسبوع.",
    author: "فريق المتجر",
  },
  {
    q: "هل يمكن الاستلام من الحي بدل الشحن؟",
    a: "نعم — اختر «استلام من البائع» في ملاحظات الطلب وسينسّق البائع معك.",
    author: "فريق المتجر",
  },
  {
    q: "ما سياسة الإرجاع؟",
    a: "خلال سبعة أيام من الاستلام بحالة المنتج نفسها — تفاصيل أكثر عند الطلب.",
    author: "فريق المتجر",
  },
];

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = id.startsWith("demo-") ? findStoreProduct(id) : null;
  if (!product) notFound();

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/store">المتجر</Link> / <span>{product.titleAr}</span>
      </p>
      <PageHeader title={product.titleAr} actions={<Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>} />

      <section className="card" aria-label="بيانات المنتج">
        <div className="store-plate store-plate-lg" aria-hidden="true">
          <span className="material-symbols-outlined">{product.symbol}</span>
        </div>
        <p className="store-price store-price-lg">{storePriceLine(product.priceMajor)}</p>
        <p className="listing-meta">
          <Badge tone={product.firstParty ? "featured" : "muted"}>
            {product.firstParty ? "من المنصة" : product.vendorAr}
          </Badge>
        </p>
        <p className="page-note">{vendorLine(product)}</p>
        <p className="listing-description">{product.summaryAr}</p>
        <p className="page-note">
          {product.inStock
            ? `الوصول خلال ${product.shipDays === 1 ? "يوم واحد" : `${product.shipDays} أيام`} من تأكيد الطلب`
            : "غير متوفر حاليًا — راجع لاحقًا"}
        </p>
        <AddToCartForm productId={product.id} inStock={product.inStock} />
        <p className="page-note">
          الدفع عند الاستلام أو التسوية اليدوية مع البائع — بوابة الدفع
          الإلكتروني قرار مالك معلّق (قناة Stripe).
        </p>
      </section>

      {/* The Q&A block — display rows (M2's real contract pending). */}
      <section className="card" aria-labelledby="qa-heading">
        <h2 id="qa-heading">أسئلة وأجوبة ({product.qaCount})</h2>
        {product.qaCount === 0 ? (
          <p className="page-note" role="status">
            لا أسئلة على هذا المنتج بعد — كن أول السائلين عند توفر باب
            الأسئلة الحقيقي.
          </p>
        ) : (
          <ul className="store-qa">
            {PRODUCT_QA.slice(0, product.qaCount).map((row) => (
              <li key={row.q}>
                <p className="store-qa-q">{row.q}</p>
                <p className="store-qa-a">{row.a}</p>
                <p className="page-note">— {row.author}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>
        <Link href="/store">كل المنتجات</Link>
      </p>
    </main>
  );
}
