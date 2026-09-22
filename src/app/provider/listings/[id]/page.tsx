import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatPrice } from "@/lib/format";
import { getListingCompleteness } from "@/lib/api/provider";
import { getListingDetail } from "@/lib/api/public";
import { GEO_ROOT_ID, getGeoChildren, isUuid } from "@/lib/api/geo";
import { listListingMedia } from "@/lib/api/media";
import type { MediaAssetView } from "@/lib/api/provider-contract";
import {
  ActivateListingForm,
  ArchiveListingForm,
  EditListingForm,
  MediaDeleteButton,
  MediaUploadForm,
  PauseListingForm,
  PropertyForm,
  RenewListingForm,
} from "../../forms";

/**
 * إدارة إعلان — the manage surface of the provider path: field editing,
 * the L31 property block (with the geo location picker), the L38
 * completeness checklist and the lifecycle actions whose ACTIVATION is
 * the L46 bridge trigger.
 *
 * The page's data flow IS the backend's measured read model:
 * - the completeness read (provider-owned, any status) doubles as the
 *   ownership probe: 404 unknown, 403 foreign — the honest gates;
 * - the public detail read carries the full fields ONLY while the
 *   listing is ACTIVE (it 404s otherwise) — so the edit form and the
 *   property prefill exist on the published view, and the non-public
 *   view states the measured read gap instead of guessing fields (a
 *   PUT is full-replacement: an empty-prefilled save would wipe them);
 * - the response carries NO status field (measured): the public-read
 *   200/404 is the honest state signal, and the lifecycle buttons let
 *   the backend's own 409 words correct any mismatch (the state
 *   machine's words, surfaced verbatim).
 */
export const metadata: Metadata = {
  title: "إدارة إعلان",
  description: "تعديل إعلانك وتنشيطه",
  robots: { index: false },
};

type ManagePageProps = PageProps<"/provider/listings/[id]">;

/**
 * Build the geo location options (id + Arabic path label) — a walk over
 * the public geo channel from the seeded root, the same measured
 * /children reads the neighborhood picker rides (memoized per request).
 * The tree is administratively small (the seed is a pilot); every node
 * is a valid location per the L31 contract ("must exist in the geo
 * tree"), so the options are the tree itself with full paths.
 */
async function locationOptions(): Promise<{ id: string; label: string }[]> {
  const governorates = await getGeoChildren(GEO_ROOT_ID); // level 1
  if (!governorates.ok) return [];

  const options: { id: string; label: string }[] = [];
  const cityEntries = await Promise.all(
    governorates.data.map(async (governorate) => {
      options.push({ id: governorate.id, label: governorate.nameAr });
      const cities = await getGeoChildren(governorate.id); // level 2
      return { governorate, cities: cities.ok ? cities.data : [] };
    }),
  );

  const hoodEntries = await Promise.all(
    cityEntries.flatMap(({ governorate, cities }) =>
      cities.map(async (city) => {
        options.push({
          id: city.id,
          label: `${governorate.nameAr} — ${city.nameAr}`,
        });
        const hoods = await getGeoChildren(city.id); // level 3
        return { governorate, city, hoods: hoods.ok ? hoods.data : [] };
      }),
    ),
  );

  for (const { governorate, city, hoods } of hoodEntries) {
    for (const hood of hoods) {
      options.push({
        id: hood.id,
        label: `${governorate.nameAr} — ${city.nameAr} — ${hood.nameAr}`,
      });
    }
  }
  return options;
}

