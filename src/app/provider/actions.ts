"use server";

/**
 * Provider server actions — the official mutating-data path (packaged
 * guides: mutating-data + server-actions), the stage-2 pattern verbatim.
 * The framework enforces the boundary (POST-only, Origin/Host CSRF
 * check); every action re-checks the session itself — "render-time
 * gating is not a security boundary, because requests can be sent
 * without going through the UI" — and the backend's resource-server
 * chain remains the authorization authority (the measured 401/403/404
 * gates; ownership lives server-side there).
 *
 * Expected failures come back as ActionState data (the repo's
 * error-handling philosophy: expected errors are handled in code; only
 * bugs crash boundaries). Writes ride backendSend — the direct
 * BACKEND_URL channel, session Bearer included. The backend's own
 * problem+json words (userMessage/detail) surface verbatim so its state
 * machine teaches the provider (e.g. the 409 renewal-path/cooldown
 * messages, the 400 not-verified gate).
 */

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  activateListing,
  archiveListing,
  becomeProvider,
  createListing,
  pauseListing,
  renewListing,
  updateListing,
  upsertProperty,
} from "@/lib/api/provider";
import {
  BUILDING_YEAR_MAX,
  BUILDING_YEAR_MIN,
  CURRENCY_CODE_LENGTH,
  LISTING_CATEGORY_MAX,
  LISTING_TITLE_MAX,
  PROVIDER_ACTOR_TYPES,
  PROVIDER_AGENCY_MAX,
  PROVIDER_BIO_MAX,
  PROVIDER_LICENSE_MAX,
  PROVIDER_NAME_MAX,
  PROPERTY_AMENITY_MAX_COUNT,
  PROPERTY_AMENITY_MAX_LENGTH,
  PROPERTY_PURPOSES,
  PROPERTY_TYPES,
  type ProviderActorType,
} from "@/lib/api/provider-contract";
import { isUuid } from "@/lib/api/geo";

/**
 * The form state contract shared by every provider action form
 * (type-only export — a `use server` module's runtime exports are the
 * async functions alone; forms inline `{ status: "idle" }`).
 */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

/**
 * Parse a positive integer field ("" → null) — the shared shape of the
 * backend's optional positive numeric fields (maxGuests, areaM2, rooms,
 * bathrooms). floorNumber accepts 0 and negatives (basements); that
 * family differs and parses through int().
 */
function positiveInt(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw.length === 0) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

function int(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw.length === 0) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimal(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (raw.length === 0) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The listing form's shared parser: price arrives in MAJOR units (the
 * human-facing input) and converts to the backend's MINOR units
 * (priceCents — BigDecimal.valueOf(cents, 2) is the reverse mapping in
 * ListingMapper, measured). Currency mirrors the backend's own
 * contract: blank = keep stored (update) / house default SAR (create).
 */
function parseListingForm(formData: FormData):
  | {
      ok: true;
      input: {
        title: string;
        description: string | null;
        category: string;
        priceCents: number;
        currency: string | null;
        maxGuests: number | null;
      };
    }
  | { ok: false; message: string } {
  const title = text(formData, "title");
  const description = optionalText(formData, "description");
  const category = text(formData, "category");
  const priceMajor = text(formData, "price");
  const currency = text(formData, "currency");
  const maxGuests = positiveInt(formData, "maxGuests");

  if (title.length === 0 || title.length > LISTING_TITLE_MAX) {
    return { ok: false, message: "العنوان مطلوب (٢٠٠ حرف كحد أقصى)." };
  }
  if (category.length === 0 || category.length > LISTING_CATEGORY_MAX) {
    return { ok: false, message: "الفئة مطلوبة (١٠٠ حرف كحد أقصى)." };
  }
  const price = Number.parseFloat(priceMajor);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "السعر مطلوب ويجب أن يكون رقمًا موجبًا." };
  }
  if (
    currency !== "" &&
    !new RegExp(`^[A-Za-z]{${CURRENCY_CODE_LENGTH}}$`).test(currency)
  ) {
    return {
      ok: false,
      message: "رمز العملة ثلاثة أحرف لاتينية (مثل SAR) — أو اتركه فارغًا.",
    };
  }

  return {
    ok: true,
    input: {
      title,
      description,
      category,
      priceCents: Math.round(price * 100),
      currency: currency === "" ? null : currency.toUpperCase(),
      maxGuests,
    },
  };
}

