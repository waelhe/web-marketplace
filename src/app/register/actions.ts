"use server";

/**
 * The PUBLIC account-registration action (product charter §4, journey J1 —
 * "رحلة الانضمام", slice S1). The backend's register surface went live in
 * the plan-2.6 wave (measured 2026-09-28, staging + production): POST
 * /api/v1/auth/register {email ≤50, password 8–72, displayName? ≤100}
 * answers 201 {id, email, displayName, createdAt, updatedAt} / 400 / 409
 * CONFLICT-001 — the app's second public write, so it rides
 * backendSendPublic exactly like the L34 lead (the session-optional
 * channel: the bearer attaches only when a session exists; the backend's
 * security chain stays the authority).
 *
 * Field bounds below mirror the backend's own RegisterRequest bean so the
 * HTML validation, the action checks, and the contract speak one language
 * (the lead-form convention). The 409 case is the one measured spot where
 * the backend's `userMessage` is generic for the actual condition
 * ("The resource changed while you were working on it…" on a duplicate
 * email — wording debt recorded in the charter §5 for the backend team),
 * so this action authors the accurate Arabic words the backend's own
 * `detail` ("An account already exists for this email") carries; every
 * other problem still surfaces verbatim through problemMessage.
 */

import { backendSendPublic } from "@/lib/api/server";
import { problemMessage } from "@/lib/problem";

/** The form state contract for the registration form (bookings family). */
export type RegisterActionState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "displayName" | "email" | "password" }
  | { status: "success"; message: string };

/** The backend's own authored bounds (RegisterRequest, measured live). */
const EMAIL_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const DISPLAY_NAME_MAX = 100;

/** Deliberately permissive (HTML type=email is the first gate; the
 *  backend's 400 is the last) — mirrors the lead-form phone check. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The response body the backend answers 201 with (measured, staging). */
interface RegisterResponse {
  id: string;
  email: string;
  displayName: string | null;
}

export async function registerAction(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const displayNameRaw = formData.get("displayName");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  // displayName is optional — trim; only its bound is enforced.
  const displayName =
    typeof displayNameRaw === "string" ? displayNameRaw.trim() : "";
  if (displayName.length > DISPLAY_NAME_MAX) {
    return {
      status: "error",
      field: "displayName",
      message: `الاسم الظاهر: ١٠٠ حرف كحد أقصى (الآن ${displayName.length}).`,
    };
  }

  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (email.length === 0) {
    return { status: "error", field: "email", message: "البريد الإلكتروني مطلوب." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      field: "email",
      message: "أدخل بريداً إلكترونياً صحيحاً (مثل name@example.com).",
    };
  }
  if (email.length > EMAIL_MAX) {
    return {
      status: "error",
      field: "email",
      message: "البريد الإلكتروني: ٥٠ حرفاً كحد أقصى.",
    };
  }

  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return {
      status: "error",
      field: "password",
      message: "كلمة المرور: ٨–٧٢ حرفاً.",
    };
  }

  const result = await backendSendPublic<RegisterResponse>(
    "POST",
    "/api/v1/auth/register",
    {
      email,
      password,
      ...(displayName.length > 0 ? { displayName } : {}),
    },
  );
  if (!result.ok) {
    // The measured 409 duplicate case: the backend's userMessage is
    // generic for it (charter §5 wording debt) while its detail carries
    // the true condition — author the accurate Arabic here, verbatim
    // problemMessage for everything else.
    if (result.status === 409 || result.problem?.errorCode === "CONFLICT-001") {
      return {
        status: "error",
        field: "email",
        message:
          "هذا البريد مسجّل لدينا بالفعل — سجّل الدخول أو استخدم بريداً آخر.",
      };
    }
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إنشاء الحساب (رمز ${result.status}).`,
      ),
    };
  }

  return {
    status: "success",
    message:
      "أُنشئ حسابك. سجّل الدخول الآن بالبريد وكلمة المرور نفسها لتفعيل جلستك.",
  };
}
