"use client";

/**
 * Provider action forms — the official useActionState pattern (packaged
 * mutating-data guide: form + action + pending + returned state in one
 * round trip), the stage-2 community forms' family. Input bounds mirror
 * the backend's own type gates (defense in depth behind its 400s,
 * never instead of them); the backend remains the authority for every
 * state-machine boundary (VERIFIED gate, renewal path, cooldown…).
 */

import { useActionState } from "react";
import {
  activateListingAction,
  archiveListingAction,
  becomeProviderAction,
  createListingAction,
  deleteMediaAction,
  pauseListingAction,
  renewListingAction,
  replyToReviewAction,
  updateListingAction,
  uploadMediaAction,
  upsertPropertyAction,
} from "./actions";
import type { ActionState } from "./actions";
import {
  ACTOR_TYPE_LABELS,
  BUILDING_YEAR_MAX,
  BUILDING_YEAR_MIN,
  DEFAULT_EXPIRY_DAYS,
  PROVIDER_ACTOR_TYPES,
  PROVIDER_AGENCY_MAX,
  PROVIDER_BIO_MAX,
  PROVIDER_LICENSE_MAX,
  PROVIDER_NAME_MAX,
  PROPERTY_AMENITY_MAX_COUNT,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_PURPOSES,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  MEDIA_ALLOWED_CONTENT_TYPES,
  type ProviderActorType,
} from "@/lib/api/provider-contract";
import type { PropertyBlock } from "@/lib/api/types";

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="page-note" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="page-note" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

/**
 * Become a provider — the L36 onboarding form. displayName is the only
 * required field; the actor classification defaults to INDIVIDUAL (the
 * entity's own honest default) and the persona fields ride creation.
 */
export function BecomeProviderForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    becomeProviderAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="provider-display-name">الاسم العلني</label>
      <input
        id="provider-display-name"
        name="displayName"
        type="text"
        required
        maxLength={PROVIDER_NAME_MAX}
        placeholder="مثال: أحرار للضيافة الساحلية"
      />
      <label htmlFor="provider-bio">نبذة (اختياري)</label>
      <textarea
        id="provider-bio"
        name="bio"
        maxLength={PROVIDER_BIO_MAX}
        rows={3}
        placeholder="عرّف جيرانك بنفسك كمضيف…"
      />
      <label htmlFor="provider-actor-type">الصفة</label>
      <select id="provider-actor-type" name="actorType" defaultValue="INDIVIDUAL">
        {PROVIDER_ACTOR_TYPES.map((type) => (
          <option key={type} value={type}>
            {ACTOR_TYPE_LABELS[type as ProviderActorType]}
          </option>
        ))}
      </select>
      <label htmlFor="provider-agency-name">اسم المكتب (اختياري)</label>
      <input
        id="provider-agency-name"
        name="agencyName"
        type="text"
        maxLength={PROVIDER_AGENCY_MAX}
        placeholder="مثال: عقارات قدسيا برايم"
      />
      <label htmlFor="provider-license-number">رقم الترخيص (اختياري — عرض فقط)</label>
      <input
        id="provider-license-number"
        name="licenseNumber"
        type="text"
        maxLength={PROVIDER_LICENSE_MAX}
        placeholder="مثال: BR-2026-1149"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ إنشاء الملف…" : "أنشئ ملف المزوّد"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Create a listing — the core fields the backend requires (title,
 * category, price in MAJOR units — the backend takes minor units and the
 * action converts; currency optional, blank = the house default SAR).
 */