/**
 * Become a provider — POST /providers (L36 onboarding). On success the
 * created profile card renders from the POST response (the only surface
 * that ever returns this caller's own profile fields — measured gap),
 * so the action refreshes the home page into its dashboard state.
 */
export async function becomeProviderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتصبح مزوّدًا." };
  }

  const displayName = text(formData, "displayName");
  const bio = optionalText(formData, "bio");
  const actorTypeRaw = text(formData, "actorType");
  const agencyName = optionalText(formData, "agencyName");
  const licenseNumber = optionalText(formData, "licenseNumber");

  if (displayName.length === 0 || displayName.length > PROVIDER_NAME_MAX) {
    return { status: "error", message: "الاسم العلني مطلوب (٢٠٠ حرف كحد أقصى)." };
  }
  if (bio !== null && bio.length > PROVIDER_BIO_MAX) {
    return { status: "error", message: "النبذة حتى ١٠٠٠ حرف." };
  }
  if (agencyName !== null && agencyName.length > PROVIDER_AGENCY_MAX) {
    return { status: "error", message: "اسم المكتب حتى ٢٠٠ حرف." };
  }
  if (licenseNumber !== null && licenseNumber.length > PROVIDER_LICENSE_MAX) {
    return { status: "error", message: "رقم الترخيص حتى ١٠٠ حرف." };
  }
  const actorType = PROVIDER_ACTOR_TYPES.includes(actorTypeRaw as ProviderActorType)
    ? (actorTypeRaw as ProviderActorType)
    : null;

  const result = await becomeProvider({
    displayName,
    bio,
    actorType,
    agencyName,
    licenseNumber,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إنشاء ملف المزوّد (رمز ${result.status}).`,
      ),
    };
  }

  // refresh() reruns the server render — the home re-probes and lands in
  // its dashboard state (the created profile rode the POST response on
  // this transition; later visits read the aggregates — declared gap).
  refresh();
  return {
    status: "success",
    message: "أُنشئ ملفك — حالته بانتظار توثيق الإدارة.",
  };
}

/**
 * Create a listing — POST /listings. Born DRAFT; the manage page is the
 * surface that carries activation (the L46 bridge trigger), so success
 * redirects there. The backend owns the VERIFIED gate (400 with its own
 * words — surfaced verbatim).
 */
export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتنشئ إعلانًا." };
  }

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await createListing(parsed.input);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إنشاء الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  redirect(`/provider/listings/${result.data.id}`);
}

/** Update my listing's fields — PUT /listings/{id} (owner-scoped). */
export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = text(formData, "id");
  if (!isUuid(id)) return { status: "error", message: "معرّف الإعلان غير صالح." };

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await updateListing(id, parsed.input);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ التعديلات (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  return { status: "success", message: "حُفظت التعديلات." };
}

/**
 * Activate my listing — POST /listings/{id}/activate, the L46 bridge
 * trigger (ListingActivatedEvent fires inside the activation
 * transaction). The optional explicit date must be strictly future;
 * blank = the configured policy (90 days measured on production).
 */
export async function activateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = text(formData, "id");
  if (!isUuid(id)) return { status: "error", message: "معرّف الإعلان غير صالح." };

  const expiresAtRaw = text(formData, "expiresAt");
  let expiresAt: string | undefined;
  if (expiresAtRaw.length > 0) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { status: "error", message: "تاريخ الانتهاء غير صالح." };
    }
    if (parsed.getTime() <= Date.now()) {
      return { status: "error", message: "تاريخ الانتهاء يجب أن يكون في المستقبل بدقة." };
    }
    expiresAt = parsed.toISOString();
  }

  const result = await activateListing(id, expiresAt);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تنشيط الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  return {
    status: "success",
    message: "نُشّط الإعلان — أصبح ظاهرًا في التصفّح العام.",
  };
}

/** Pause my listing — POST /listings/{id}/pause (MANUAL pause marker). */
export async function pauseListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = text(formData, "id");
  if (!isUuid(id)) return { status: "error", message: "معرّف الإعلان غير صالح." };

  const result = await pauseListing(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إيقاف الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  return { status: "success", message: "أُوقف الإعلان عن العرض العام." };
}

/**
 * Renew my expired listing — POST /listings/{id}/renew (EXPIRED pause
 * only; the backend's 409 words explain the MANUAL/renewal-path and
 * cooldown boundaries — surfaced verbatim).
 */
export async function renewListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = text(formData, "id");
  if (!isUuid(id)) return { status: "error", message: "معرّف الإعلان غير صالح." };

  const result = await renewListing(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تجديد الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  return { status: "success", message: "جُدّد الإعلان بنافذة نشر جديدة." };
}

/**
 * Archive my listing — POST /listings/{id}/archive (permanent soft
 * delete). The archived listing leaves every readable surface, so
 * success redirects back to the provider home.
 */
export async function archiveListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = text(formData, "id");
  if (!isUuid(id)) return { status: "error", message: "معرّف الإعلان غير صالح." };

  const result = await archiveListing(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر أرشفة الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  redirect("/provider");
}

/**
 * Create or replace the listing's property block — PUT
 * /listings/{listingId}/property (L31 full upsert). The location id
 * comes from the geo <select> the server rendered from the public geo
 * channel — never free text; the backend still validates it against
 * the tree (404) as the authority.
 */
export async function upsertPropertyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const purpose = text(formData, "purpose");
  const propertyType = text(formData, "propertyType");
  if (!PROPERTY_PURPOSES.includes(purpose as (typeof PROPERTY_PURPOSES)[number])) {
    return { status: "error", message: "غرض العرض (إيجار/بيع) مطلوب." };
  }
  if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) {
    return { status: "error", message: "نوع العقار مطلوب." };
  }

  const buildingYear = positiveInt(formData, "buildingYear");
  if (
    buildingYear !== null &&
    (buildingYear < BUILDING_YEAR_MIN || buildingYear > BUILDING_YEAR_MAX)
  ) {
    return { status: "error", message: "سنة البناء بين ١٨٠٠ و٢١٠٠." };
  }

  const amenities = text(formData, "amenities")
    .split(/[,،]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (amenities.length > PROPERTY_AMENITY_MAX_COUNT) {
    return { status: "error", message: "المزايا حتى ٢٠ عنصرًا." };
  }
  if (amenities.some((entry) => entry.length > PROPERTY_AMENITY_MAX_LENGTH)) {
    return { status: "error", message: "كل ميزة حتى ٤٠ حرفًا." };
  }

  const availableFrom = optionalText(formData, "availableFrom"); // yyyy-MM-dd
  const locationId = optionalText(formData, "locationId");
  if (locationId !== null && !isUuid(locationId)) {
    return { status: "error", message: "الموقع المختار غير صالح." };
  }

  const latitude = decimal(formData, "latitude");
  const longitude = decimal(formData, "longitude");
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { status: "error", message: "خط العرض بين ‎-90 و‎90." };
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { status: "error", message: "خط الطول بين ‎-180 و‎180." };
  }

  const furnishedRaw = text(formData, "furnished");
  const furnished =
    furnishedRaw === "true" ? true : furnishedRaw === "false" ? false : null;

  const result = await upsertProperty(listingId, {
    purpose: purpose as "RENT" | "SALE",
    propertyType: propertyType as (typeof PROPERTY_TYPES)[number],
    areaM2: positiveInt(formData, "areaM2"),
    rooms: positiveInt(formData, "rooms"),
    bathrooms: positiveInt(formData, "bathrooms"),
    floorNumber: int(formData, "floorNumber"),
    totalFloors: int(formData, "totalFloors"),
    buildingYear,
    furnished,
    amenities,
    availableFrom,
    locationId,
    latitude,
    longitude,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ تفاصيل العقار (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  return { status: "success", message: "حُفظت تفاصيل العقار." };
}
