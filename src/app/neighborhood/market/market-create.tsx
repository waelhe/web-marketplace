"use client";

/**
 * The publish-item launcher — the market's own «انشر معروضًا» button
 * and its modal form (L50, gap #5 served, 2026-10-02): the submission
 * rides publishAction (the backend's own POST /api/v1/neighborhood/market
 * contract) — the Arabic gates mirror the backend's type gates (the
 * vocabulary, the bounds, the ONE pricing rule: the FREE category is
 * a gift with NO price, the sale categories require a whole-riyal
 * price), the backend re-validates and owns the authorization, and
 * success closes the modal after the board's refresh() re-render
 * carries the new item.
 *
 * A11y: the modal rides <dialog>, focus stays trapped by the native
 * element, Escape closes, the launcher owns the aria-haspopup/expanded
 * pair. The submit button rides the action's pending state.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import {
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
  MARKET_CONDITIONS,
  MARKET_CONDITION_LABELS,
} from "@/lib/api/community-contract";
import { publishAction, type MarketActionState } from "./actions";

/** The inline state note (the house forms' own shape). */
function StateMessage({ state }: { state: MarketActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={state.status === "error" ? "form-error" : "page-note"} role="status">
      {state.message}
    </p>
  );
}

export function MarketCreateLauncher({ locationId }: { locationId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<string>("FURNITURE");
  const [state, action, pending] = useActionState<MarketActionState, FormData>(
    publishAction,
    { status: "idle" },
  );

  const open = () => {
    setExpanded(true);
    dialogRef.current?.showModal();
  };

  const close = () => {
    setExpanded(false);
    dialogRef.current?.close();
  };

  // Success closes the modal one render after the note paints — the
  // board's refresh() already carries the new item underneath (the
  // official effect seam, no render-phase side effects).
  useEffect(() => {
    if (state.status === "success" && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [state.status]);

  const isGift = category === "FREE";

  return (
    <>
      <button
        type="button"
        className="hy-btn hy-btn-primary"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={open}
      >
        <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
        انشر معروضًا
      </button>
      <dialog
        ref={dialogRef}
        className="event-create-modal"
        aria-labelledby="market-create-heading"
        onClose={close}
      >
        <form action={action} className="event-create-form">
          <h3 id="market-create-heading">انشر معروضًا في سوق حارتك</h3>
          <p className="listing-meta">
            التعامل وجهًا لوجه عند بوابات الحي — والاستلام والفحص قبل الدفع.
          </p>
          <input type="hidden" name="locationId" value={locationId} />
          <label className="composer-field-label" htmlFor="market-title">
            اسم المعروض
          </label>
          <input
            id="market-title"
            name="title"
            required
            maxLength={200}
            placeholder="مثال: دراجة أطفال 16 بوصة — بحالة ممتازة"
          />
          <label className="composer-field-label" htmlFor="market-category">
            التصنيف
          </label>
          <select
            id="market-category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {MARKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {MARKET_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <label className="composer-field-label" htmlFor="market-condition">
            حالة البضاعة
          </label>
          <select id="market-condition" name="condition" defaultValue="GOOD">
            {MARKET_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {MARKET_CONDITION_LABELS[value]}
              </option>
            ))}
          </select>
          <label className="composer-field-label" htmlFor="market-price">
            {isGift
              ? "السعر — الإهداء بلا مقابل (اتركه فارغاً)"
              : "السعر بالريال (رقم صحيح، بلا كسور)"}
          </label>
          <input
            id="market-price"
            name="price"
            type="number"
            min={1}
            step={1}
            disabled={isGift}
            placeholder={isGift ? "مجاني — إهداء" : "مثال: 120"}
          />
          <label className="composer-field-label" htmlFor="market-location">
            نقطة الاستلام داخل الحي
          </label>
          <input
            id="market-location"
            name="location"
            required
            maxLength={200}
            placeholder="مثال: قرب جامع النور — مربع 2"
          />
          <div className="event-create-actions">
            <button type="button" className="button" onClick={close}>
              إلغاء
            </button>
            <button type="submit" className="button" data-variant="primary" disabled={pending}>
              {pending ? "جارٍ النشر…" : "انشر المعروض"}
            </button>
          </div>
          <StateMessage state={state} />
        </form>
      </dialog>
    </>
  );
}
