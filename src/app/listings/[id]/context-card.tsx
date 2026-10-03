import Link from "next/link";
import { searchListings } from "@/lib/api/public";
import type { ListingDetail } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import {
  DISPLAY_ESTIMATE_QUDSAYYA,
  DISPLAY_INSIGHTS_QUDSAYYA,
  MARKET_TREND_LINE_QUDSAYYA,
  NEARBY_INSTITUTIONS_QUDSAYYA,
  estimateHeadline,
  estimateRangeLine,
  propertyDisplayEnabled,
} from "@/lib/vision-property";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";

/**
 * بطاقة السياق — the full-vision spec §5.6's heart («قلب إعادة التصور»):
 * any entity screen composes the platform's accumulated context AROUND it.
 *
 * THE COMPOSITION (one card, honest per block — the spec's own rule
 * «كل كتلة صادقة الفراغ عند غياب البيانات»):
 * - Nearby businesses + providers: the REAL served radius read
 *   (`GET /search?lat&lng&radiusKm`, W3 ratings ride ListingSummary) —
 *   anonymous, crawler-par, exactly the page's own read discipline.
 * - Neighborhood pulse / institutions / market trend / estimate /
 *   insights: display blocks (K1/E1/E2 backend waves pending), each
 *   carrying the «بيانات عرض» badge + its computation date (the spec's
 *   own honesty rule for dated aggregates).
 *
 * The backend follow-plan's K1 wave replaces the display blocks with ONE
 * composed read (`GET /properties/{id}/context`) — the card's props stay,
 * the data source swaps in place.
 */

/** The radius block's own size + walk scope (the spec's «نطاق المشي»). */
const NEARBY_RADIUS_KM = 3;
const NEARBY_SIZE = 6;

export async function ContextCard({ listing }: { listing: ListingDetail }) {
  const property = listing.property;
  const hasCoords =
    property !== null &&
    typeof property.latitude === "number" &&
    typeof property.longitude === "number";

  // The REAL radius read — only when the property block carries coords.
  // Expected failures are data (never crash the page); zero rows is an
  // honest empty block, not a gap to decorate.
  const nearby = hasCoords
    ? await searchListings(
        {
          lat: property!.latitude!,
          lng: property!.longitude!,
          radiusKm: NEARBY_RADIUS_KM,
        },
        0,
        NEARBY_SIZE,
      )
    : null;

  const display = propertyDisplayEnabled();

  return (
    <section className="card" aria-labelledby="context-heading">
      <h2 id="context-heading">بطاقة السياق — ما حول هذا العقار</h2>
      <p className="page-note">
        الأعمال والخدمات والمؤسسات في نطاق المشي، ونبض الحي واتجاه سوقه — كل
        ما يحيط بالإعلان قبل قرارك.
      </p>

      {/* ── Nearby businesses & providers (REAL radius read) ── */}
      <div>
        <h3>أعمال ومزوّدو خدمة في نطاق {NEARBY_RADIUS_KM} كم</h3>
        {nearby === null ? (
          <p className="page-note" role="status">
            هذا الإعلان بلا إحداثيات مسجّلة — لا يمكن قياس ما حوله بعد.
          </p>
        ) : !nearby.ok ? (
          <p className="page-note" role="status">
            تعذّرت قراءة ما حول العقار من الخادم حالياً.
          </p>
        ) : nearby.data.content.length === 0 ? (
          <p className="page-note" role="status">
            لا إعلانات نشطة حول هذا العقار ضمن النطاق حتى الآن.
          </p>
        ) : (
          <ul className="context-nearby">
            {nearby.data.content.map((row) => (
              <li key={row.id} className="context-nearby-row">
                <Link href={`/listings/${row.id}`}>{row.title}</Link>
                <span className="context-nearby-meta">
                  <Badge tone="muted">{row.category}</Badge>
                  {row.providerRating !== null && row.providerReviewCount > 0 ? (
                    <span>
                      {new Intl.NumberFormat("ar-u-nu-latn", {
                        maximumFractionDigits: 1,
                      }).format(row.providerRating)}{" "}
                      من ٥ ({new Intl.NumberFormat("ar").format(row.providerReviewCount)} تقييمًا)
                    </span>
                  ) : (
                    <span>مزوّد بلا تقييمات بعد</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {display ? (
        <>
          {/* ── Nearby institutions (display, G-wave pending) ── */}
          <div>
            <h3>
              مؤسسات قريبة <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
            </h3>
            <ul className="context-institutions">
              {NEARBY_INSTITUTIONS_QUDSAYYA.map((inst) => (
                <li key={inst.id}>
                  <span className="context-inst-kind">{inst.kindAr}</span>
                  <span>{inst.nameAr}</span>
                  <span className="context-inst-walk">
                    {inst.walkMinutes} دقائق مشيًا
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Neighborhood pulse (display) ── */}
          <div>
            <h3>
              نبض الحي <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
            </h3>
            <p className="page-note">
              الحي نشط: فعاليات وتجمّعات أسبوعية، مجموعات جيران تعمل، وسوق
              حراج يدور — تفاصيلها في جناح «حيّنا» لبعد تسجيل العضوية.
            </p>
          </div>

          {/* ── Safety (display) ── */}
          <div>
            <h3>
              السلامة <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
            </h3>
            <p className="page-note">
              «مربع 4 - واحة الأمان»: تنبيهات الجيران تعمل والباب يُغفل
              مبكرًا — سجل عضوية الحي لتصلك تنبيهات الأمان الحية.
            </p>
          </div>

          {/* ── Market trends + insights (display, E1 pending) ── */}
          <div>
            <h3>
              رؤى الحي واتجاه السوق <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
            </h3>
            <p className="page-note">{MARKET_TREND_LINE_QUDSAYYA}</p>
            <ul className="context-insights">
              {DISPLAY_INSIGHTS_QUDSAYYA.map((insight) => (
                <li key={insight.id}>
                  <span className="context-insight-label">{insight.labelAr}</span>
                  <span className="context-insight-value">{insight.valueAr}</span>
                  <span className="context-insight-date">
                    حُسب في {insight.computedAt}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── The estimate (display, E2 pending — «تقدير» framing) ── */}
          <div className="context-estimate">
            <h3>
              <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
            </h3>
            <p className="context-estimate-headline">
              {estimateHeadline(DISPLAY_ESTIMATE_QUDSAYYA)}
            </p>
            <p className="page-note">{estimateRangeLine(DISPLAY_ESTIMATE_QUDSAYYA)}</p>
            <p className="page-note">{DISPLAY_ESTIMATE_QUDSAYYA.methodAr}</p>
            <p className="page-note">
              حُسب في {DISPLAY_ESTIMATE_QUDSAYYA.computedAt} — ليس سعرًا
              معلنًا ولا تقييمًا رسميًا.
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
