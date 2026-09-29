import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { getMyMembership } from "@/lib/api/community";
import { neighborhoodDemoEnabled } from "@/lib/neighborhood-product";
import {
  DEMO_CHARTER,
  DEMO_INCIDENTS,
  DEMO_LOST_FOUND,
  DEMO_ZONES,
  LOST_FOUND_STATUS_LABELS,
  ZONE_STATUS_LABELS,
  ownerCount,
  parseZoneLabel,
  zoneLegendRow,
  type ZoneStatus,
} from "@/lib/neighborhood-design";

/**
 * تنبيهات الأمان والمفقودات — the safety screen (slice S10, screen ④
 * of the owner-supplied design spec 2026-09-29). The design's own
 * anatomy: the zone map (the six blocks with their live statuses —
 * the clickable filter), the legend, the safety incidents feed with
 * the neighbors' confirmations, and the lost&found board with its
 * FOUND / STILL_LOST states.
 *
 * All rows are display rows («بيانات عرض», demo ids, never links —
 * discipline rules 1–5, src/lib/neighborhood-design.ts). The zone
 * filter rides a REAL server-side read (?zone= مربع N); the
 * incidents and lost&found entries carry honest gated contact
 * affordances (no contact contract exists yet). `noindex`.
 */
export const metadata: Metadata = {
  title: "تنبيهات الأمان — حيّنا",
  description: "خريطة مربعات الحي، تنبيهات الأمان، ولوحة المفقودات",
  robots: { index: false },
};

type SafetyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LEGEND_STATUSES: readonly ZoneStatus[] = ["SAFE", "NOTICE", "WORKS"];

