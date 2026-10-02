"use client";

/**
 * The withdraw button — the author's own soft delete (L50): the
 * DeletePostButton pattern verbatim (the feed's own author-seam
 * surface). The button renders ONLY on the caller's own rows (the
 * served contract's mine fact gates it in the page), expected
 * failures come back as the inline note, and success re-renders the
 * board from its read through refresh().
 */

import { useActionState } from "react";
import { withdrawAction, type MarketActionState } from "./actions";

export function MarketDeleteButton({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<MarketActionState, FormData>(
    withdrawAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="market-withdraw">
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        className="hy-btn hy-btn-ghost"
        data-variant="danger"
        disabled={pending}
      >
        <span className="material-symbols-outlined" aria-hidden="true">delete</span>
        {pending ? "جارٍ السحب…" : "اسحب معروضك"}
      </button>
      {state.status === "error" ? (
        <p className="hy-state" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
