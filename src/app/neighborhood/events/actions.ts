"use server";

/**
 * Events server actions (L49 — the events board + RSVP, gap #4). The
 * same official mutating-data path as the feed's actions (POST-only,
 * Origin/Host CSRF check enforced by the framework); every action
 * re-checks the session itself and the backend's resource-server chain
 * remains the authorization authority. Writes ride backendSend — the
 * same direct BACKEND_URL channel as the reads.
 *
 * The RSVP toggle is the reaction toggle's own shape (L47/N3): the
 * form carries the LIVE rsvpedByMe flag from the board read, the
 * action flips it through the backend's own pair, and refresh()
 * re-renders the board from its read — the contract is the display's
 * single source of truth (the count and the joined state never live
 * in client state).
 *
 * The organize action composes the form's date+time pair into ONE
 * ISO timestamp pinned on Asia/Damascus (+03:00, no DST — the S9
 * design's own determinism rule: «التواريخ مثبّتة على Asia/Damascus
 * حتمية بين الخادم والمتصفح»).
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  createNeighborhoodEvent,
  rsvpEvent,
  unrsvpEvent,
} from "@/lib/api/community";
import {
  EVENT_CATEGORIES,
  MAX_EVENT_CAPACITY,
  MAX_EVENT_DESCRIPTION_LENGTH,
  MAX_EVENT_LABEL_LENGTH,
  MAX_EVENT_TITLE_LENGTH,
  type EventCategory,
  type EventRegistration,
} from "@/lib/api/community-contract";
import { isUuid } from "@/lib/api/geo";

/**
 * The form state contract shared by every events action form (the
 * feed's own ActionState shape — a `use server` module's runtime
 * exports are the async functions alone; forms inline `{ status: "idle" }`).
 */
export type EventsActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

/** Damascus is UTC+3 year-round (no DST since 2022) — the design's own pin. */
const DAMASCUS_OFFSET = "+03:00";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Compose the form's date (YYYY-MM-DD) + time (HH:mm) pair into ONE
 * ISO-8601 timestamp pinned on Asia/Damascus — the S9 design's own
 * determinism rule. An absent/past date answers the honest Arabic
 * gate BEFORE the backend is called (the backend's own future-time
 * gate stays the authority — its 400 answers anything that races
 * past this mirror).
 */
function composeStartsAt(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  return `${date}T${time}:00${DAMASCUS_OFFSET}`;
}

/**
 * The RSVP toggle — take or free ONE seat. The form carries the LIVE
 * rsvpedByMe flag from the board read (never client state), so the
 * action's direction is the read's own fact. Expected failures (the
 * honest 404 for a deleted event or a freed seat, the membership 403,
 * the one-seat 409, the capacity 409 with the backend's own words)
 * come back as ActionState data; success refreshes the server render
 * so attending and rsvpedByMe re-render from the board's own read.
 */
export async function rsvpAction(
  _prev: EventsActionState,
  formData: FormData,
): Promise<EventsActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const eventId = text(formData, "eventId");
  const currentlySeated = text(formData, "rsvpedByMe") === "true";
  if (!isUuid(eventId)) {
    return { status: "error", message: "معرّف الفعالية غير صالح." };
  }

  const result = currentlySeated ? await unrsvpEvent(eventId) : await rsvpEvent(eventId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تحديث حضورك (رمز ${result.status}).`,
      ),
    };
  }

  // refresh() (not redirect): the board's server render IS the seat
  // count's source of truth — the re-read carries the new attending
  // and the flipped rsvpedByMe, and the button re-renders in place.
  refresh();
  return {
    status: "success",
    message: currentlySeated ? "ألغيت حضورك." : "سُجّل حضورك — نراك هناك.",
  };
}

/**
 * Organize an event — the design's own form fields (title, category,
 * date, time, the in-neighborhood spot, description, seats). The
 * Arabic gates mirror the backend's own type gates (the vocabulary,
 * the bounds, the ONE registration/capacity rule); the backend
 * re-validates and owns the authorization (the membership match, the
 * level-3 gate, the future-time gate).
 *
 * The seats field composes the registration model: absent = OPEN to
 * all (the design's «اتركه فارغًا إن كان مفتوحًا للجميع»), a number =
 * the LIMITED_SEATS state. The design's third state (TABLE_RESERVATION)
 * stays the display dataset's own vocabulary — the form's one field
 * speaks the two states a member can express with seats alone.
 */
export async function organizeAction(
  _prev: EventsActionState,
  formData: FormData,
): Promise<EventsActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتنظّم فعالية في حارتك." };
  }

  const locationId = text(formData, "locationId");
  const category = text(formData, "category");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const date = text(formData, "date");
  const time = text(formData, "time");
  const locationLabel = text(formData, "location");
  const capacityRaw = text(formData, "capacity");

  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الحارة غير صالح — انضم إلى حارة أولاً." };
  }
  if (!EVENT_CATEGORIES.includes(category as EventCategory)) {
    return { status: "error", message: "اختر نوعاً صحيحاً للفعالية." };
  }
  if (title.length === 0 || title.length > MAX_EVENT_TITLE_LENGTH) {
    return {
      status: "error",
      message: `اسم الفعالية مطلوب (${MAX_EVENT_TITLE_LENGTH} حرفاً كحد أقصى).`,
    };
  }
  if (description.length === 0 || description.length > MAX_EVENT_DESCRIPTION_LENGTH) {
    return {
      status: "error",
      message: `الوصف مطلوب (${MAX_EVENT_DESCRIPTION_LENGTH} حرفاً كحد أقصى).`,
    };
  }
  const startsAt = composeStartsAt(date, time);
  if (startsAt === null) {
    return { status: "error", message: "التاريخ والوقت مطلوبان بصيغة صحيحة." };
  }
  if (startsAt <= new Date().toISOString()) {
    return {
      status: "error",
      message: "موعد البداية يجب أن يكون في المستقبل — لوحة الفعاليات قادمة النظر.",
    };
  }
  if (locationLabel.length === 0 || locationLabel.length > MAX_EVENT_LABEL_LENGTH) {
    return {
      status: "error",
      message: `الموقع داخل الحي مطلوب (${MAX_EVENT_LABEL_LENGTH} حرفاً كحد أقصى).`,
    };
  }

  // The seats pair: absent = OPEN to all; a number = LIMITED_SEATS
  // (the form's one field speaks the two states a member expresses
  // with seats alone — the backend's ONE rule re-validates).
  let capacity: number | null = null;
  let registration: EventRegistration = "OPEN";
  if (capacityRaw !== "") {
    const parsed = Number(capacityRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_EVENT_CAPACITY) {
      return {
        status: "error",
        message: `عدد المقاعد يجب أن يكون رقماً صحيحاً بين ١ و ${MAX_EVENT_CAPACITY} — أو اتركه فارغاً إن كان مفتوحاً للجميع.`,
      };
    }
    capacity = parsed;
    registration = "LIMITED_SEATS";
  }

  const result = await createNeighborhoodEvent({
    locationId,
    category: category as EventCategory,
    title,
    description,
    startsAt,
    endsAt: null,
    locationLabel,
    organizerLabel: session.name ?? "جار من الحي",
    capacity,
    registration,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تسجيل الفعالية (رمز ${result.status}).`,
      ),
    };
  }

  // refresh(): the board's server render IS the events' source of
  // truth — the re-read carries the new event on the board.
  refresh();
  return {
    status: "success",
    message: "سُجّلت الفعالية — ستظهر على لوحة حارتك الآن.",
  };
}