export default async function ManageListingPage({ params }: ManagePageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>إدارة إعلان</h1>
        <p className="page-note" role="status">
          إدارة الإعلانات للمزوّدين المسجّلين — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL={`/provider/listings/${id}`} />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  if (!isUuid(id)) {
    return (
      <main>
        <h1>إدارة إعلان</h1>
        <p className="page-note" role="status">
          معرّف الإعلان غير صالح.
        </p>
        <p>
          <Link href="/provider">لوحة المزوّد</Link>
        </p>
      </main>
    );
  }

  // The ownership probe — the only provider-scoped read that works for
  // a listing in ANY status (measured: getOwnedListing has no status
  // filter; 404 unknown, 403 foreign).
  const completeness = await getListingCompleteness(id);
  if (!completeness.ok) {
    if (completeness.status === 403) {
      return (
        <main>
          <h1>إدارة إعلان</h1>
          <p className="page-note" role="status">
            هذا الإعلان ليس لك — لكل مزوّد إعلاناته.
          </p>
          <p>
            <Link href="/provider">لوحة المزوّد</Link>
          </p>
        </main>
      );
    }
    if (completeness.status === 404) {
      return (
        <main>
          <h1>إدارة إعلان</h1>
          <p className="page-note" role="status">
            لا يوجد إعلان بهذا المعرّف (أو غادر كل أسطح القراءة).
          </p>
          <p>
            <Link href="/provider">لوحة المزوّد</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>إدارة إعلان</h1>
        <p className="page-note" role="status">
          {completeness.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                completeness.problem,
                `تعذّر قراءة الإعلان (رمز ${completeness.status}).`,
              )}
        </p>
        <p>
          <Link href="/provider">لوحة المزوّد</Link>
        </p>
      </main>
    );
  }

  // The public read: 200 = published (the full manage view with prefill
  // — this read is itself the L40 view signal, the backend's own
  // contract); 404 = not publicly visible (the honest limited view).
  const detail = await getListingDetail(id);
  const published = detail.ok;

  if (!published) {
    // ── The non-public state: DRAFT / paused (MANUAL or EXPIRED) / ──
    // ── archived — indistinguishable on the measured read model.   ──
    return (
      <main>
        <h1>إدارة إعلان</h1>

        <section className="card">
          <h2>الإعلان غير منشور</h2>
          <p className="page-note">
            {/* The measured read gap, stated honestly: no field-level
                read exists for non-ACTIVE listings (the public surface
                is the only one), so this view shows the score and the
                lifecycle exits — never guessed fields (a PUT is full
                replacement; an empty prefill would wipe them). */}
            الإعلان غير ظاهر في العرض العام (مسودة، أو موقوف يدويًا، أو
            منتهيًا، أو مؤرشفًا) — والقراءة الحقلية متاحة للباك اند على
            المنشور فقط. التنشيط يعيد الحقلين والتعديل إلى هذه الصفحة.
          </p>
          <CompletenessCard completeness={completeness.data} />
        </section>

        <MediaSection listingId={id} />

        <section className="card">
          <h2>دورة النشر</h2>
          <p className="page-note">
            التنشيط هو مخرج المسودة والإيقاف اليدوي (نافذة النشر الافتراضية
            ٩٠ يومًا)، والتجديد مخرج الانتهاء وحده — الباك اند يعلّمك حالتك
            بكلماته عند الاختلاف.
          </p>
          <div className="action-row">
            <ActivateListingForm listingId={id} />
            <RenewListingForm listingId={id} />
            <ArchiveListingForm listingId={id} />
          </div>
        </section>

        <section className="card">
          <h2>تفاصيل العقار (L31)</h2>
          <PropertyForm
            listingId={id}
            property={null}
            locationOptions={await locationOptions()}
            canReadBlock={false}
          />
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

  // ── The published view: full fields, prefill, and the exits. ──
  const listing = detail.data;
  return (
    <main>
      <h1>إدارة إعلان</h1>

      <section className="card">
        <h2>{listing.title}</h2>
        <p className="listing-meta">
          <span className="listing-category">{listing.category}</span>
          <span>·</span>
          <span>{formatPrice(listing.price, listing.currency)}</span>
          {listing.maxGuests !== null ? (
            <>
              <span>·</span>
              <span>
                {new Intl.NumberFormat("ar").format(listing.maxGuests)} ضيوف
              </span>
            </>
          ) : null}
        </p>
        <p className="listing-meta">
          <span>آخر تحديث {formatDate(listing.updatedAt)}</span>
          {listing.expiresAt ? (
            <>
              <span>·</span>
              <span>نافذة النشر تنتهي {formatDate(listing.expiresAt)}</span>
            </>
          ) : null}
        </p>
        <p className="listing-meta">
          <Link href={`/listings/${listing.id}`}>عرضه كما يراه الزوّار</Link>
        </p>
        <div className="action-row">
          <PauseListingForm listingId={listing.id} />
          <ArchiveListingForm listingId={listing.id} />
        </div>
      </section>

      <section className="card">
        <h2>الاكتمال (L38)</h2>
        <CompletenessCard completeness={completeness.data} />
      </section>

      <MediaSection listingId={listing.id} />

      <section className="card">
        <h2>تعديل الحقول</h2>
        <EditListingForm
          listing={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            category: listing.category,
            price: listing.price,
            currency: listing.currency,
            maxGuests: listing.maxGuests,
          }}
        />
      </section>

      <section className="card">
        <h2>تفاصيل العقار (L31)</h2>
        <PropertyForm
          listingId={listing.id}
          property={listing.property}
          locationOptions={await locationOptions()}
          canReadBlock={true}
        />
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

/**
 * The L38 completeness checklist — the score guides, the four flags tell
 * exactly which quarter is missing (the backend's own words). The photo
 * quarter states its measured boundary: the upload surface is a backend
 * media capability behind its own storage configuration.
 */
function CompletenessCard({
  completeness,
}: {
  completeness: {
    percent: number;
    coreFieldsPresent: boolean;
    photosPresent: boolean;
    propertyDetailsPresent: boolean;
    locationPresent: boolean;
  };
}) {
  const quarters: { present: boolean; label: string; note?: string }[] = [
    { present: completeness.coreFieldsPresent, label: "الحقول الأساسية (عنوان/وصف/سعر)" },
    {
      present: completeness.photosPresent,
      label: "صورة واحدة على الأقل (مرفوعة)",
      note: "رفع الصور قدرة وسائط الباك اند خلف تكوين التخزين — سطح لاحق.",
    },
    { present: completeness.propertyDetailsPresent, label: "كتلة التفاصيل العقارية" },
    { present: completeness.locationPresent, label: "الموقع الإداري مربوط" },
  ];
  return (
    <div>
      <p className="listing-meta">
        <span className="stat-value">
          {new Intl.NumberFormat("ar").format(completeness.percent)}٪ اكتمال
        </span>
        <span>·</span>
        <span>يعاد حسابه مع كل قراءة (بلا تخزين ولا كاش — عقد L38)</span>
      </p>
      <ul className="completeness-list">
        {quarters.map((quarter) => (
          <li key={quarter.label} data-present={quarter.present ? "yes" : "no"}>
            <span>{quarter.present ? "✓" : "—"}</span>
            <span>{quarter.label}</span>
            {quarter.note ? (
              <p className="page-note">{quarter.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The photos section (L28/L34, roadmap stage 4) — the fourth completeness
 * quarter's surface. The whole media channel is S3-gated on the backend
 * (requireStorage() on every read and write): when storage is
 * unconfigured the listing's media endpoints answer 503, and this
 * section renders that state honestly with the backend's own words
 * instead of an empty gallery.
 */
async function MediaSection({ listingId }: { listingId: string }) {
  const media = await listListingMedia(listingId);

  return (
    <section className="card" aria-labelledby="media-heading">
      <h2 id="media-heading">صور الإعلان</h2>
      {media.ok ? (
        <>
          {media.data.length === 0 ? (
            <p className="page-note" role="status">
              لا صور بعد — أول صورة ترفع ربع الاكتمال الرابع.
            </p>
          ) : (
            <ul className="media-gallery">
              {media.data.map((asset: MediaAssetView) => (
                <li key={asset.id} className="media-item">
                  {/* Presigned URLs: the storage host is runtime deployment
                      data (not a build-time known origin), so plain <img>
                      — next/image remotePatterns cannot encode it without
                      inventing a host. TTL 15m; the page is dynamic. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbUrl ?? asset.downloadUrl}
                    alt={`صورة ${new Intl.NumberFormat("ar").format(asset.position)} من الإعلان`}
                    loading="lazy"
                  />
                  <p className="listing-meta">
                    <span>{`#${new Intl.NumberFormat("ar").format(asset.position)}`}</span>
                    <span>·</span>
                    <span>
                      {new Intl.NumberFormat("ar").format(asset.sizeBytes)} بايت
                    </span>
                  </p>
                  <MediaDeleteButton mediaId={asset.id} />
                </li>
              ))}
            </ul>
          )}
          <MediaUploadForm listingId={listingId} />
        </>
      ) : media.status === 503 ? (
        // The backend's inert default, stated in its own words — a
        // backend-owner configuration step, not a frontend gap.
        <p className="page-note" role="status">
          {problemMessage(
            media.problem,
            "خدمة وسائط الإعلان غير مهيّأة على الخادم (تخزين S3 غير مربوط) — الرفع يُفعّل عند تهيئة التخزين.",
          )}
        </p>
      ) : (
        <p className="page-note" role="status">
          {media.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(media.problem, `تعذّر قراءة صور الإعلان (رمز ${media.status}).`)}
        </p>
      )}
    </section>
  );
}
