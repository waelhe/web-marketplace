"use client";

/**
 * The membership toggle button (L51): the events board's RSVP button
 * pattern verbatim (the ReactButton discipline — the model carries the
 * row's live state, one action for both directions, refresh()
 * re-renders from the read). The form carries the served board's own
 * `joinedByMe` fact; the action sends the matching join or leave;
 * expected failures (the honest 404s, the cross-neighborhood 403, the
 * one-membership 409) surface as the inline note — the re-rendered
 * board IS the success (the member count and the button's own state
 * flip from the fresh read).
 */

import { useActionState } from "react";
import { membershipAction, type GroupsActionState } from "./actions";

export function GroupMembershipButton({
  groupId,
  joinedByMe,
}: {
  groupId: string;
  joinedByMe: boolean;
}) {
  const [state, action, pending] = useActionState<GroupsActionState, FormData>(
    membershipAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="group-membership">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="joinedByMe" value={joinedByMe ? "true" : "false"} />
      <button
        type="submit"
        className="hy-btn hy-btn-soft"
        data-variant={joinedByMe ? "primary" : undefined}
        disabled={pending}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {joinedByMe ? "check_circle" : "person_add"}
        </span>
        {pending ? "جارٍ التحديث…" : joinedByMe ? "عضو ✓" : "انضمام"}
      </button>
      {state.status === "error" ? (
        <p className="hy-state" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
