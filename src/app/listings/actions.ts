"use server";

/**
 * The PUBLIC lead submission action (L34 — roadmap stage 4's consumer
 * contact surface). This is the app's first public write: the backend's
 * own contract permits it without mandatory authentication ("بلا مصادقة
 * إلزامية" — the guest fills name and phone; a valid bearer additionally
 * attributes the lead), so it rides backendSendPublic — the
 * session-optional twin that attaches the bearer only when a session
 * exists and otherwise sends bare (the backend's security chain stays
 * the authority; an invalid presented token still 401s there).
 *
 * Validation mirrors the backend's bean contract exactly (LeadRequest):
 * contactName ≤120 non-blank, contactPhone 7–15 digits with optional
 * leading '+', message ≤2000 non-blank. The backend's rate budget
 * (leadCreate + the daily cap) answers 429 with its own words — surfaced
 * verbatim.
 */

import { problemMessage } from "@/lib/problem";
import { backendSendPublic } from "@/lib/api/server";
import { isUuid } from "@/lib/api/geo";

/** The form state contract for the lead form. */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

/** The backend's own authored bounds (LeadRequest). */
const NAME_MAX = 120;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const MESSAGE_MAX = 2000;

interface LeadResponse {
  id: string;
  listingId: string;
  status: string;
  createdAt: string;
}

export async function submitLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const listingId = formData.get("listingId");
  const contactName = formData.get("contactName");
  const contactPhone = formData.get("contactPhone");
  const message = formData.get("message");

  if (typeof listingId !== "string" || !isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }
  if (
    typeof contactName !== "string" ||
    contactName.trim().length === 0 ||
    contactName.trim().length > NAME_MAX
  ) {
    return { status: "error", message: "الاسم مطلوب (١٢٠ حرفاً كحد أقصى)." };
  }
  if (typeof contactPhone !== "string" || !PHONE_PATTERN.test(contactPhone.trim())) {
    return {
      status: "error",
      message: "رقم الهاتف: ٧–١٥ رقماً، مع '+' اختياري في البداية.",
    };
  }
  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.trim().length > MESSAGE_MAX
  ) {
    return { status: "error", message: "الرسالة مطلوبة (٢٠٠٠ حرف كحد أقصى)." };
  }

  // Attribution is the channel's concern: backendSendPublic attaches the
  // session bearer only when one exists (a valid token attributes the
  // lead; no token takes the anonymous path the contract permits).

  const result = await backendSendPublic<LeadResponse>(
    "POST",
    `/api/v1/listings/${listingId}/leads`,
    {
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      message: message.trim(),
    },
  );
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إرسال طلب التواصل (رمز ${result.status}).`,
      ),
    };
  }

  return {
    status: "success",
    message: "وصل طلبك إلى صاحب الإعلان — سيتواصل معك على رقمك.",
  };
}