export function CreateListingForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="listing-title">العنوان</label>
      <input
        id="listing-title"
        name="title"
        type="text"
        required
        maxLength={200}
        placeholder="مثال: شقة ب view بحري في جدة"
      />
      <label htmlFor="listing-description">الوصف (اختياري)</label>
      <textarea
        id="listing-description"
        name="description"
        rows={4}
        placeholder="ضيفان، سرير كينغ، خمس دقائق من الكورنيش…"
      />
      <label htmlFor="listing-category">الفئة</label>
      <input
        id="listing-category"
        name="category"
        type="text"
        required
        maxLength={100}
        list="listing-category-examples"
        placeholder="مثال: stay / إقامة"
      />
      <datalist id="listing-category-examples">
        {/* Hints only — the backend's category is measured free-form
            (varchar(100), no taxonomy); displayed as-is everywhere. */}
        <option value="stay" />
        <option value="إقامة" />
        <option value="خدمة" />
        <option value="عقار" />
      </datalist>
      <label htmlFor="listing-price">السعر الأساسي (وحدات كاملة، لكل ليلة)</label>
      <input
        id="listing-price"
        name="price"
        type="number"
        required
        min="0.01"
        step="0.01"
        inputMode="decimal"
        placeholder="مثال: 350"
      />
      <label htmlFor="listing-currency">رمز العملة (اختياري — الافتراضي SAR)</label>
      <input
        id="listing-currency"
        name="currency"
        type="text"
        maxLength={3}
        pattern="[A-Za-z]{3}"
        placeholder="SAR"
      />
      <label htmlFor="listing-max-guests">أقصى عدد ضيوف (اختياري)</label>
      <input
        id="listing-max-guests"
        name="maxGuests"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        placeholder="مثال: 4"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإنشاء…" : "أنشئ الإعلان (مسودة)"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Edit my listing's fields — prefilled from the public detail read (the
 * only field-level read the backend exposes; it 404s for non-ACTIVE
 * listings, which is why the manage page renders this form only when
 * the listing is publicly visible). Blank currency keeps the stored one
 * (the backend's own update contract).
 */
export function EditListingForm({
  listing,
}: {
  listing: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    price: number;
    currency: string;
    maxGuests: number | null;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="id" value={listing.id} />
      <label htmlFor="edit-title">العنوان</label>
      <input
        id="edit-title"
        name="title"
        type="text"
        required
        maxLength={200}
        defaultValue={listing.title}
      />
      <label htmlFor="edit-description">الوصف</label>
      <textarea
        id="edit-description"
        name="description"
        rows={4}
        defaultValue={listing.description ?? ""}
      />
      <label htmlFor="edit-category">الفئة</label>
      <input
        id="edit-category"
        name="category"
        type="text"
        required
        maxLength={100}
        defaultValue={listing.category}
      />
      <label htmlFor="edit-price">السعر الأساسي (وحدات كاملة)</label>
      <input
        id="edit-price"
        name="price"
        type="number"
        required
        min="0.01"
        step="0.01"
        inputMode="decimal"
        defaultValue={listing.price}
      />
      <label htmlFor="edit-currency">رمز العملة (فارغ = يبقى المخزّن)</label>
      <input
        id="edit-currency"
        name="currency"
        type="text"
        maxLength={3}
        pattern="[A-Za-z]{3}"
        defaultValue={listing.currency}
      />
      <label htmlFor="edit-max-guests">أقصى عدد ضيوف (فارغ = يبقى المخزّن)</label>
      <input
        id="edit-max-guests"
        name="maxGuests"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        defaultValue={listing.maxGuests ?? ""}
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ التعديلات"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** The default activation window label — the measured policy value. */
const DEFAULT_EXPIRY_DAYS_LABEL = `${DEFAULT_EXPIRY_DAYS} يومًا`;

/**
 * Activate my listing — the L46 bridge trigger. The optional explicit
 * end date must be strictly future; blank = the configured expiry
 * policy (measured: 90 days on production).
 */
export function ActivateListingForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    activateListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={listingId} />
      <label htmlFor={`activate-expires-${listingId}`}>
        تاريخ انتهاء النشر (اختياري — الافتراضي {DEFAULT_EXPIRY_DAYS_LABEL})
      </label>
      <input
        id={`activate-expires-${listingId}`}
        name="expiresAt"
        type="datetime-local"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التنشيط…" : "نشّط الإعلان"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Pause (MANUAL marker — re-entry is through activation). */
export function PauseListingForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    pauseListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={listingId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الإيقاف…" : "أوقف العرض"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Renew — works only on the EXPIRED pause; the backend's own 409 words
 * surface verbatim when the state machine disagrees (the honest
 * teacher).
 */
export function RenewListingForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    renewListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={listingId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ التجديد…" : "جدّد الإعلان"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Archive — permanent (the backend's soft delete); redirects home. */
export function ArchiveListingForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    archiveListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={listingId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الأرشفة…" : "أرشِف نهائيًا"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The L31 property block form — a FULL upsert (omitted optional fields
 * mean "undeclared", the block is replaced atomically). The location
 * comes from a server-rendered <select> of geo nodes (options computed
 * from the public geo channel — the backend validates the chosen node
 * against the tree as the authority).
 */
export function PropertyForm({
  listingId,
  property,
  locationOptions,
  canReadBlock,
}: {
  listingId: string;
  /** The embedded block from the public detail read — null = none yet. */
  property: PropertyBlock | null;
  /** The geo tree options rendered by the server (id + path label). */
  locationOptions: { id: string; label: string }[];
  /** False when the listing is not publicly readable — prefill impossible. */
  canReadBlock: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    upsertPropertyAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      {!canReadBlock ? (
        <p className="page-note" role="status">
          {/* The measured read gap: the property GET rides the public
              surface (ACTIVE-only) — for a paused listing the form starts
              empty and saving REPLACES the block (the PUT contract). */}
          تعذّرت قراءة الكتلة الحالية (الإعلان غير منشور) — الحفظ سيستبدلها
          كاملة بعقد PUT.
        </p>
      ) : null}
      <label htmlFor="property-purpose">غرض العرض</label>
      <select
        id="property-purpose"
        name="purpose"
        required
        defaultValue={property?.purpose ?? "RENT"}
      >
        {PROPERTY_PURPOSES.map((purpose) => (
          <option key={purpose} value={purpose}>
            {PROPERTY_PURPOSE_LABELS[purpose]}
          </option>
        ))}
      </select>
      <label htmlFor="property-type">نوع العقار</label>
      <select
        id="property-type"
        name="propertyType"
        required
        defaultValue={property?.propertyType ?? "APARTMENT"}
      >
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {PROPERTY_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <label htmlFor="property-area">المساحة (م²)</label>
      <input
        id="property-area"
        name="areaM2"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        defaultValue={property?.areaM2 ?? ""}
      />
      <label htmlFor="property-rooms">الغرف</label>
      <input
        id="property-rooms"
        name="rooms"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        defaultValue={property?.rooms ?? ""}
      />
      <label htmlFor="property-bathrooms">الحمامات</label>
      <input
        id="property-bathrooms"
        name="bathrooms"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        defaultValue={property?.bathrooms ?? ""}
      />
      <label htmlFor="property-floor">الطابق (٠ = أرضي، سالب = بدروم)</label>
      <input
        id="property-floor"
        name="floorNumber"
        type="number"
        step="1"
        inputMode="numeric"
        defaultValue={property?.floorNumber ?? ""}
      />
      <label htmlFor="property-total-floors">إجمالي طوابق المبنى</label>
      <input
        id="property-total-floors"
        name="totalFloors"
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        defaultValue={property?.totalFloors ?? ""}
      />
      <label htmlFor="property-building-year">
        سنة البناء ({BUILDING_YEAR_MIN}–{BUILDING_YEAR_MAX})
      </label>
      <input
        id="property-building-year"
        name="buildingYear"
        type="number"
        min={BUILDING_YEAR_MIN}
        max={BUILDING_YEAR_MAX}
        step="1"
        inputMode="numeric"
        defaultValue={property?.buildingYear ?? ""}
      />
      <label htmlFor="property-furnished">الفرش</label>
      <select
        id="property-furnished"
        name="furnished"
        defaultValue={
          property?.furnished === true ? "true" : property?.furnished === false ? "false" : ""
        }
      >
        <option value="">غير محدّد</option>
        <option value="true">مفروش</option>
        <option value="false">غير مفروش</option>
      </select>
      <label htmlFor="property-amenities">
        المزايا (حتى {PROPERTY_AMENITY_MAX_COUNT}، افصل بفواصل)
      </label>
      <input
        id="property-amenities"
        name="amenities"
        type="text"
        placeholder="مصعد، موقف سيارات، شرفة"
        defaultValue={property?.amenities?.join("، ") ?? ""}
      />
      <label htmlFor="property-available-from">متاح ابتداءً من (تاريخ)</label>
      <input
        id="property-available-from"
        name="availableFrom"
        type="date"
        defaultValue={property?.availableFrom ?? ""}
      />
      <label htmlFor="property-location">الموقع الإداري (شجرة المناطق)</label>
      <select
        id="property-location"
        name="locationId"
        defaultValue={property?.locationId ?? ""}
      >
        <option value="">بدون موقع مربوط</option>
        {locationOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor="property-latitude">خط العرض (اختياري — عرض فقط)</label>
      <input
        id="property-latitude"
        name="latitude"
        type="number"
        min="-90"
        max="90"
        step="any"
        inputMode="decimal"
        defaultValue={property?.latitude ?? ""}
      />
      <label htmlFor="property-longitude">خط الطول (اختياري — عرض فقط)</label>
      <input
        id="property-longitude"
        name="longitude"
        type="number"
        min="-180"
        max="180"
        step="any"
        inputMode="decimal"
        defaultValue={property?.longitude ?? ""}
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ تفاصيل العقار"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The photo upload form (L28/L34, roadmap stage 4) — a plain form whose
 * FormData carries the File to the Server Action (the official file
 * upload path through Server Actions; the action's channel does the
 * declare → PUT → confirm chain server-side). The client pre-check
 * mirrors the backend's allowlist and size cap for a zero-roundtrip
 * reject with the same words; the backend stays the authority.
 */
export function MediaUploadForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    uploadMediaAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor="media-file">صورة من جهازك</label>
      <input
        id="media-file"
        name="file"
        type="file"
        accept={MEDIA_ALLOWED_CONTENT_TYPES.join(",")}
        required
      />
      <p className="field-hint">
        JPEG أو PNG أو WebP أو GIF — حتى ١٠ ميغابايت. تظهر الصورة في الإعلان بعد
        اعتمادها على الخادم.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الرفع…" : "ارفع الصورة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Delete one photo — a per-asset small form (the deletePost pattern). */
export function MediaDeleteButton({ mediaId }: { mediaId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteMediaAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="mediaId" value={mediaId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "…" : "احذف"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * Reply to one review (roadmap stage 5 — السمعة): the L21 two-way
 * review surface, one public reply per review, rendered only on
 * reviews with no reply yet (the backend's entity rejects a second —
 * its own words teach the boundary). The client mirror is the blank
 * gate alone (ReplyRequest is @NotBlank, no authored maximum).
 */
export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    replyToReviewAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="reviewId" value={reviewId} />
      <label htmlFor={`reply-${reviewId}`}>ردّك العلني على المراجعة</label>
      <textarea
        id={`reply-${reviewId}`}
        name="reply"
        rows={3}
        required
        placeholder="شكرًا لك — نعمل على تحسين ما ذكرت."
      />
      <p className="field-hint">
        رد واحد علني لكل مراجعة — يظهر على صفحتك العامة مع المراجعة نفسها.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "انشر الرد"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
