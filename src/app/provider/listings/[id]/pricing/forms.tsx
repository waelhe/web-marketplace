"use client";

/**
 * Price-calendar action forms (L26 — batch-1 spec §1), the repo's
 * verbatim useActionState family (provider/forms.tsx). Input bounds
 * mirror the backend's own gates — (0,10] at scale 3 for the weekend
 * multiplier (UpsertWeekendRuleRequest + V41), a positive [from, to)
 * span with a non-negative absolute nightly price (SeasonalRate entity)
 * — the backend remains the authority; its problem+json words (the 409
 * overlap teaching included) surface verbatim.
 *
 * The seasonal price input is MAJOR units (the human-facing form —
 * «٥٢٠» ر.س); the action converts to the backend's MINOR units, the
 * same mapping the listing form uses. The exclusive end is labeled on
 * the field itself (the interval convention [from, toDate)).
 */

import { useActionState } from "react";
import {
  addSeasonalRateAction,
  deleteSeasonalRateAction,
  deleteWeekendRuleAction,
  updateSeasonalRateAction,
  upsertWeekendRuleAction,
  type ActionState,
} from "./actions";
import { WEEKEND_MULTIPLIER_MAX } from "@/lib/api/pricing-contract";
import type { SeasonalRateView } from "@/lib/api/pricing-contract";

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
 * Upsert the weekend multiplier — one live row per listing, so the form
 * doubles as create and re-tune (PUT). Prefilled with the current
 * multiplier when a rule exists.
 */
export function WeekendRuleForm({
  listingId,
  currentMultiplier,
}: {
  listingId: string;
  currentMultiplier: number | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    upsertWeekendRuleAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor="weekend-multiplier">مضاعف نهاية الأسبوع (السبت والأحد)</label>
      <input
        id="weekend-multiplier"
        name="multiplier"
        type="number"
        required
        min={0.001}
        max={WEEKEND_MULTIPLIER_MAX}
        step={0.001}
        inputMode="decimal"
        defaultValue={currentMultiplier ?? 1.2}
      />
      <p className="field-hint">
        السعر الأساس × المضاعف لليالي السبت والأحد — بين ٠ (غير شامل) و١٠،
        حتى ٣ خانات عشرية. مثال: 1.2 = زيادة ٢٠٪.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : currentMultiplier === null ? "أنشئ القاعدة" : "حدّث المضاعف"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Remove the weekend rule — back to the flat base price on weekends. */
export function WeekendRuleDeleteButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteWeekendRuleAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "…" : "أزل القاعدة"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/** Add one seasonal range — [fromDate, toDate) with an absolute nightly price. */
export function SeasonalRateAddForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addSeasonalRateAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor="seasonal-from">بداية النطاق (شاملة)</label>
      <input id="seasonal-from" name="fromDate" type="date" required />
      <label htmlFor="seasonal-to">حتى (غير شامل)</label>
      <input id="seasonal-to" name="toDate" type="date" required />
      <label htmlFor="seasonal-price">سعر الليلة (قيمة مطلقة)</label>
      <input
        id="seasonal-price"
        name="price"
        type="number"
        required
        min={0}
        step="any"
        inputMode="decimal"
        placeholder="مثال: 520"
      />
      <p className="field-hint">
        نطاق مفتوح [البداية، النهاية) — يوم النهاية لا يُسعَّر بهذا النطاق.
        السعر المطلق لكل ليلة داخل النطاق (بالوحدات الكبرى — يحوَّل إلى
        هللات). النطاقات المتجاورة بحدّ مشترك قانونية؛ التداخل الفعلي يرفضه
        الخادم (409 بكلماته).
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإضافة…" : "أضف النطاق الموسمي"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Replace one seasonal range's dates and price (prefilled). */
export function SeasonalRateEditForm({
  listingId,
  rate,
}: {
  listingId: string;
  rate: SeasonalRateView;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSeasonalRateAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="rateId" value={rate.id} />
      <label htmlFor={`rate-from-${rate.id}`}>بداية النطاق (شاملة)</label>
      <input
        id={`rate-from-${rate.id}`}
        name="fromDate"
        type="date"
        required
        defaultValue={rate.fromDate}
      />
      <label htmlFor={`rate-to-${rate.id}`}>حتى (غير شامل)</label>
      <input
        id={`rate-to-${rate.id}`}
        name="toDate"
        type="date"
        required
        defaultValue={rate.toDate}
      />
      <label htmlFor={`rate-price-${rate.id}`}>سعر الليلة (قيمة مطلقة)</label>
      <input
        id={`rate-price-${rate.id}`}
        name="price"
        type="number"
        required
        min={0}
        step="any"
        inputMode="decimal"
        defaultValue={rate.priceCents / 100}
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ التعديل"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Remove one seasonal range — its nights fall back to weekend/base rules. */
export function SeasonalRateDeleteButton({
  listingId,
  rateId,
}: {
  listingId: string;
  rateId: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteSeasonalRateAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="rateId" value={rateId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "…" : "احذف"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}
