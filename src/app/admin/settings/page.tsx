import type { Metadata } from "next";
import Link from "next/link";
import { getSystemSettings } from "@/lib/api/admin";
import {
  REVIEWS_MODE_SETTING_KEY,
  REVIEWS_MODE_SETTING_LABELS,
  type ReviewsModeSetting,
} from "@/lib/api/admin-contract";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import { ReviewsModeForm } from "../forms";

/**
 * لوحة إعدادات المنصة (W0 yelp plan §4.6 — طبقة التحكم): the runtime
 * controls the platform reads without a redeploy. The panel reads the
 * settings table (key, JSON value, description, the who/when
 * bookkeeping) and mounts the owner's reviews-mode switch — the
 * governing key of the whole dual-reviews design (yelp plan §4.1): one
 * PATCH, audited (Envers), broadcast through the cache invalidation
 * relay, live on every replica within the second the W0 acceptance
 * measured.
 *
 * The settings read is the honest full list — a control that does not
 * exist yet reads "absent" (the 404-on-missing-key contract); the
 * reviews.mode row exists (the V84 seed) and its served value is the
 * switch's current state, never a client guess.
 */

export const metadata: Metadata = {
  title: "إعدادات المنصة",
  robots: { index: false },
};

/** The raw JSON value as the backend served it (never recomposed). */
function jsonValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default async function SettingsPanelPage() {
  const settings = await getSystemSettings(0, 50);

  const modeRow = settings.ok
    ? settings.data.content.find((row) => row.key === REVIEWS_MODE_SETTING_KEY)
    : undefined;
  const currentMode: ReviewsModeSetting =
    modeRow && typeof modeRow.value === "string"
      ? (modeRow.value as ReviewsModeSetting)
      : "VERIFIED_ONLY";

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="إعدادات المنصة"
        note={
          <>
            مفاتيح التحكم الحيّة — قراءة وتبديل بلا إعادة نشر. مفتاح
            «reviews.mode» هو مفتاح المراجعات المزدوجة (خطة يلب §4.1): يحدد
            من يستطيع المراجعة وكيف يُجمع المتوسط. التبديل مُدقَّق (Envers)
            ويُبَث لكل النسخ فورًا.
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="mode-switch-heading">
        <h2 id="mode-switch-heading">نمط المراجعات — مفتاح المالك</h2>
        <ReviewsModeForm current={currentMode} />
        {modeRow ? (
          <p className="page-note">
            آخر تحديث {formatDateTime(modeRow.updatedAt)}
            {modeRow.updatedBy ? ` — بواسطة ${modeRow.updatedBy}` : ""}
          </p>
        ) : (
          <p className="page-note" role="status">
            الصف الحاكم غير موجود بعد — قيمة القارئ الافتراضية
            («{REVIEWS_MODE_SETTING_LABELS.VERIFIED_ONLY}») هي الحاكمة حتى أول
            تبديل.
          </p>
        )}
      </section>

      <section className="card hy-adm-section" aria-labelledby="settings-table-heading">
        <h2 id="settings-table-heading">كل المفاتيح</h2>
        {settings.ok ? (
          settings.data.content.length === 0 ? (
            <EmptyState title="لا مفاتيح تحكم مسجّلة" />
          ) : (
            <ul className="feed-list">
              {settings.data.content.map((setting) => (
                <li key={setting.key} className="card post-card">
                  <p className="listing-meta" dir="ltr">
                    <span className="listing-category">{setting.key}</span>
                    <span>·</span>
                    <span className="stat-value">{jsonValue(setting.value)}</span>
                  </p>
                  {setting.description ? (
                    <p className="listing-description">{setting.description}</p>
                  ) : null}
                  <p className="listing-meta">
                    <span>آخر تحديث {formatDateTime(setting.updatedAt)}</span>
                    <span>·</span>
                    <span>الإصدار {new Intl.NumberFormat("ar").format(setting.version)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={settings.problem} status={settings.status} what="مفاتيح التحكم" />
        )}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
