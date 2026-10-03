"use client";

/**
 * The ads action forms (W5 — G24): the campaign creation form (the
 * picker of MY ACTIVE listings + the money trio + the optional end) and
 * the per-campaign hold/lift pair — the repo's literal useActionState
 * family. The backend's own words ride every refusal (the
 * single-promotion 409, the ACTIVE-only 409, the ownership 403, the
 * endsAt 400 — measured live 2026-10-03); the money mirrors the bean
 * bounds in HTML (whole major units, lossless cents behind the scenes).
 */

import { useActionState } from "react";
import {
  createAdCampaignAction,
  pauseAdCampaignAction,
  resumeAdCampaignAction,
  type ActionState,
} from "./actions";
import { Field } from "@/components/ui/field";

const IDLE: ActionState = { status: "idle" };

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error" && !state.field) {
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

/** One pickable listing row (the public provider inventory's own shape). */
export type PickableListing = {
  id: string;
  title: string;
  price: string;
};

/**
 * «ابدأ ترويجًا مدفوعًا» — the creation form. The picker carries my
 * ACTIVE inventory (the same public read the dashboard rides); the
 * money trio works in whole ريالات; the optional end is a
 * datetime-local read as UTC (the booking form's own convention).
 */
export function CreateCampaignForm({ listings }: { listings: PickableListing[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createAdCampaignAction,
    IDLE,
  );

  if (listings.length === 0) {
    return (
      <p className="page-note">
        لا إعلانات نشطة لديك الآن — الترويج المدفوع يفتح على إعلان نشط (فعِّل إعلانًا
        أولًا ثم عُد هنا).
      </p>
    );
  }

  return (
    <form action={action} className="stack-form">
      <Field
        label="الإعلان المُروَّج"
        error={state.status === "error" && state.field === "listingId" ? state.message : undefined}
      >
        <select id="ad-create-listing" name="listingId" required defaultValue="">
          <option value="" disabled>
            اختر إعلانًا نشطًا…
          </option>
          {listings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.title} · {listing.price}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="الميزانية (ريال سعودي — كاملة)"
        error={state.status === "error" && state.field === "budget" ? state.message : undefined}
      >
        {/* dir=ltr: numeric input (the house rule for numbers). */}
        <input
          id="ad-create-budget"
          name="budget"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          dir="ltr"
          placeholder="500"
        />
      </Field>
      <Field
        label="سعر النقرة (ريال — 0 يجعل النقر مجانيًا)"
        error={state.status === "error" && state.field === "clickPrice" ? state.message : undefined}
      >
        <input
          id="ad-create-click-price"
          name="clickPrice"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          dir="ltr"
          defaultValue={1}
        />
      </Field>
      <Field
        label="سعر الظهور (ريال — 0 يجعل الظهور مجانيًا)"
        error={
          state.status === "error" && state.field === "impressionPrice" ? state.message : undefined
        }
      >
        <input
          id="ad-create-impression-price"
          name="impressionPrice"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          dir="ltr"
          defaultValue={0}
        />
      </Field>
      <Field
        label="تاريخ الانتهاء (اختياري — يُقرأ بتوقيت UTC)"
        error={state.status === "error" && state.field === "endsAt" ? state.message : undefined}
      >
        <input
          id="ad-create-ends-at"
          name="endsAt"
          type="datetime-local"
          dir="ltr"
        />
      </Field>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الانطلاق…" : "ابدأ الترويج المدفوع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «أوقف الحملة» — the owner's hold. One per ACTIVE campaign row; the
 * backend's own refusal words ride the ActionState (an ENDED campaign
 * answers 409 with its own words — never localized away).
 */
export function PauseCampaignForm({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    pauseAdCampaignAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="campaignId" value={campaignId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الإيقاف…" : "أوقف الحملة"}
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * «استأنف الحملة» — the hold's lift. One per PAUSED campaign row; the
 * backend's own gates teach with their own words (the expired duration,
 * the second live campaign — both 409).
 */
export function ResumeCampaignForm({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resumeAdCampaignAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="campaignId" value={campaignId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الاستئناف…" : "استأنف الحملة"}
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}
