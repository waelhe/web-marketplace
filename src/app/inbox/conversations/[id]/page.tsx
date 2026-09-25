import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import { isUuid } from "@/lib/api/geo";
import {
  getConversation,
  getMessages,
  getMyBackendUser,
  getUnreadCount,
} from "@/lib/api/inbox";
import { MESSAGES_PAGE_SIZE } from "@/lib/api/inbox-contract";
import { MarkReadOnView, SendMessageForm } from "../forms";

/**
 * One conversation (roadmap stage 4) — booking thread or L44 direct
 * neighbor chat. Private surface: `noindex` + the sign-in gate for
 * anonymous visitors (never a probe that would 401).
 *
 * Message ownership is a measured identity chain, not a guess: the page
 * reads the caller's own backend user id through GET /api/v1/users/me
 * (the backend's /me projection) and marks `senderId === me.id` rows as
 * «أنت»; every other sender renders neutrally (the backend keeps
 * participant resolution opaque to this surface by design).
 */

export const metadata: Metadata = {
  title: "محادثة",
  robots: { index: false },
};

type ConversationPageProps = PageProps<"/inbox/conversations/[id]">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>محادثة</h1>
        <p className="page-note" role="status">
          هذه المحادثة لأطرافها المسجّلين — سجّل الدخول لمتابعتها.
        </p>
        <SignInButton callbackURL={`/inbox/conversations/${id}`} />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // House validation (stage-2/3 pattern): a malformed id never becomes
  // a backend probe.
  if (!isUuid(id)) {
    notFound();
  }

  const conversation = await getConversation(id);
  if (!conversation.ok) {
    if (conversation.status === 404) {
      // The backend's participant-scoped 404 — not in this conversation.
      return (
        <main>
          <h1>محادثة</h1>
          <p className="page-note" role="status">
            لا توجد محادثة بهذا المعرّف — أو أنها ليست لك.
          </p>
          <p>
            <Link href="/inbox">الصندوق</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>محادثة</h1>
        <p className="page-note" role="status">
          {conversation.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                conversation.problem,
                `تعذّر قراءة المحادثة (رمز ${conversation.status}).`,
              )}
        </p>
        <p>
          <Link href="/inbox">الصندوق</Link>
        </p>
      </main>
    );
  }

  const [messages, me, unread] = await Promise.all([
    getMessages(id, page),
    getMyBackendUser(),
    getUnreadCount(id),
  ]);

  const myBackendId = me.ok ? me.id : null;

  return (
    <main>
      <h1>
        {conversation.data.bookingId === null ? "محادثة جيران" : "محادثة حجز"}
      </h1>
      <p className="listing-meta">
        <span className="listing-category">
          {conversation.data.bookingId === null ? "رسائل مباشرة (L44)" : "خيط الحجز"}
        </span>
        <span>·</span>
        <span>بدأت {formatDateTime(conversation.data.createdAt)}</span>
        <span>·</span>
        <span>آخر نشاط {formatDateTime(conversation.data.updatedAt)}</span>
        {/* The caller's unread badge (batch-2 spec §4) — the backend's own
            badge endpoint read at render time; the view-marks-read effect
            below clears it server-side. */}
        {unread.ok && unread.data.unreadCount > 0 ? (
          <>
            <span>·</span>
            <span className="unread-badge">
              {new Intl.NumberFormat("ar").format(unread.data.unreadCount)} غير مقروءة
            </span>
          </>
        ) : null}
      </p>

      <section aria-labelledby="messages-heading">
        <h2 id="messages-heading">الرسائل</h2>
        {messages.ok ? (
          messages.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا رسائل بعد — اكتب أول رسالة.
            </p>
          ) : (
            <>
              <p className="page-note">
                {new Intl.NumberFormat("ar").format(messages.data.totalElements)} رسالة —
                الصفحة {new Intl.NumberFormat("ar").format(messages.data.pageNumber + 1)} من{" "}
                {new Intl.NumberFormat("ar").format(Math.max(messages.data.totalPages, 1))}
              </p>
              <ul className="message-list">
                {messages.data.content.map((message) => {
                  const mine = myBackendId !== null && message.senderId === myBackendId;
                  return (
                    <li
                      key={message.id}
                      className={mine ? "message-row mine" : "message-row"}
                    >
                      <p className="listing-meta">
                        <span className="listing-category">{mine ? "أنت" : "الطرف الآخر"}</span>
                        <span>·</span>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </p>
                      <p className="message-body">{message.content}</p>
                    </li>
                  );
                })}
              </ul>
              <nav className="listing-pager" aria-label="تصفّح الرسائل">
                {messages.data.pageNumber > 0 ? (
                  <Link
                    className="button"
                    href={`/inbox/conversations/${id}?page=${messages.data.pageNumber}`}
                  >
                    الأقدم
                  </Link>
                ) : null}
                {!messages.data.last ? (
                  <Link
                    className="button"
                    href={`/inbox/conversations/${id}?page=${messages.data.pageNumber + 2}`}
                  >
                    الأحدث
                  </Link>
                ) : null}
              </nav>
              <p className="page-note">
                {/* The backend pages oldest-first: page 1 carries the start
                    of the thread; «الأحدث» walks toward the latest words. */}
                الرسائل مرتّبة من الأقدم إلى الأحدث داخل كل صفحة ({MESSAGES_PAGE_SIZE} رسالة).
              </p>
            </>
          )
        ) : (
          <p className="page-note" role="status">
            {messages.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  messages.problem,
                  `تعذّر قراءة الرسائل (رمز ${messages.status}).`,
                )}
          </p>
        )}
      </section>

      <section aria-labelledby="composer-heading">
        <h2 id="composer-heading">اكتب رسالة</h2>
        <SendMessageForm conversationId={id} />
      </section>

      {/* The view itself clears the unread badge (idempotent POST). */}
      <MarkReadOnView conversationId={id} />

      <p>
        <Link href="/inbox">الصندوق</Link>
        <span> · </span>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
