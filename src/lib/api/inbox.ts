/**
 * The authenticated inbox channel (roadmap stage 4) — server-side data
 * access for notifications (L22 matrix + in-app feed), the provider lead
 * inbox (L34), and conversations/messages (B1 + L44 direct) on the same
 * backendGet/backendSend discipline as community.ts/provider.ts.
 *
 * Every path below was measured against the live production OpenAPI
 * (2026-09-22) and the backend source before this file was written:
 * - GET  /api/v1/notifications                (full list, newest first)
 * - POST /api/v1/notifications/{id}/read      (owner or admin — 403/404 otherwise)
 * - GET  /api/v1/notifications/preferences    (effective matrix)
 * - PUT  /api/v1/notifications/preferences    (upsert switches, DB opt-out → 400)
 * - GET  /api/v1/providers/me/leads?status=   (paged, newest first)
 * - PATCH /api/v1/providers/me/leads/{id}     (one-way moves)
 * - GET  /api/v1/messages/conversations/{id}  (participant-scoped)
 * - GET  /api/v1/messages/conversations/{id}/messages?page&size (oldest first)
 * - POST /api/v1/messages/conversations       (booking thread — stage 6)
 * - POST /api/v1/messages/conversations/direct (L44: 201 new / 200 existing;
 *                                                400 self, 404 unknown recipient)
 * - POST /api/v1/messages/conversations/{id}/messages
 * - POST /api/v1/messages/conversations/{id}/read
 *
 * The caller's own backend user id (for message ownership display) rides
 * GET /api/v1/users/me — the backend's own identity seam (UserResponse.id),
 * memoized per render pass with React cache().
 */

import { cache } from "react";
import { backendGet, backendSend } from "./server";
import type { PagedResponse } from "./types";
import type {
  ConversationInfo,
  LeadItem,
  LeadStatus,
  MessageItem,
  NotificationItem,
  PreferenceUpdate,
  PreferenceView,
} from "./inbox-contract";
import { LEADS_PAGE_SIZE, MESSAGES_PAGE_SIZE } from "./inbox-contract";

/** The backend's UserResponse (identity module) — the fields this surface uses. */
interface BackendUserMe {
  id: string;
  email: string;
  displayName: string | null;
}

/**
 * My backend user id, memoized per render pass. The message stream and the
 * feed's self-message suppression compare against this — the backend's own
 * /me projection, never a guessed Better-Auth↔users.id mapping.
 */
export const getMyBackendUser = cache(
  async (): Promise<{ ok: true; id: string } | { ok: false; status: number }> => {
    const me = await backendGet<BackendUserMe>("/api/v1/users/me");
    return me.ok ? { ok: true, id: me.data.id } : { ok: false, status: me.status };
  },
);

/** The caller's in-app notification feed — newest first, full list. */
export async function getMyNotifications(): Promise<
  ReturnType<typeof backendGet<NotificationItem[]>>
> {
  return backendGet<NotificationItem[]>("/api/v1/notifications");
}

/** Mark one notification read (owner or admin; 403/404 as measured). */
export async function markNotificationRead(
  id: string,
): Promise<ReturnType<typeof backendSend<NotificationItem>>> {
  return backendSend<NotificationItem>("POST", `/api/v1/notifications/${id}/read`);
}

/** The effective preference matrix (type × channel). */
export async function getMyPreferences(): Promise<
  ReturnType<typeof backendGet<PreferenceView[]>>
> {
  return backendGet<PreferenceView[]>("/api/v1/notifications/preferences");
}

/**
 * Upsert the given switches (sparse by design — the caller diffs against
 * the effective matrix and sends only changes; "back to default" is
 * enabled=true, there is no delete path). Returns the new matrix.
 */
export async function updateMyPreferences(
  updates: PreferenceUpdate[],
): Promise<ReturnType<typeof backendSend<PreferenceView[]>>> {
  return backendSend<PreferenceView[]>(
    "PUT",
    "/api/v1/notifications/preferences",
    { preferences: updates },
  );
}

