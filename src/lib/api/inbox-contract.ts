/**
 * The inbox contract (roadmap stage 4) — pure types and vocabularies,
 * client-safe by construction (no next/headers transit; the same
 * separation discipline as community-contract/provider-contract).
 *
 * Sources (measured 2026-09-22, no invention):
 * - marketplace-notifications: NotificationController, Notification,
 *   NotificationPreferenceView(s), NotificationType, NotificationChannel
 * - marketplace-messaging: MessagingController, LeadsController,
 *   ConversationResponse, MessageResponse, LeadResponse, LeadStatus
 * - live production OpenAPI (16 paths confirmed) + anonymous probes
 *   (401 AUTHN-001 on every authenticated surface; the leads POST is
 *   the one public write — 400 bean-validation fires anonymously).
 * - PagedResponse envelope consumed from the stage-1 public types
 *   (src/lib/api/types.ts) by the server channel (inbox.ts).
 */

/**
 * L22/L34/L35/L42/L46/L45: the notification types the backend emits
 * today — the enum is the single source of truth (NotificationType
 * javadoc); a preference row can never drift from a delivered type.
 */
export const NOTIFICATION_TYPES = [
  "BOOKING_CREATED",
  "PAYMENT_STATE",
  "LEAD_RECEIVED",
  "SAVED_SEARCH_MATCH",
  "POST_COMMENTED",
  "NEW_LISTING_IN_NEIGHBORHOOD",
  "CONTENT_MODERATED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_CREATED: "إنشاء حجز",
  PAYMENT_STATE: "حالة الدفع",
  LEAD_RECEIVED: "طلب تواصل",
  SAVED_SEARCH_MATCH: "تطابق بحث محفوظ",
  POST_COMMENTED: "تعليق على منشورك",
  NEW_LISTING_IN_NEIGHBORHOOD: "إعلان جديد في حارتك",
  CONTENT_MODERATED: "إشعار إشراف",
};

/** The delivery channels a preference is expressed against (L22). */
export const NOTIFICATION_CHANNELS = ["DB", "EMAIL", "WS"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  DB: "داخل التطبيق",
  EMAIL: "البريد الإلكتروني",
  WS: "الإشعارات الفورية",
};

/**
 * The in-app notification row (GET /notifications, newest first —
 * the backend returns the caller's full list, no paging: the measured
 * contract this surface renders as-is).
 */
export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

/** The effective matrix entry (GET/PUT /notifications/preferences). */
export interface PreferenceView {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/** One switch of the preferences PUT body (upsert; "back to default" = enabled true). */
export interface PreferenceUpdate {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/** The provider's lead inbox row (L34 — the mediated-contact model). */
export interface LeadItem {
  id: string;
  listingId: string;
  contactName: string;
  contactPhone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
}

/** One-way inbox moves: NEW→READ/ARCHIVED, READ→ARCHIVED (terminal). */
export const LEAD_STATUSES = ["NEW", "READ", "ARCHIVED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "جديد",
  READ: "مقروء",
  ARCHIVED: "مؤرشف",
};

/** One conversation (booking thread, or L44 direct when bookingId is null). */
export interface ConversationInfo {
  id: string;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One chat message (senderId is the backend users.id — opaque UUID). */
export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

/** The page size the inbox asks the backend for when listing messages. */
export const MESSAGES_PAGE_SIZE = 50;

/** The leads inbox page size. */
export const LEADS_PAGE_SIZE = 20;
