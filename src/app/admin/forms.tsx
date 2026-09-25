"use client";

/**
 * Administration-console action forms (the batch-3 spec), the repo's
 * verbatim useActionState family (provider/forms.tsx). Input bounds
 * mirror the backend's own gates — the resolve action's vocabulary
 * parses before any service call, the pricing-rule bounds are the
 * backend's Bean Validation (name ≤200, category ≤100, fractions 0..1)
 * — the backend remains the authority; its problem+json words surface
 * verbatim in the action state (the measured honest-failure pattern).
 */

import { useActionState } from "react";
import {
  confirmPaymentIntentAction,
  createGeoLocationAction,
  createPricingRuleAction,
  creditProviderAction,
  deleteGeoLocationAction,
  deletePricingRuleAction,
  refundPaymentAction,
  renameGeoLocationAction,
  resolveDisputeAction,
  resolveReportAction,
  setListingPromotionAction,
  setPricingRuleActiveAction,
  archiveListingAction,
  suspendProviderAction,
  updateUserRoleAction,
  updateUserStatusAction,
  pseudonymizeUserAction,
  purgeUserAuditHistoryAction,
  purgeUserContentAction,
  verifyProviderAction,
  type ActionState,
} from "./actions";
import {
  GEO_SLUG_PATTERN,
  MAX_RESOLUTION_NOTE_LENGTH,
  MODERATION_ACTIONS,
  MODERATION_ACTION_LABELS,
  RULE_CATEGORY_MAX_LENGTH,
  RULE_NAME_MAX_LENGTH,
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LABELS,
} from "@/lib/api/admin-contract";
import {
  DISPUTE_RESOLUTION_LABELS,
  type DisputeResolution,
} from "@/lib/api/disputes-contract";

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
 * Resolve one open report — the moderation command. The action select
 * carries the backend's own two-value vocabulary with Arabic labels;
 * the note is optional within the backend's 2000-character bound.
 */
export function ResolveReportForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resolveReportAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="reportId" value={reportId} />
      <label htmlFor={`resolve-action-${reportId}`}>إجراء التسوية</label>
      <select id={`resolve-action-${reportId}`} name="action" required>
        {MODERATION_ACTIONS.map((value) => (
          <option key={value} value={value}>
            {MODERATION_ACTION_LABELS[value]}
          </option>
        ))}
      </select>
      <label htmlFor={`resolve-note-${reportId}`}>ملاحظة إدارية (اختيارية)</label>
      <input
        id={`resolve-note-${reportId}`}
        name="note"
        type="text"
        maxLength={MAX_RESOLUTION_NOTE_LENGTH}
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التسوية…" : "احسم البلاغ"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Create one pricing rule — the backend's own Bean Validation bounds. */
export function PricingRuleCreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPricingRuleAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="rule-name">اسم القاعدة</label>
      <input
        id="rule-name"
        name="name"
        type="text"
        required
        maxLength={RULE_NAME_MAX_LENGTH}
      />
      <label htmlFor="rule-category">الفئة (اختياري)</label>
      <input
        id="rule-category"
        name="category"
        type="text"
        maxLength={RULE_CATEGORY_MAX_LENGTH}
      />
      <label htmlFor="rule-tax-rate">نسبة الضريبة (اختياري — 0 إلى 1)</label>
      <input
        id="rule-tax-rate"
        name="taxRate"
        type="number"
        min={0}
        max={1}
        step={0.0001}
        inputMode="decimal"
      />
      <label htmlFor="rule-discount-pct">نسبة الخصم (اختياري — 0 إلى 1)</label>
      <input
        id="rule-discount-pct"
        name="discountPct"
        type="number"
        min={0}
        max={1}
        step={0.0001}
        inputMode="decimal"
      />
      <p className="field-hint">
        الكسور بين ٠ و١ شاملين — مثال: 0.15 يعني ١٥٪. الحدود حراسة الخلفي
        نفسها وكلماته تُعرض حرفياً.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإنشاء…" : "أنشئ القاعدة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Flip one rule's active switch — the activate/deactivate pair. */
