import { Badge } from "@/components/ui/badge";
import {
  BACKGROUND_BADGE_PENDING,
  BACKGROUND_BADGE_VERIFIED,
  BOOKING_MODES,
  SERVICE_PACKAGES,
  packageTotalLine,
  servicesDisplayEnabled,
} from "@/lib/vision-services";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";

/**
 * The Wyzant layer on the provider's public page (the full-vision spec
 * §5.5): three blocks over the served provider core —
 *
 * 1. The BOOKING-MODE PAIRING (T1): instant book beside quote-request —
 *    the leads channel is REAL and served (the L34 lane); the pairing
 *    states the two modes explicitly as the spec demands.
 * 2. The SERVICE PACKAGES (T2 — display, badged): N-session bundles
 *    with progress + lesson material, pending the backend contract.
 * 3. The BACKGROUND-CHECK BADGE (T3 — display): the verification
 *    lifecycle reused with a distinct document kind, pending.
 */
export function VisionServicesBlock({ providerName }: { providerName: string }) {
  const on = servicesDisplayEnabled();
  if (!on) return null;

  return (
    <>
      <h2>طريقتا الحجز</h2>
      <div className="booking-modes">
        <div className="booking-mode">
          <strong>{BOOKING_MODES.instant.labelAr}</strong>
          <span className="page-note">{BOOKING_MODES.instant.hintAr}</span>
          <span className="page-note">
            من إعلانات {providerName} النشطة أدناه — باب «اطلب الحجز» في الإعلان
            نفسه.
          </span>
        </div>
        <div className="booking-mode">
          <strong>{BOOKING_MODES.quote.labelAr}</strong>
          <span className="page-note">{BOOKING_MODES.quote.hintAr}</span>
          <span className="page-note">
            من نموذج «تواصل مع صاحب الإعلان» في الإعلان — يصل المزوّد في صندوقه
            ويردّ بعرض.
          </span>
        </div>
      </div>

      <h2>
        حزم الجلسات <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
      </h2>
      <p className="page-note">
        حزم بجلسات محسوبة تتقدم مع كل جلسة — عقد الحزم (T2) لدى الباك اند
        يفتح شراءها الحقيقي.
      </p>
      <ul className="service-packages">
        {SERVICE_PACKAGES.map((p) => (
          <li key={p.id} className="service-package">
            <strong>{p.titleAr}</strong>
            <span>{packageTotalLine(p)}</span>
            <span className="page-note">{p.promiseAr}</span>
            <span className="page-note">مادة الجلسة: {p.materialAr}</span>
          </li>
        ))}
      </ul>

      <h2>
        توثيق الخلفية <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge>
      </h2>
      <p className="page-note">
        {BACKGROUND_BADGE_VERIFIED.labelAr} — {BACKGROUND_BADGE_VERIFIED.noteAr}
      </p>
      <p className="page-note" role="status">
        حالة المزوّدين بلا وثيقة بعد: «{BACKGROUND_BADGE_PENDING.labelAr}» — يظهر
        الشعار عند إقرار الإدارة (دورة توثيق V78 معادة الاستخدام).
      </p>
    </>
  );
}
