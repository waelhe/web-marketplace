import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { getMyAdCampaigns, getAdCampaignCharges } from "@/lib/api/ads";
import {
  AD_CAMPAIGN_STATUS_LABELS,
  type AdCampaignStatus,
} from "@/lib/api/ads-contract";
import { getMyBackendUser } from "@/lib/api/inbox";
import { getProviderListings } from "@/lib/api/public";
import { CreateCampaignForm, PauseCampaignForm, ResumeCampaignForm } from "./forms";

/**
 * حملاتي الإعلانية — W5 (yelp-level plan §5/G24-G26, #496): the
 * provider's own paid-promotion money surface. Every read and write is
 * the backend's own contract (measured live 2026-10-03,
 * download/n13-ads-live-proof.txt): the campaigns list carries the frozen
 * money state (consumed is always exactly the sum of the frozen charge
 * rows), the create/pause/resume gates answer with their own words, and
 * the charges are INSERT-ONLY windows frozen by the daily 04:45 UTC job
 * — an honest empty list until the first freeze, never a bug claim.
 *
 * The paid tier's mechanics, stated honestly on the page: a live
 * campaign with remaining budget puts its listing in the ordered
 * results' promoted tier (derived at query time — never stored on the
 * listing); the budget runs the campaign dry on its own; the pause is
 * the owner's hold and the paused gap never bills.
 *
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "حملاتي الإعلانية",
  description: "ترويج إعلاناتك المدفوع — الميزانيات والفوترة والنوافذ المجمّدة",
  robots: { index: false },
};

type ProviderAdsPageProps = PageProps<"/provider/ads">;

export default async function ProviderAdsPage(_props: ProviderAdsPageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>حملاتي الإعلانية</h1>
        <p className="page-note" role="status">
          الحملات الإعلانية للمزوّدين المسجّلين — سجّل الدخول لعرضها.
        </p>
        <SignInButton callbackURL="/provider/ads" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The funnel probe (the ledger page's own seam): the campaigns read's
  // 404 IS the no-profile state machine input.
  const campaigns = await getMyAdCampaigns();
  if (campaigns.status === 404) {
    return (
      <main>
        <h1>حملاتي الإعلانية</h1>
        <p className="page-note" role="status">
          لا ملف مزوّد لحسابك بعد — الترويج المدفوع يُفتح بإنشاء الملف من لوحة
          المزوّد.
        </p>
        <p>
          <Link className="button" data-variant="primary" href="/provider">
            إلى لوحة المزوّد
          </Link>
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The picker's own read: MY public ACTIVE inventory. The MEASURED
  // lesson of this wave's live round (2026-10-03): the id-keyed public
  // reads take the BACKEND user UUID — the Better-Auth session id
  // (gzaocdnH…) answers "Failed to convert 'providerId'" — so the
  // picker resolves the id through the backend's own /me projection
  // (the profile page's documented me-chain), never a guessed
  // session-id↔users.id mapping.
  const me = await getMyBackendUser();
  const inventory = me.ok ? await getProviderListings(me.id, 0, 20) : null;
  const pickable =
    inventory?.ok ?
      inventory.data.content.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: formatPrice(listing.price, listing.currency),
      }))
    : [];

  const rows = campaigns.ok ? campaigns.data : [];
  // The charges ride parallel reads (one per campaign — the surfaces are
  // small by the single-promotion law's own economics).
  const chargesPerCampaign = await Promise.all(
    rows.map((campaign) => getAdCampaignCharges(campaign.id)),
  );
  const titleById = new Map(pickable.map((row) => [row.id, row.title]));

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/provider">لوحة المزوّد</Link> / <span>حملاتي الإعلانية</span>
      </p>
      <h1>حملاتي الإعلانية</h1>
      <p className="page-note">
        الحملة الواحدة تروّج إعلانًا واحدًا بميزانية واحدة: تُحسب النقرات والظهورات
        بأسعارها، ويتوقف الترويج لحظة نفاد الميزانية. الإيقاف بيدك — وأيام الإيقاف
        لا تُفوَّت أبدًا. تُجمَّد الفوترة يوميًا 04:45 UTC في نوافذ غير قابلة
        للتعديل.
      </p>

      <section className="card" aria-labelledby="ad-create-heading">
        <h2 id="ad-create-heading">ابدأ ترويجًا مدفوعًا</h2>
        {!me.ok ? (
          <p className="page-note" role="status">
            جلستك مع الباك اند منتهية — سجّل الدخول من جديد لقراءة إعلاناتك النشطة.
          </p>
        ) : inventory?.ok ? (
          <CreateCampaignForm listings={pickable} />
        ) : (
          <p className="page-note" role="status">
            {inventory == null ? (
              "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            ) : (
              problemMessage(
                inventory.problem,
                `تعذّرت قراءة إعلاناتك النشطة (رمز ${inventory.status}).`,
              )
            )}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="ad-board-heading">
        <h2 id="ad-board-heading">الحملات</h2>
        {!campaigns.ok ? (
          <p className="page-note" role="status">
            {campaigns.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  campaigns.problem,
                  `تعذّرت قراءة حملاتك (رمز ${campaigns.status}).`,
                )}
          </p>
        ) : rows.length === 0 ? (
          <p className="page-note" role="status">
            لم تروّج بعد — انطلق بحملتك الأولى من النموذج أعلاه وسيظهر إعلانك في
            مقدمة نتائج التصفّح.
          </p>
        ) : (
          <ul className="feed-list">
            {rows.map((campaign, index) => {
              const charges = chargesPerCampaign[index];
              const statusLabel =
                AD_CAMPAIGN_STATUS_LABELS[campaign.status as AdCampaignStatus] ??
                campaign.status;
              return (
                <li key={campaign.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="stat-value">{statusLabel}</span>
                    <span>·</span>
                    <Link href={`/listings/${campaign.listingId}`}>
                      {titleById.get(campaign.listingId) ?? campaign.listingId}
                    </Link>
                    <span>·</span>
                    <span>{formatDateTime(campaign.createdAt)}</span>
                  </p>
                  <ul className="stat-list">
                    <li className="stat-row">
                      <span>الميزانية</span>
                      <span className="stat-value">
                        {formatPrice(campaign.budgetCents / 100, campaign.currency)}
                      </span>
                    </li>
                    <li className="stat-row">
                      <span>المُستهلك المجمّد</span>
                      <span className="stat-value">
                        {formatPrice(campaign.consumedCents / 100, campaign.currency)}
                      </span>
                    </li>
                    <li className="stat-row">
                      <span>المتبقي</span>
                      <span className="stat-value">
                        {formatPrice(campaign.remainingCents / 100, campaign.currency)}
                      </span>
                    </li>
                    <li className="stat-row">
                      <span>سعر النقرة / الظهور</span>
                      <span className="stat-value">
                        {formatPrice(campaign.clickPriceCents / 100, campaign.currency)} /{" "}
                        {formatPrice(campaign.impressionPriceCents / 100, campaign.currency)}
                      </span>
                    </li>
                    {campaign.endsAt ? (
                      <li className="stat-row">
                        <span>ينتهي</span>
                        <span className="stat-value">{formatDateTime(campaign.endsAt)}</span>
                      </li>
                    ) : null}
                    <li className="stat-row">
                      <span>آخر نافذة فوترة</span>
                      <span className="stat-value">{formatDate(campaign.billedThrough)}</span>
                    </li>
                  </ul>
                  {campaign.status === "ACTIVE" ? (
                    <PauseCampaignForm campaignId={campaign.id} />
                  ) : campaign.status === "PAUSED" ? (
                    <ResumeCampaignForm campaignId={campaign.id} />
                  ) : null}
                  <details className="review-edit-details">
                    <summary className="link-like">سجل الفوترة المجمّدة</summary>
                    {charges.ok ? (
                      charges.data.length === 0 ? (
                        <p className="page-note" role="status">
                          لا نوافذ مجمّدة بعد — أول تجميد يومي عند 04:45 UTC.
                        </p>
                      ) : (
                        <ul className="feed-list">
                          {charges.data.map((charge) => (
                            <li key={charge.windowStart} className="card post-card">
                              <p className="listing-meta">
                                <span className="stat-value">
                                  {formatPrice(charge.amountCents / 100, charge.currency)}
                                </span>
                                <span>·</span>
                                <span>
                                  {formatDate(charge.windowStart)} ←{" "}
                                  {formatDate(charge.windowEnd)}
                                </span>
                                <span>·</span>
                                <span>
                                  {new Intl.NumberFormat("ar").format(charge.clicks)} نقرة ·{" "}
                                  {new Intl.NumberFormat("ar").format(charge.impressions)} ظهور
                                </span>
                              </p>
                              <p className="page-note">
                                جُمّدت {formatDateTime(charge.frozenAt)} — سجل غير قابل
                                للتعديل.
                              </p>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      <p className="page-note" role="status">
                        {charges.unauthenticated
                          ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
                          : problemMessage(
                              charges.problem,
                              `تعذّرت قراءة سجل الفوترة (رمز ${charges.status}).`,
                            )}
                      </p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p>
        <Link href="/provider">لوحة المزوّد</Link>
      </p>
      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
