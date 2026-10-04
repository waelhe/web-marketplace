import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findStoreProduct,
  storePriceLine,
  vendorLine,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { SuqAddToCart } from "../suq-add-to-cart";

/**
 * صفحة المنتج — the full-vision spec §5.2's product card, restyled on
 * the attached design's token layer (.suq): plate, price, vendor line
 * with rating, the Q&A block, and the fulfillment promise. The product
 * world is display data (badged on the page); the cart write is REAL
 * (the official cookie contract — the design's round add button).
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
    title: `${product.titleAr} — سوق الحي`,
    description: product.summaryAr,
    alternates: { canonical: `/store/${product.id}` },
  };
}

/** The display Q&A world (the M2 wave's real contract pending). */
const PRODUCT_QA: ReadonlyArray<{ q: string; a: string; author: string }> = [
  {
    q: "هل الضمان من البائع أم من المتجر؟",
    a: "ضمان البائع نفسه — والمتجر يتوسط إن تعذّر الرد خلال أسبوع.",
    author: "فريق المتجر",
  },
  {
    q: "هل يمكن الاستلام من الحي بدل التوصيل؟",
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
    <main className="suq-page">
      <p className="suq-crumb">
        <Link href="/store">سوق الحي</Link>
        <span className="material-symbols-outlined" aria-hidden="true">
          chevron_left
        </span>
        <span>{product.titleAr}</span>
        {product.badgeAr ? <span className="suq-section-chip">{product.badgeAr}</span> : null}
      </p>

      <section className="suq-detail" aria-label="بيانات المنتج">
        <span className="suq-detail-plate" aria-hidden="true">
          <span className="material-symbols-outlined">{product.symbol}</span>
        </span>
        <h1 className="suq-detail-title">
          {product.titleAr}
          <span className="suq-display-badge">{DISPLAY_BADGE_LABEL}</span>
        </h1>
        <p className="suq-detail-price">{storePriceLine(product.priceMajor)}</p>
        <p className="suq-section-sub">{vendorLine(product)}</p>
        <p className="suq-detail-body">{product.summaryAr}</p>
        <p className="suq-section-sub">
          {product.inStock
            ? `الوصول خلال ${product.shipDays === 1 ? "يوم واحد" : `${product.shipDays} أيام`} من تأكيد الطلب`
            : "غير متوفر حاليًا — راجع لاحقًا"}
        </p>
        <div className="suq-detail-buy">
          <SuqAddToCart productId={product.id} inStock={product.inStock} />
          <span className="suq-section-sub">
            الدفع عند الاستلام أو التسوية اليدوية — بوابة الدفع الإلكتروني قرار مالك معلّق.
          </span>
        </div>
      </section>

      {/* The Q&A block — display rows (M2's real contract pending). */}
      <section className="suq-detail" aria-labelledby="qa-heading">
        <h2 className="suq-section-title" id="qa-heading">
          أسئلة وأجوبة ({new Intl.NumberFormat("ar-SA").format(product.qaCount)})
        </h2>
        {product.qaCount === 0 ? (
          <p className="suq-section-sub" role="status">
            لا أسئلة على هذا المنتج بعد — كن أول السائلين عند توفر باب الأسئلة الحقيقي.
          </p>
        ) : (
          <ul className="suq-qa">
            {PRODUCT_QA.slice(0, product.qaCount).map((row) => (
              <li key={row.q}>
                <p className="suq-qa-q">{row.q}</p>
                <p className="suq-qa-a">{row.a}</p>
                <p className="suq-qa-author">— {row.author}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>
        <Link className="suq-seeall" href="/store">
          كل المنتجات
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>
      </p>
    </main>
  );
}