export default async function SafetyPage({ searchParams }: SafetyPageProps) {
  const sp = await searchParams;
  const zone = parseZoneLabel(sp?.zone);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>تنبيهات الأمان</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood/safety" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const membership = await getMyMembership();
  if (!membership.ok) {
    if (membership.status === 404) {
      return (
        <main>
          <h1>تنبيهات الأمان</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح تنبيهات الأمان.
          </p>
          <p>
            <Link className="button" data-variant="primary" href="/neighborhoods">
              اختر حارتك
            </Link>
          </p>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>تنبيهات الأمان</h1>
        <p className="page-note" role="status">
          {membership.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                membership.problem,
                `تعذّر قراءة عضويتك (رمز ${membership.status}).`,
              )}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const demoOn = neighborhoodDemoEnabled();
  const zones = demoOn ? DEMO_ZONES : [];
  const incidents = demoOn
    ? DEMO_INCIDENTS.filter((incident) => zone === null || incident.zone === zone)
    : [];
  const lostFound = demoOn ? DEMO_LOST_FOUND : [];
  const charter = demoOn ? DEMO_CHARTER[0] ?? null : null;

  return (
    <main>
      {/* THE PAGE HERO — the safety screen's own banner. */}
      <section className="hy-page-hero" aria-labelledby="safety-title">
        <div className="hy-page-hero-id">
          <span className="hy-market-icon" aria-hidden="true" style={{ background: "color-mix(in srgb, var(--hy-tertiary) 12%, transparent)", color: "var(--hy-tertiary)" }}>
            <span className="material-symbols-outlined">shield</span>
          </span>
          <div>
            <h1 id="safety-title" className="hy-page-title">
              خريطة الحي وتنبيهات الأمان
            </h1>
            <p className="hy-page-sub">
              حالة مربعات الحي لحظة بلحظة — تنبيهات مؤكدة من الجيران ولوحة المفقودات
            </p>
          </div>
        </div>
        {zone ? (
          <span className="hy-pill" data-active="true" title="تصفية سارية — انقر «كل المربعات» للإلغاء">
            <span className="material-symbols-outlined" aria-hidden="true">filter_alt</span>
            {zone}
          </span>
        ) : null}
      </section>

      {/* THE ZONE MAP — the six blocks with their live statuses. Each
          block is a REAL server-side filter link (?zone= مربع N). */}
      {zones.length > 0 ? (
        <section className="hy-card" aria-labelledby="map-heading">
          <div className="hy-screen-head">
            <h2 id="map-heading" className="hy-screen-title">
              <span className="material-symbols-outlined" aria-hidden="true">map</span>
              مربعات الحي
            </h2>
            <span className="hy-badge-demo">بيانات عرض</span>
          </div>
          <div className="hy-map-grid">
            {zones.map((z) => (
              <Link
                key={z.id}
                href={zone === z.label ? "/neighborhood/safety" : `/neighborhood/safety?zone=${encodeURIComponent(z.label)}`}
                className="hy-zone"
                data-status={z.status}
                data-active={zone === z.label || undefined}
                aria-label={`${z.label} — ${z.name}: ${ZONE_STATUS_LABELS[z.status]}`}
              >
                <span className="hy-zone-label">{z.label}</span>
                <span className="hy-zone-name">{z.name}</span>
                <span className="hy-zone-note">
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                    {z.status === "SAFE" ? "check_circle" : z.status === "WORKS" ? "construction" : "warning"}
                  </span>
                  {z.note}
                </span>
                {z.mine ? <span className="hy-zone-mine">مربعي</span> : null}
              </Link>
            ))}
          </div>
          <div className="hy-map-legend">
            {LEGEND_STATUSES.map((status) => (
              <span key={status} className="hy-map-legend-row">
                <span className="hy-legend-dot" data-status={status} aria-hidden="true" />
                {zoneLegendRow(status).label} — {zoneLegendRow(status).note}
              </span>
            ))}
            {zone ? (
              <Link href="/neighborhood/safety" className="hy-btn hy-btn-soft">
                <span className="material-symbols-outlined" aria-hidden="true">layers_clear</span>
                كل المربعات
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="hy-cols">
        <div className="hy-col">
          {/* THE INCIDENTS — the safety alerts feed. */}
          {incidents.length > 0 || zone ? (
            <section className="hy-section" aria-labelledby="incidents-heading">
              <div className="hy-screen-head">
                <h2 id="incidents-heading" className="hy-screen-title">
                  <span className="material-symbols-outlined" aria-hidden="true">notifications_active</span>
                  تنبيهات الأمان
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              {incidents.length > 0 ? (
                <ul className="hy-incident-list">
                  {incidents.map((incident) => (
                    <li key={incident.id} className="hy-incident">
                      <header className="hy-incident-head">
                        <span className="hy-incident-kind">
                          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.875rem" }}>
                            {incident.icon}
                          </span>
                          {incident.kind}
                        </span>
                        <span className="hy-incident-zone-chip">{incident.zone}</span>
                        <span className="hy-incident-meta">{incident.when}</span>
                      </header>
                      <h3 className="hy-incident-title">{incident.title}</h3>
                      <p className="hy-incident-body">{incident.body}</p>
                      <footer className="hy-incident-foot">
                        <span className="hy-incident-confirmed">
                          <span className="material-symbols-outlined" aria-hidden="true">thumb_up</span>
                          {ownerCount(incident.confirmed)} جارًا أكّد الملاحظة
                        </span>
                        <button
                          type="button"
                          className="hy-btn hy-btn-tonal-tertiary"
                          disabled
                          title="قريبًا — تأكيد التنبيه بانتظار عقد التفاعلات لدى الباك اند"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                          أكّد الملاحظة
                        </button>
                      </footer>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hy-empty" role="status">
                  لا تنبيهات مفتوحة في {zone} — المربع مستقر.
                </p>
              )}
            </section>
          ) : null}

          {/* THE LOST&FOUND BOARD. */}
          {lostFound.length > 0 ? (
            <section className="hy-section" aria-labelledby="lostfound-heading">
              <div className="hy-screen-head">
                <h2 id="lostfound-heading" className="hy-screen-title">
                  <span className="material-symbols-outlined" aria-hidden="true">search</span>
                  لوحة المفقودات
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <ul className="hy-lostfound-list">
                {lostFound.map((entry) => (
                  <li key={entry.id} className="hy-lostfound">
                    <div className="hy-lostfound-thumb" role="img" aria-label={entry.title}>
                      <span className="material-symbols-outlined" style={{ fontSize: "2.5rem" }}>
                        {entry.icon}
                      </span>
                    </div>
                    <div className="hy-col">
                      <span className="hy-lostfound-status" data-status={entry.status}>
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                          {entry.status === "FOUND" ? "check_circle" : "search"}
                        </span>
                        {LOST_FOUND_STATUS_LABELS[entry.status]}
                      </span>
                      <h3 className="hy-lostfound-title">{entry.title}</h3>
                      <p className="hy-lostfound-body">{entry.body}</p>
                      <span className="hy-lostfound-where">
                        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                          location_on
                        </span>
                        {entry.where} • {entry.when}
                      </span>
                      <footer className="hy-incident-foot">
                        <span className="hy-incident-confirmed">
                          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                          {ownerCount(entry.support)} {entry.supportLabel}
                        </span>
                        <button
                          type="button"
                          className="hy-btn hy-btn-primary"
                          disabled
                          title="قريبًا — التواصل بخصوص المفقودات بانتظار عقد التفاعلات"
                        >
                          <span className="material-symbols-outlined">call</span>
                          {entry.contactLabel}
                        </button>
                      </footer>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="hy-col">
          {/* الإرشادات — the charter's own safety rules. */}
          {charter ? (
            <section className="hy-card" aria-labelledby="rules-heading">
              <h2 id="rules-heading" className="hy-widget-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  privacy_tip
                </span>
                إرشادات الأمان السكني
              </h2>
              <ul className="hy-market-rules">
                {charter.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* The pinned alert bridge — the feed's featured zone. */}
          <section className="hy-card" aria-labelledby="alert-bridge-heading">
            <h2 id="alert-bridge-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                campaign
              </span>
              التنبيه المثبت
            </h2>
            <p className="hy-screen-sub">
              أخبار البنية التحتية والأعمال الميدانية تُثبّت أعلى خلاصة الحي مع خريطة المسار
              وتوجيهات الحركة.
            </p>
            <Link className="hy-btn hy-btn-primary" href="/neighborhood">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              اقرأ التنبيه في الخلاصة
            </Link>
          </section>
        </div>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
