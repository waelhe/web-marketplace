"use server";

/**
 * Groups server actions (L51 — the neighbors groups, gap #6). The
 * same official mutating-data path as the feed's, the events' and the
 * market's actions (POST-only, Origin/Host CSRF check enforced by the
 * framework); every action re-checks the session itself and the
 * backend's resource-server chain remains the authorization authority.
 * Writes ride backendSend — the same direct BACKEND_URL channel as the
 * reads.
 *
 * The membership toggle is the RSVP button's own shape verbatim (the
 * events' rsvpAction): ONE action for both directions — the form
 * carries the row's live `joinedByMe` fact from the served board, the
 * action sends the matching join or leave write, and refresh()
 * re-renders the board from its read — the contract is the display's
 * single source of truth.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { joinGroup, leaveGroup } from "@/lib/api/community";
import { isUuid } from "@/lib/api/geo";

/**
 * The form state contract shared by the membership toggle form (the
 * feed's own ActionState shape — a `use server` module's runtime
 * exports are the async functions alone; forms inline `{ status: "idle" }`).
 */
export type GroupsActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Toggle my membership in one group — the join/leave pair. Expected
 * failures (the honest 404 for an unknown or retired group or for a
 * leave with no live membership, the cross-neighborhood 403, the
 * one-membership 409) come back as ActionState data; success
 * refreshes the server render so the member count and the button's
 * state re-render from the board's own read.
 */
export async function membershipAction(
  _prev: GroupsActionState,
  formData: FormData,
): Promise<GroupsActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const groupId = text(formData, "groupId");
  const currentlyJoined = text(formData, "joinedByMe") === "true";
  if (!isUuid(groupId)) {
    return { status: "error", message: "معرّف المجموعة غير صالح." };
  }

  const result = currentlyJoined ? await leaveGroup(groupId) : await joinGroup(groupId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تحديث عضويتك في المجموعة (رمز ${result.status}).`,
      ),
    };
  }

  // refresh() (not redirect): the board's server render IS the member
  // count's source of truth — the re-read carries the new count and
  // the flipped joinedByMe, and the button re-renders in place.
  refresh();
  return {
    status: "success",
    message: currentlyJoined
      ? "غادرت المجموعة — مقعدك صار مفتوحًا لجار آخر."
      : "انضممت إلى المجموعة — أهلاً بك بين جيرانك.",
  };
}
