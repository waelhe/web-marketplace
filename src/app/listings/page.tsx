import type { Metadata } from "next";
import Link from "next/link";
import {
  getActiveListings,
  searchListings,
  LISTINGS_PAGE_SIZE,
  type SearchCriteria,
} from "@/lib/api/public";
import { getGeoSuggest, GEO_SUGGEST_MIN_LENGTH, isUuid } from "@/lib/api/geo";
import { problemMessage } from "@/lib/problem";
import { PageHeader } from "@/components/ui/page-header";
import { ListingCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import type { PropertyPurpose, PropertyType } from "@/lib/api/types";

// The filtered browse surface — URL is the state (spec §3: every filter,
// the sort, and the page ride query params, rendered server-side; share /
// back / index). Data arrives through the public data layer directly from
// BACKEND_URL (packaged BFF guide: server components never self-fetch
// through /api/backend). Anonymous GET, no session read: crawlers see the
// same page visitors do.

type ListingsPageProps = PageProps<"/listings">;

type RawParams = Record<string, string | string[] | undefined>;

// Sort forms proven live against production /api/v1/search (Task 6 probe,
// 3 curls, all 200 with a valid PagedResponse envelope):
//   sort=newest | sort=price,desc | sort=price,asc
// The backend declares `area`/`distance` too (VAL-001 vocabulary) but no
// accepted wire form for them was proven within budget — CUT from the
// submittable options (same CUT precedent as the Task-5 newest section).
const ACCEPTED_SORTS = ["newest", "price,asc", "price,desc"] as const;
type AcceptedSort = (typeof ACCEPTED_SORTS)[number];

const SORT_LABELS: Record<AcceptedSort, string> = {
  newest: "الأحدث",
  "price,asc": "السعر: من الأقل إلى الأعلى",
  "price,desc": "السعر: من الأعلى إلى الأقل",
};

const PURPOSES: readonly PropertyPurpose[] = ["RENT", "SALE"];
const PROPERTY_TYPES: readonly PropertyType[] = [
  "APARTMENT",
  "VILLA",
  "LAND",
  "SHOP",
  "OFFICE",
  "GARAGE",
];
const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  LAND: "أرض",
  SHOP: "محل تجاري",
  OFFICE: "مكتب",
  GARAGE: "كراج",
};

// Radius select choices (presentation judgment — the backend accepts any
// radiusKm number; the homepage number input proves it). An arriving value
// outside this set is appended so the round-trip stays lossless.
const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

