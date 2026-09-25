"use client";

/**
 * The per-post comments disclosure (batch-2 spec §1) — the app's
 * on-demand client read through the BFF relay (apiGet: the documented
 * client channel for data whose need is client-side — here, the
 * disclosure's open state itself), with the WRITE on the official
 * Server Action path (commentAction → backendSend, the repo's write
 * discipline). The read loads on FIRST open only (a closed post costs
 * no backend call), the list refetches after a successful comment,
 * and the backend's own words (404 hidden/deleted, 403 non-member,
 * the ApiError problem text) surface verbatim.
 */

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { apiGet, ApiError } from "@/lib/api/client";
import type { PagedResponse } from "@/lib/api/types";
import {
  COMMENTS_PAGE_SIZE,
  MAX_REPORT_NOTE_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type PostComment,
} from "@/lib/api/community-contract";
import { formatDate } from "@/lib/format";
import { commentAction, reportAction, type ActionState } from "./actions";

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

/** The comment composer — one per post, inside the disclosure. */
function CommentForm({ postId, onSuccess }: { postId: string; onSuccess: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(commentAction, {
    status: "idle",
  });
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  // The PREVIOUS state object — every action resolution produces a NEW
  // object, so consecutive successes (same "success" STRING, different
  // objects) each fire exactly once. Keying on the status string alone
  // suppressed every refetch after the first success (measured live in
  // the batch-2 battery: stale list after the second comment).
  const lastState = useRef<ActionState>(state);

  // After each successful submit: clear the composer (the refetched
  // list below is the canonical result — the textarea must not invite
  // a double submit) and trigger the list's refetch.
  useEffect(() => {
    if (state.status === "success" && state !== lastState.current) {
      if (bodyRef.current) bodyRef.current.value = "";
      onSuccess();
    }
    lastState.current = state;
  }, [state, onSuccess]);

  return (
    <form action={action} className="comment-composer">
      <input type="hidden" name="postId" value={postId} />
      <label htmlFor={`comment-body-${postId}`}>تعليقك</label>
      <textarea
        id={`comment-body-${postId}`}
        name="body"
        ref={bodyRef}
        required
        minLength={1}
        maxLength={2000}
        rows={3}
        placeholder="اكتب تعليقاً لجيرانك…"
      />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ النشر…" : "علّق"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «أبلغ عن المحتوى» — L45's intake form (batch-2 spec §1): one per
 * target (post or comment). The reason select carries the backend's
 * own four-value vocabulary; the optional note is bounded at 2000.
 * The backend's own gates surface verbatim (own-content 409,
 * duplicate 409, unknown/hidden 404).
 */
export function ReportContentForm({
  targetType,
  targetId,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reportAction, {
    status: "idle",
  });

  return (
    <details className="report-details">
      <summary className="link-like">أبلغ عن هذا المحتوى</summary>
      <form action={action} className="report-form">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <label htmlFor={`report-reason-${targetId}`}>السبب</label>
        <select id={`report-reason-${targetId}`} name="reason" required defaultValue="SPAM">
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REPORT_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
        <label htmlFor={`report-note-${targetId}`}>ملاحظة (اختياري)</label>
        <input
          id={`report-note-${targetId}`}
          name="note"
          type="text"
          maxLength={MAX_REPORT_NOTE_LENGTH}
          placeholder="تفاصيل تساعد فريق الإشراف"
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? "جارٍ الإرسال…" : "أرسل الإبلاغ"}
        </button>
        <StateMessage state={state} />
      </form>
    </details>
  );
}

/**
 * The per-post comments disclosure — loads the first comments page on
 * first open through the relay, refetches after each successful
 * comment, and renders each comment with its own report affordance.
 */
export function CommentsSection({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<PagedResponse<PostComment> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Stable identity for the composer's success callback (a fresh arrow
  // per render would re-fire the composer's effect needlessly).
  const refetchComments = useCallback(() => setReloadKey((key) => key + 1), []);

  // The on-demand read: fires once per open (and once more per
  // successful comment via reloadKey). The relay's 401 reauth state
  // and problem+json failures render as honest words, never a crash.
  // State updates land in the async continuations only (never
  // synchronously in the effect body — react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiGet<PagedResponse<PostComment>>(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments?page=0&size=${COMMENTS_PAGE_SIZE}`,
    )
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setLoaded(true);
          setFailure(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? (error.problem?.userMessage ?? error.problem?.detail ?? error.message)
            : "تعذّرت قراءة التعليقات.";
        setFailure(message);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId, reloadKey]);

  return (
    <details
      className="comments-details"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary>التعليقات</summary>
      <div className="comments-body">
        {failure ? (
          <p className="page-note" role="alert">
            {failure}
          </p>
        ) : null}
        {loaded && comments ? (
          comments.content.length === 0 ? (
            <p className="page-note" role="status">
              لا تعليقات بعد — كن أول من يعلّق.
            </p>
          ) : (
            <ul className="comment-list">
              {comments.content.map((comment) => (
                <li key={comment.id} className="comment-row">
                  <p className="comment-text">{comment.body}</p>
                  <p className="listing-meta">
                    <span>{formatDate(comment.createdAt)}</span>
                  </p>
                  <ReportContentForm targetType="COMMENT" targetId={comment.id} />
                </li>
              ))}
            </ul>
          )
        ) : !failure ? (
          <p className="page-note" role="status">
            جارٍ تحميل التعليقات…
          </p>
        ) : null}
        <CommentForm postId={postId} onSuccess={refetchComments} />
      </div>
    </details>
  );
}
