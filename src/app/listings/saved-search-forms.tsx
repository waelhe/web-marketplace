"use client";

/**
 * Saved-searches client forms (L35 — batch-1 spec §2), the repo's
 * verbatim useActionState family (lead-form.tsx in this folder). The
 * save form carries the sanitized URL params as hidden inputs (the
 * server action converts them through the measured criteria name map);
 * the delete form is the per-row small form (MediaDeleteButton pattern).
 *
 * `alertEnabled` defaults to FALSE (the checkbox the caller checks
 * deliberately — «نبّهني عند مطابقة»); the backend's matcher owns every
 * notification decision — no client-side alert machinery exists by
 * design.
 */

import { useActionState } from "react";
import {
  deleteSavedSearchAction,
  saveSearchAction,
  type ActionState,
} from "./actions";

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
 * Save the current search — rendered only with an active session AND
 * non-default filters (the spec's visibility rule). The criteria ride
 * hidden inputs under their URL names; the checkbox opts into alerts.
 */
export function SaveSearchForm({ link }: { link: Record<string, string> }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveSearchAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="save-search-form">
      {Object.entries(link).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="save-search-alert">
        <input type="checkbox" name="alertEnabled" value="on" />
        نبّهني عند مطابقة
      </label>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ هذا البحث"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Delete one saved search — the per-chip small form. */
export function SavedSearchDeleteButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deleteSavedSearchAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="button"
        data-variant="danger"
        aria-label="احذف هذا البحث المحفوظ"
        disabled={pending}
      >
        {pending ? "…" : "✕"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}
