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
  createPricingRuleAction,
  deletePricingRuleAction,
  refundPaymentAction,
  resolveReportAction,
  setPricingRuleActiveAction,
  type ActionState,
} from "./actions";
import {
  MAX_RESOLUTION_NOTE_LENGTH,
  MODERATION_ACTIONS,
  MODERATION_ACTION_LABELS,
  RULE_CATEGORY_MAX_LENGTH,
  RULE_NAME_MAX_LENGTH,
} from "@/lib/api/admin-contract";

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