/** First value of a query param, trimmed (arrays collapse to [0]). */
function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/** R25: absent→0, clamp≥0, 0-based wire (display adds +1). */
function parsePage(raw: string | string[] | undefined): number {
  const value = first(raw);
  if (value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * Sync URL-state read shared by generateMetadata and the page: the raw
 * current params as a plain record (page carried separately, never inside)
 * + the 0-based page. Unknown params are dropped here (never forwarded);
 * empty strings are dropped here (never forwarded — the homepage GET form
 * submits `purpose=`/`propertyType=` for its "الكل" options).
 */
function readUrlState(sp: RawParams): { link: Record<string, string>; page: number } {
  const link: Record<string, string> = {};
  const keep = (key: string, value: string) => {
    if (value !== "") link[key] = value;
  };
  keep("q", first(sp?.q));
  keep("category", first(sp?.category));
  keep("minPrice", first(sp?.minPrice));
  keep("maxPrice", first(sp?.maxPrice));
  keep("checkIn", first(sp?.checkIn));
  keep("checkOut", first(sp?.checkOut));
  keep("guests", first(sp?.guests));
  keep("locationId", first(sp?.locationId));
  keep("purpose", first(sp?.purpose));
  keep("propertyType", first(sp?.propertyType));
  keep("minRooms", first(sp?.minRooms));
  keep("minBathrooms", first(sp?.minBathrooms));
  keep("minAreaM2", first(sp?.minAreaM2));
  keep("lat", first(sp?.lat));
  keep("lng", first(sp?.lng));
  keep("radiusKm", first(sp?.radiusKm));
  keep("sort", first(sp?.sort));
  return { link, page: parsePage(sp?.page) };
}

/** R27: numerics via Number.isFinite, else absent (never 500). */
function finiteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function enumValue<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function acceptedSort(value: string | undefined): AcceptedSort | undefined {
  return value !== undefined && (ACCEPTED_SORTS as readonly string[]).includes(value)
    ? (value as AcceptedSort)
    : undefined;
}

/** href preserving the current URL state minus one filter (page resets). */
function hrefWithout(link: Record<string, string>, remove: string): string {
  const qs = new URLSearchParams(link);
  qs.delete(remove);
  const query = qs.toString();
  return query ? `/listings?${query}` : "/listings";
}

function hrefOf(link: Record<string, string>): string {
  const query = new URLSearchParams(link).toString();
  return query ? `/listings?${query}` : "/listings";
}

export async function generateMetadata({ searchParams }: ListingsPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const { link, page } = readUrlState(sp);
  // Canonical rebuilds from the SANITIZED snapshot only (fix round 1/5):
  // invalid enums / non-finite numbers / unresolved location prose /
  // centerless radius never appear in the canonical. Raw `locationRaw`
  // stays solely in the location input defaultValue (page body below).
  const q = link.q || undefined;
  const category = link.category || undefined;
  const minPrice = finiteNumber(link.minPrice);
  const maxPrice = finiteNumber(link.maxPrice);
  const checkIn = link.checkIn || undefined;
  const checkOut = link.checkOut || undefined;
  const guests = finiteNumber(link.guests);
  const purpose = enumValue(link.purpose, PURPOSES);
  const propertyType = enumValue(link.propertyType, PROPERTY_TYPES);
  const minRooms = finiteNumber(link.minRooms);
  const minBathrooms = finiteNumber(link.minBathrooms);
  const minAreaM2 = finiteNumber(link.minAreaM2);
  const lat = finiteNumber(link.lat);
  const lng = finiteNumber(link.lng);
  const sort = acceptedSort(link.sort);
  const locationRaw = link.locationId ?? "";
  let resolvedLocationId: string | undefined;
  if (locationRaw !== "") {
    if (isUuid(locationRaw)) {
      resolvedLocationId = locationRaw;
    } else if (locationRaw.length >= GEO_SUGGEST_MIN_LENGTH) {
      try {
        const suggest = await getGeoSuggest(locationRaw);
        if (suggest.ok && suggest.data.length > 0) {
          resolvedLocationId = suggest.data[0].id;
        }
      } catch {
        resolvedLocationId = undefined;
      }
    }
  }
  const radiusRaw = finiteNumber(link.radiusKm);
  const radiusKm =
    radiusRaw !== undefined && (resolvedLocationId !== undefined || (lat !== undefined && lng !== undefined))
      ? radiusRaw
      : undefined;
  const canonicalParams: Record<string, string> = {};
  if (q !== undefined) canonicalParams.q = q;
  if (category !== undefined) canonicalParams.category = category;
  if (minPrice !== undefined) canonicalParams.minPrice = String(minPrice);
  if (maxPrice !== undefined) canonicalParams.maxPrice = String(maxPrice);
  if (checkIn !== undefined) canonicalParams.checkIn = checkIn;
  if (checkOut !== undefined) canonicalParams.checkOut = checkOut;
  if (guests !== undefined) canonicalParams.guests = String(guests);
  if (resolvedLocationId !== undefined) canonicalParams.locationId = resolvedLocationId;
  if (purpose !== undefined) canonicalParams.purpose = purpose;
  if (propertyType !== undefined) canonicalParams.propertyType = propertyType;
  if (minRooms !== undefined) canonicalParams.minRooms = String(minRooms);
  if (minBathrooms !== undefined) canonicalParams.minBathrooms = String(minBathrooms);
  if (minAreaM2 !== undefined) canonicalParams.minAreaM2 = String(minAreaM2);
  if (lat !== undefined) canonicalParams.lat = String(lat);
  if (lng !== undefined) canonicalParams.lng = String(lng);
  if (radiusKm !== undefined) canonicalParams.radiusKm = String(radiusKm);
  if (sort !== undefined) canonicalParams.sort = sort;
  if (page > 0) canonicalParams.page = String(page);
  const query = new URLSearchParams(canonicalParams).toString();
  return {
    title: "الإعلانات",
    description: "تصفّح الإعلانات النشطة في السوق — واجهة عامة تصلها محركات البحث",
    alternates: { canonical: query ? `/listings?${query}` : "/listings" },
  };
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const sp = await searchParams;
  const { link, page } = readUrlState(sp);

  // ---- R27 sanitize at the parse boundary (invalid → absent, never 500) ----
  const q = link.q || undefined;
  const category = link.category || undefined;
  const minPrice = finiteNumber(link.minPrice);
  const maxPrice = finiteNumber(link.maxPrice);
  const checkIn = link.checkIn || undefined;
  const checkOut = link.checkOut || undefined;
  const guests = finiteNumber(link.guests);
  const purpose = enumValue(link.purpose, PURPOSES);
  const propertyType = enumValue(link.propertyType, PROPERTY_TYPES);
  const minRooms = finiteNumber(link.minRooms);
  const minBathrooms = finiteNumber(link.minBathrooms);
  const minAreaM2 = finiteNumber(link.minAreaM2);
  const lat = finiteNumber(link.lat);
  const lng = finiteNumber(link.lng);
  const sort = acceptedSort(link.sort);

  // ---- R7+R32 location: UUID direct, else geo-suggest first hit ----
  // The homepage hero submits its free-text location box as `locationId`
  // (a UUID when pasted, prose otherwise) — prose resolves here through
  // the existing geo-suggest channel. No hits / below floor / backend
  // down → the filter is ignored with the text preserved in the field.
  const locationRaw = link.locationId ?? "";
  let resolvedLocationId: string | undefined;
  let resolvedLocationName: string | undefined;
  if (locationRaw !== "") {
    if (isUuid(locationRaw)) {
      resolvedLocationId = locationRaw;
    } else if (locationRaw.length >= GEO_SUGGEST_MIN_LENGTH) {
      // THROW-safe (fix round 1/5): on throw treat as unresolved — ignore
      // the filter, preserve the text, show the existing note; never 500.
      try {
        const suggest = await getGeoSuggest(locationRaw);
        if (suggest.ok && suggest.data.length > 0) {
          resolvedLocationId = suggest.data[0].id;
          resolvedLocationName = suggest.data[0].nameAr;
        }
      } catch {
        resolvedLocationId = undefined;
        resolvedLocationName = undefined;
      }
    }
  }
  const locationUnresolved = locationRaw !== "" && resolvedLocationId === undefined;

  // Radius needs a center (resolved location or an explicit lat+lng pair);
  // a centerless radius is dropped instead of burning a doomed roundtrip.
  const radiusRaw = finiteNumber(link.radiusKm);
  const radiusKm =
    radiusRaw !== undefined && (resolvedLocationId !== undefined || (lat !== undefined && lng !== undefined))
      ? radiusRaw
      : undefined;

  const criteria: SearchCriteria = {};
  if (q !== undefined) criteria.q = q;
  if (category !== undefined) criteria.category = category;
  if (minPrice !== undefined) criteria.minPrice = minPrice;
  if (maxPrice !== undefined) criteria.maxPrice = maxPrice;
  if (checkIn !== undefined) criteria.checkIn = checkIn;
  if (checkOut !== undefined) criteria.checkOut = checkOut;
  if (guests !== undefined) criteria.guests = guests;
  if (resolvedLocationId !== undefined) criteria.locationId = resolvedLocationId;
  if (purpose !== undefined) criteria.purpose = purpose;
  if (propertyType !== undefined) criteria.propertyType = propertyType;
  if (minRooms !== undefined) criteria.minRooms = minRooms;
  if (minBathrooms !== undefined) criteria.minBathrooms = minBathrooms;
  if (minAreaM2 !== undefined) criteria.minAreaM2 = minAreaM2;
  if (lat !== undefined) criteria.lat = lat;
  if (lng !== undefined) criteria.lng = lng;
  if (radiusKm !== undefined) criteria.radiusKm = radiusKm;

  // Sanitized snapshot for canonical + pager hrefs (fix round 1/5): ONLY
  // defined criteria members + the accepted sort. Invalid enums /
  // non-finite numbers / unresolved location prose / dropped centerless
  // radius never appear here. Raw `locationRaw` stays solely in the
  // location input defaultValue above.
  const sanitizedLink: Record<string, string> = {};
  if (q !== undefined) sanitizedLink.q = q;
  if (category !== undefined) sanitizedLink.category = category;
  if (minPrice !== undefined) sanitizedLink.minPrice = String(minPrice);
  if (maxPrice !== undefined) sanitizedLink.maxPrice = String(maxPrice);
  if (checkIn !== undefined) sanitizedLink.checkIn = checkIn;
  if (checkOut !== undefined) sanitizedLink.checkOut = checkOut;
  if (guests !== undefined) sanitizedLink.guests = String(guests);
  if (resolvedLocationId !== undefined) sanitizedLink.locationId = resolvedLocationId;
  if (purpose !== undefined) sanitizedLink.purpose = purpose;
  if (propertyType !== undefined) sanitizedLink.propertyType = propertyType;
  if (minRooms !== undefined) sanitizedLink.minRooms = String(minRooms);
  if (minBathrooms !== undefined) sanitizedLink.minBathrooms = String(minBathrooms);
  if (minAreaM2 !== undefined) sanitizedLink.minAreaM2 = String(minAreaM2);
  if (lat !== undefined) sanitizedLink.lat = String(lat);
  if (lng !== undefined) sanitizedLink.lng = String(lng);
  if (radiusKm !== undefined) sanitizedLink.radiusKm = String(radiusKm);
  if (sort !== undefined) sanitizedLink.sort = sort;

  const filtered = Object.keys(criteria).length > 0 || sort !== undefined;
  const result = filtered
    ? await searchListings(criteria, page, LISTINGS_PAGE_SIZE, sort)
    : await getActiveListings(page, LISTINGS_PAGE_SIZE);

  // Active (backend-bound) filters for chips — individual clear + clear-all.
  const chips: { key: string; label: string; value: string }[] = [];
  if (q !== undefined) chips.push({ key: "q", label: "البحث", value: q });
  if (category !== undefined) chips.push({ key: "category", label: "التصنيف", value: category });
  if (minPrice !== undefined) chips.push({ key: "minPrice", label: "السعر الأدنى", value: link.minPrice });
  if (maxPrice !== undefined) chips.push({ key: "maxPrice", label: "السعر الأقصى", value: link.maxPrice });
  if (checkIn !== undefined) chips.push({ key: "checkIn", label: "الوصول", value: checkIn });
  if (checkOut !== undefined) chips.push({ key: "checkOut", label: "المغادرة", value: checkOut });
  if (guests !== undefined) chips.push({ key: "guests", label: "الضيوف", value: link.guests });
  if (resolvedLocationId !== undefined)
    chips.push({ key: "locationId", label: "الموقع", value: resolvedLocationName ?? locationRaw });
  if (purpose !== undefined) chips.push({ key: "purpose", label: "الغرض", value: purpose });
  if (propertyType !== undefined)
    chips.push({ key: "propertyType", label: "نوع العقار", value: propertyType });
  if (minRooms !== undefined) chips.push({ key: "minRooms", label: "الغرف", value: link.minRooms });
  if (minBathrooms !== undefined)
    chips.push({ key: "minBathrooms", label: "الحمامات", value: link.minBathrooms });
  if (minAreaM2 !== undefined) chips.push({ key: "minAreaM2", label: "المساحة", value: link.minAreaM2 });
  if (lat !== undefined) chips.push({ key: "lat", label: "خط العرض", value: link.lat });
  if (lng !== undefined) chips.push({ key: "lng", label: "خط الطول", value: link.lng });
  if (radiusKm !== undefined) chips.push({ key: "radiusKm", label: "النطاق", value: link.radiusKm });
  if (sort !== undefined) chips.push({ key: "sort", label: "الفرز", value: SORT_LABELS[sort] });

  // Radius select options: the fixed set + an arriving foreign value so a
  // homepage number (or hand URL) never renders a blank select.
  const radiusOptions =
    radiusRaw !== undefined && !RADIUS_OPTIONS.includes(radiusRaw)
      ? [...RADIUS_OPTIONS, radiusRaw]
      : RADIUS_OPTIONS;

  return (
    <main>
      <PageHeader
        title="الإعلانات"
        description="صفِّ النتائج من الشريط الجانبي — كل اختيار في رابط الصفحة"
      />

      {/* Filter sidebar — native GET to /listings (no client JS). Control
          names are the Task-0-verified /api/v1/search contract; no `page`
          control, so every submit restarts at the first page. `category`
          and `lat`/`lng` ride hidden inputs (R8: no invented category
          vocabulary; no lat/lng sidebar controls in the spec) so a submit
          never silently drops arriving state. */}
      <form method="get" action="/listings" role="search" aria-label="تصفية الإعلانات">
        <Field label="البحث">
          <input type="search" name="q" defaultValue={link.q ?? ""} autoComplete="off" />
        </Field>
        <Field label="الغرض">
          <select name="purpose" defaultValue={link.purpose ?? ""}>
            <option value="">الكل</option>
            <option value="RENT">إيجار</option>
            <option value="SALE">بيع</option>
          </select>
        </Field>
        <Field label="نوع العقار">
          <select name="propertyType" defaultValue={link.propertyType ?? ""}>
            <option value="">الكل</option>
            <option value="APARTMENT">{PROPERTY_TYPE_LABELS.APARTMENT}</option>
            <option value="VILLA">{PROPERTY_TYPE_LABELS.VILLA}</option>
            <option value="LAND">{PROPERTY_TYPE_LABELS.LAND}</option>
            <option value="SHOP">{PROPERTY_TYPE_LABELS.SHOP}</option>
            <option value="OFFICE">{PROPERTY_TYPE_LABELS.OFFICE}</option>
            <option value="GARAGE">{PROPERTY_TYPE_LABELS.GARAGE}</option>
          </select>
        </Field>
        <Field label="السعر الأدنى">
          <input type="number" name="minPrice" defaultValue={link.minPrice ?? ""} />
        </Field>
        <Field label="السعر الأقصى">
          <input type="number" name="maxPrice" defaultValue={link.maxPrice ?? ""} />
        </Field>
        <Field label="تاريخ الوصول">
          <input type="date" name="checkIn" defaultValue={link.checkIn ?? ""} />
        </Field>
        <Field label="تاريخ المغادرة">
          <input type="date" name="checkOut" defaultValue={link.checkOut ?? ""} />
        </Field>
        <Field label="عدد الضيوف">
          <input type="number" name="guests" defaultValue={link.guests ?? ""} />
        </Field>
        <Field label="الغرف (أدنى)">
          <input type="number" name="minRooms" defaultValue={link.minRooms ?? ""} />
        </Field>
        <Field label="الحمامات (أدنى)">
          <input type="number" name="minBathrooms" defaultValue={link.minBathrooms ?? ""} />
        </Field>
        <Field label="المساحة م² (أدنى)">
          <input type="number" name="minAreaM2" defaultValue={link.minAreaM2 ?? ""} />
        </Field>
        <Field label="الموقع">
          <input
            type="text"
            name="locationId"
            defaultValue={locationRaw}
            autoComplete="off"
            placeholder="اسم المنطقة أو المعرّف"
          />
        </Field>
        {/* Progressive disclosure: the radius select exists ONLY once a
            location resolved (spec §3) — a centerless radius is dropped. */}
        {resolvedLocationId !== undefined ? (
          <Field label="النطاق كم">
            <select name="radiusKm" defaultValue={radiusKm !== undefined ? link.radiusKm : ""}>
              <option value="">بدون نطاق (الموقع فقط)</option>
              {radiusOptions.map((option) => (
                <option key={option} value={option}>
                  {option} كم
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="الفرز">
          <select name="sort" defaultValue={sort ?? ""}>
            <option value="">الترتيب الافتراضي</option>
            <option value="newest">{SORT_LABELS.newest}</option>
            <option value="price,asc">{SORT_LABELS["price,asc"]}</option>
            <option value="price,desc">{SORT_LABELS["price,desc"]}</option>
          </select>
        </Field>
        {category !== undefined ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
        {lat !== undefined ? <input type="hidden" name="lat" value={link.lat} /> : null}
        {lng !== undefined ? <input type="hidden" name="lng" value={link.lng} /> : null}
        <Button variant="primary" size="md" type="submit">
          ابحث
        </Button>
        {chips.length > 0 ? (
          <Link href="/listings">مسح الكل</Link>
        ) : null}
      </form>

      {/* Active-filter chips (URL-as-state: each chip drops its param and
          restarts at the first page). */}
      {chips.length > 0 ? (
        <ul aria-label="المرشحات النشطة">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                href={hrefWithout(sanitizedLink, chip.key)}
                aria-label={`إزالة مرشح ${chip.label}`}
              >
                {`${chip.label}: ${chip.value} ✕`}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {locationUnresolved ? (
        <p className="page-note" role="status">
          تعذّر تحديد الموقع «{locationRaw}» — تُعرض النتائج بدون فلتر الموقع.
        </p>
      ) : null}

      <section id="results" aria-label="نتائج الإعلانات">
        {result.ok ? (
          result.data.content.length === 0 ? (
            page > 0 && result.data.totalElements > 0 ? (
              <p className="page-note" role="status">
                لا توجد إعلانات في هذه الصفحة.{" "}
                <Link href={hrefOf(sanitizedLink)}>العودة إلى الصفحة الأولى</Link>
              </p>
            ) : filtered ? (
              <EmptyState
                title="لا توجد نتائج مطابقة"
                hint="جرّب تعديل المرشحات أو مسحها"
                action={<Link href="/listings">مسح كل المرشحات</Link>}
              />
            ) : (
              <p className="page-note" role="status">
                لا توجد إعلانات نشطة حالياً.
              </p>
            )
          ) : (
            <>
              <p className="page-note">
                {new Intl.NumberFormat("ar").format(result.data.totalElements)} إعلان —
                الصفحة {new Intl.NumberFormat("ar").format(result.data.pageNumber + 1)} من{" "}
                {new Intl.NumberFormat("ar").format(Math.max(result.data.totalPages, 1))}
              </p>
              <ul className="listing-grid">
                {result.data.content.map((listing) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} />
                  </li>
                ))}
              </ul>
              {/* R24: current params as a plain record + basePath; only
                  `page` swaps, omitted when 0. Numbered links scroll to
                  the top on navigation (Next Link default). */}
              <Pagination
                page={page}
                totalPages={result.data.totalPages}
                basePath="/listings"
                params={sanitizedLink}
              />
            </>
          )
        ) : result.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلانات الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(result.problem, `تعذّر قراءة الإعلانات (رمز ${result.status}).`)}
          </p>
        )}
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
