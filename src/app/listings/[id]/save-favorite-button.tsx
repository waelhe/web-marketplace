"use client";

// W3 (yelp plan §5 — G19, #492): «حفظ لاحقًا» — the save-favorite
// button, the blind-button discipline (FollowProviderButton): the
// public detail page carries NO session read (crawler parity — the
// anonymous and the logged-in page are the same HTML), so the button
// submits BLIND and the backend's own gates teach — 409 an
// already-saved live pair (its words name the withdraw channel in
// «مفضلاتي»), 404 a listing gone between the page read and the write.
// The button uses THIS surface family's own visual language (the
// Button + Icon components, the ShareButton's siblings — not the
// neighborhood shell's icon font); the favorite STATE lives in
// «مفضلاتي» (/profile) where the live rows are served, so this
// surface never guesses it.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { saveFavoriteAction, type ActionState } from "../actions";

export function SaveFavoriteButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveFavoriteAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="listingId" value={listingId} />
      <Button
        variant="secondary"
        size="sm"
        type="submit"
        disabled={pending}
        aria-label="احفظ هذا الإعلان لتعود إليه لاحقاً من ملفك الشخصي"
      >
        <Icon name="bookmark" /> {pending ? "جارٍ الحفظ…" : "احفظ لاحقاً"}
      </Button>
      {state.status !== "idle" ? (
        <p className="page-note" role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