export function RuleActiveButton({
  ruleId,
  active,
}: {
  ruleId: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setPricingRuleActiveAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="ruleId" value={ruleId} />
      <input type="hidden" name="activate" value={active ? "false" : "true"} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "…" : active ? "عطّل" : "فعّل"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/** Delete one rule — DELETE (204). */
export function RuleDeleteButton({ ruleId }: { ruleId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deletePricingRuleAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="ruleId" value={ruleId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "…" : "احذف"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * Confirm one payment intent — the intent id (copyable from the list
 * rows) + the PSP's external id (required by the backend's own
 * ConfirmIntentRequest).
 */
export function ConfirmIntentForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    confirmPaymentIntentAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="confirm-intent-id">معرّف قصد الدفع</label>
      <input id="confirm-intent-id" name="intentId" type="text" required />
      <p className="field-hint">انسخه من صف القصد في القائمة أعلاه.</p>
      <label htmlFor="confirm-external-id">المعرّف الخارجي لبوابة الدفع</label>
      <input id="confirm-external-id" name="externalId" type="text" required />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التأكيد…" : "أكّد القصد"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Refund one payment — the path id is a PAYMENT-row id, not the intent
 * id: payment ids appear in no contract read (the refund response
 * itself is their only surface) — stated honestly on the field.
 */
export function RefundForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    refundPaymentAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="refund-payment-id">معرّف الدفعة (وليس القصد)</label>
      <input id="refund-payment-id" name="paymentId" type="text" required />
      <p className="field-hint">
        معرّفات الدفعات لا تظهر في أي قراءة عقدية — مصدرها استجابة الاسترداد
        نفسها وسجلات بوابة الدفع. هذا استرداد كامل بحسب عقد الخلفي.
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الاسترداد…" : "استرد الدفعة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Batch-4 — the administration console II forms (the batch-4 spec). */
/* The same useActionState family; every select's vocabulary and    */
/* every input's bound mirror the backend's own request contract    */
/* (the measured source — never invented).                          */
/* ------------------------------------------------------------------ */

/** Change one user's role — the source enum's own three values. */
export function UserRoleForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateUserRoleAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="user-role-id">معرّف المستخدم</label>
      <input id="user-role-id" name="userId" type="text" required dir="ltr" />
      <label htmlFor="user-role-value">الدور الجديد</label>
      <select id="user-role-value" name="role" required>
        {USER_ROLES.map((value) => (
          <option key={value} value={value}>
            {USER_ROLE_LABELS[value]}
          </option>
        ))}
      </select>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التغيير…" : "غيّر الدور"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Disable/enable one account — @Pattern vocabulary + audited reason. */
export function UserStatusForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateUserStatusAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="user-status-id">معرّف المستخدم</label>
      <input id="user-status-id" name="userId" type="text" required dir="ltr" />
      <label htmlFor="user-status-value">الحالة</label>
      <select id="user-status-value" name="status" required>
        {USER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {USER_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <label htmlFor="user-status-reason">السبب (يسجّل مع الإجراء في سجل التدقيق)</label>
      <input id="user-status-reason" name="reason" type="text" required />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ التغيير…" : "غيّر حالة الحساب"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** One-way account pseudonymization — with the 503 capability note. */
export function PseudonymizeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    pseudonymizeUserAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="pseudonymize-id">معرّف المستخدم</label>
      <input id="pseudonymize-id" name="userId" type="text" required dir="ltr" />
      <label htmlFor="pseudonymize-reason">السبب</label>
      <input id="pseudonymize-reason" name="reason" type="text" required />
      <p className="field-hint">
        عملية ذات اتجاه واحد. يعمل الخلفي هنا بـ503 SU-001 ما دامت قناة
        HMAC غير مربوطة — القدرة موقوفة لا معطوبة (كلمات الخلفي نفسها).
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ التجنّي…" : "جَنِّ الحساب"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** The free-text content purge (completes an erasure flow). */
export function PurgeContentForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    purgeUserContentAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="purge-content-id">معرّف المستخدم</label>
      <input id="purge-content-id" name="userId" type="text" required dir="ltr" />
      <label htmlFor="purge-content-reason">السبب</label>
      <input id="purge-content-reason" name="reason" type="text" required />
      <p className="field-hint">
        حارس الخلفي نفسه: الهدف يجب أن يكون مجنّى أصلًا (409 otherwise —
        التطهير يُكمل مسح محتوى، لا يعمل على حساب حي).
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ التطهير…" : "طهّر المحتوى"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** The audit-identity purge (heavy, idempotent, outside transactions). */
export function PurgeAuditHistoryForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    purgeUserAuditHistoryAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="purge-audit-id">معرّف المستخدم</label>
      <input id="purge-audit-id" name="userId" type="text" required dir="ltr" />
      <label htmlFor="purge-audit-reason">السبب</label>
      <input id="purge-audit-reason" name="reason" type="text" required />
      <p className="field-hint">
        نفس حارس الخلفي (مجنّى أصلًا)؛ يعمل خارج أي معاملة وصفٌ بصف —
        إعادته لا تغيّر شيئًا (تُجيب صفرين).
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ التطهير…" : "طهّر سجل التدقيق"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Archive one listing administratively. */
export function ArchiveListingForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    archiveListingAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="archive-listing-id">معرّف الإعلان</label>
      <input id="archive-listing-id" name="listingId" type="text" required dir="ltr" />
      <p className="field-hint">انسخه من صف الإعلان في القائمة أعلاه.</p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الأرشفة…" : "أرشف الإعلان"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Set (or clear) one listing's L37 boost window. The EMPTY until field
 * CLEARS the boost — the backend's own PUT semantics (the documented
 * admin exit), stated on the field itself.
 */
export function PromotionForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setListingPromotionAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="promotion-listing-id">معرّف الإعلان</label>
      <input id="promotion-listing-id" name="listingId" type="text" required dir="ltr" />
      <label htmlFor="promotion-until">نهاية نافذة الترويج (اتركها فارغة للمسح)</label>
      <input
        id="promotion-until"
        name="until"
        type="datetime-local"
        dir="ltr"
      />
      <p className="field-hint">
        الحقل الفارغ يمسح الترويج — دلالة PUT للخلفي نفسها. الوقت يُفسَّر
        UTC (عرف المستودع نفسه).
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الضبط…" : "اضبط الترويج"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Verify one provider — the profile-id space, stated on the field. */
export function VerifyProviderForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    verifyProviderAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="verify-provider-id">معرّف المزوّد (فضاء معرّف الملف)</label>
      <input id="verify-provider-id" name="providerId" type="text" required dir="ltr" />
      <p className="field-hint">
        ليس معرّف المستخدم — فضاء معرّف الملف. مصدره لعملياتنا: صفوف قائمة
        الإعلانات الإدارية أعلاه (عمود providerId).
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التوثيق…" : "وثّق المزوّد"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Suspend one provider — the same profile-id space. */
export function SuspendProviderForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    suspendProviderAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="suspend-provider-id">معرّف المزوّد (فضاء معرّف الملف)</label>
      <input id="suspend-provider-id" name="providerId" type="text" required dir="ltr" />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ التعليق…" : "علّق المزوّد"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Credit a provider's ledger — the backend's own QUERY-STRING contract
 * (paymentIntentId + amountCents ride the URL, never a JSON body).
 */
export function CreditProviderForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    creditProviderAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="credit-provider-id">معرّف المزوّد</label>
      <input id="credit-provider-id" name="providerId" type="text" required dir="ltr" />
      <label htmlFor="credit-intent-id">معرّف قصد الدفع</label>
      <input id="credit-intent-id" name="paymentIntentId" type="text" required dir="ltr" />
      <label htmlFor="credit-amount">المبلغ (وحدات صغرى)</label>
      <input
        id="credit-amount"
        name="amountCents"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        required
        dir="ltr"
      />
      <p className="field-hint">
        عقد الخلفي نفسه: القصد والمبلغ على سلسلة الاستعلام لا في جسم JSON.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإيداع…" : "أودع في الأستاذ"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The administrative dispute resolution — the select carries the
 * backend's three-value vocabulary PLUS the explicit body-less choice
 * (NO_BODY sends no JSON body — the endpoint's own NO_ACTION
 * semantics; REFUND_CONSUMER must be named for money to move).
 */
export function ResolveDisputeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resolveDisputeAction,
    { status: "idle" },
  );
  const resolutions = Object.keys(DISPUTE_RESOLUTION_LABELS) as DisputeResolution[];

  return (
    <form action={action} className="stack-form">
      <label htmlFor="resolve-dispute-id">معرّف النزاع</label>
      <input id="resolve-dispute-id" name="disputeId" type="text" required dir="ltr" />
      <label htmlFor="resolve-dispute-resolution">القرار</label>
      <select id="resolve-dispute-resolution" name="resolution" required>
        <option value="NO_BODY">بلا جسم (NO_ACTION — الطلب الخلفي المتوافق)</option>
        {resolutions.map((value) => (
          <option key={value} value={value}>
            {DISPUTE_RESOLUTION_LABELS[value]}
          </option>
        ))}
      </select>
      <p className="field-hint">
        الجسم اختياري بحسب عقد الخلفي: غيابه = NO_ACTION — المال لا يتحرك
        ضمنيًا أبدًا.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التسوية…" : "احسم النزاع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Append a child location — the parent gate + slug pattern, verbatim. */
export function GeoCreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGeoLocationAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="geo-create-parent">معرّف الأصل</label>
      <input id="geo-create-parent" name="parentId" type="text" required dir="ltr" />
      <p className="field-hint">
        الأصل المجهول يُجيب 404 بكلمات الخلفي؛ المستوى يُشتق من الأصل — لا
        قفز ممكن أصلًا.
      </p>
      <label htmlFor="geo-create-name-ar">الاسم العربي</label>
      <input id="geo-create-name-ar" name="nameAr" type="text" required />
      <label htmlFor="geo-create-name-en">الاسم الإنجليزي (اختياري)</label>
      <input id="geo-create-name-en" name="nameEn" type="text" dir="ltr" />
      <label htmlFor="geo-create-slug">الslug</label>
      <input
        id="geo-create-slug"
        name="slug"
        type="text"
        required
        pattern={GEO_SLUG_PATTERN}
        dir="ltr"
      />
      <p className="field-hint">
        حروف لاتينية صغيرة أو أرقام أو شرطات (٢–١٢٠) — تعارض slug يُجيب 409
        بكلمات الخلفي.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإنشاء…" : "أنشئ الموقع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Rename / re-slug one location (level and parent are immutable). */
export function GeoRenameForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    renameGeoLocationAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="geo-rename-id">معرّف الموقع</label>
      <input id="geo-rename-id" name="locationId" type="text" required dir="ltr" />
      <label htmlFor="geo-rename-name-ar">الاسم العربي الجديد</label>
      <input id="geo-rename-name-ar" name="nameAr" type="text" required />
      <label htmlFor="geo-rename-name-en">الاسم الإنجليزي (اختياري)</label>
      <input id="geo-rename-name-en" name="nameEn" type="text" dir="ltr" />
      <label htmlFor="geo-rename-slug">الslug الجديد</label>
      <input
        id="geo-rename-slug"
        name="slug"
        type="text"
        required
        pattern={GEO_SLUG_PATTERN}
        dir="ltr"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التعديل…" : "أعد التسمية"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Soft-delete one childless location (children answer 409). */
export function GeoDeleteForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteGeoLocationAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="geo-delete-id">معرّف الموقع</label>
      <input id="geo-delete-id" name="locationId" type="text" required dir="ltr" />
      <p className="field-hint">
        حذف اتجاه واحد للعُقد بلا أبناء — العقدة ذات الأبناء تُجيب 409 بكلمات
        الخلفي (لا يتمهيد صامت).
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الحذف…" : "احذف الموقع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