/** The provider's lead inbox — paged, newest first, optional status filter. */
export async function getMyLeads(
  page: number,
  status: LeadStatus | null,
): Promise<ReturnType<typeof backendGet<PagedResponse<LeadItem>>>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(LEADS_PAGE_SIZE),
  });
  if (status) params.set("status", status);
  return backendGet<PagedResponse<LeadItem>>(`/api/v1/providers/me/leads?${params}`);
}

/**
 * One-way inbox move (NEW→READ/ARCHIVED, READ→ARCHIVED). PATCH is the
 * measured verb (LeadsController @PatchMapping).
 */
export async function moveLead(
  leadId: string,
  status: LeadStatus,
): Promise<ReturnType<typeof backendSend<LeadItem>>> {
  return backendSend<LeadItem>("PATCH", `/api/v1/providers/me/leads/${leadId}`, {
    status,
  });
}

/** One conversation the caller participates in (404 otherwise). */
export async function getConversation(
  id: string,
): Promise<ReturnType<typeof backendGet<ConversationInfo>>> {
  return backendGet<ConversationInfo>(`/api/v1/messages/conversations/${id}`);
}

/** The conversation's messages — paged, oldest first. */
export async function getMessages(
  conversationId: string,
  page: number,
): Promise<ReturnType<typeof backendGet<PagedResponse<MessageItem>>>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(MESSAGES_PAGE_SIZE),
  });
  return backendGet<PagedResponse<MessageItem>>(
    `/api/v1/messages/conversations/${conversationId}/messages?${params}`,
  );
}

/** Send a chat message (201; the other participant is notified by the backend). */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ReturnType<typeof backendSend<MessageItem>>> {
  return backendSend<MessageItem>(
    "POST",
    `/api/v1/messages/conversations/${conversationId}/messages`,
    { content },
  );
}

/** Clear the caller's unread counter for the conversation (200 empty body). */
export async function markConversationRead(
  conversationId: string,
): Promise<ReturnType<typeof backendSend<null>>> {
  return backendSend<null>(
    "POST",
    `/api/v1/messages/conversations/${conversationId}/read`,
  );
}

/**
 * Open (or reuse) the direct conversation with one neighbor — L44.
 * 201 when newly opened, 200 when the pair's conversation already exists
 * (idempotent per pair); 400 on self, 404 on unknown recipient, 429 on the
 * conversationCreate budget — all surfaced as the backend's own words.
 */
export async function openDirectConversation(
  recipientId: string,
): Promise<ReturnType<typeof backendSend<ConversationInfo>>> {
  return backendSend<ConversationInfo>("POST", "/api/v1/messages/conversations/direct", {
    recipientId,
  });
}

/**
 * Open (or reuse) the BOOKING's conversation thread —
 * `POST /api/v1/messages/conversations {bookingId}`. The single chat
 * thread per booking (the backend's own words): 201 when this call
 * opened it, and the existing thread returns exactly like the direct
 * channel's idempotent reuse. Participant-scoped by the backend's own
 * gates — the action only carries the session's token.
 */
export async function openBookingConversation(
  bookingId: string,
): Promise<ReturnType<typeof backendSend<ConversationInfo>>> {
  return backendSend<ConversationInfo>("POST", "/api/v1/messages/conversations", {
    bookingId,
  });
}

/**
 * The caller's unread count in ONE conversation —
 * `GET /api/v1/messages/conversations/{id}/unread` (the backend's own
 * badge endpoint). Participant-scoped (404 otherwise); the count
 * clears through the mark-read effect on the conversation view.
 */
export async function getUnreadCount(
  conversationId: string,
): Promise<ReturnType<typeof backendGet<UnreadCount>>> {
  return backendGet<UnreadCount>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/unread`,
  );
}

/** UnreadCountResponse — the badge read model (MessagingController). */
export interface UnreadCount {
  unreadCount: number;
}
