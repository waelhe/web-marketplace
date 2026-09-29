import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ManualSettlementNote } from "@/app/bookings/[id]/manual-settlement-note";
import {
  MANUAL_SETTLEMENT_OPEN,
  PAYMENT_INTENT_STATUS_LABELS,
  type PaymentIntentStatus,
} from "@/lib/api/booking-contract";

// The J4 manual-settlement surfacing (charter §7.2, owner decision
// 2026-09-29) under test. The note's whole value is its HONESTY: it
// names the owner-approved temporary path exactly as the backend runs
// it (settle outside → reference through the booking conversation →
// administrative recording → the backend closes the loop), references
// only surfaces that exist, and never impersonates a payment channel.
// The suite pins the copy contract, the open-states constant, and the
// zero-fake-surface invariant (no form/button/link — pure text).

const ALL_INTENT_STATUSES: PaymentIntentStatus[] = [
  "CREATED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

describe("MANUAL_SETTLEMENT_OPEN: the payment-pending states (the contract pin)", () => {
  test("exactly CREATED and PROCESSING — the machine's open states", () => {
    expect(MANUAL_SETTLEMENT_OPEN).toEqual(["CREATED", "PROCESSING"]);
  });

  test("every open state is a real intent status the labels know", () => {
    for (const status of MANUAL_SETTLEMENT_OPEN) {
      expect(ALL_INTENT_STATUSES).toContain(status);
      expect(PAYMENT_INTENT_STATUS_LABELS[status]).toBeDefined();
    }
  });

  test("no terminal state leaks in (settled/cancelled/failed/refunded are answered)", () => {
    const terminal = ALL_INTENT_STATUSES.filter(
      (status) => !MANUAL_SETTLEMENT_OPEN.includes(status),
    );
    // The machine (booking-contract): CREATED → PROCESSING | CANCELLED;
    // PROCESSING → SUCCEEDED | FAILED; SUCCEEDED → REFUNDED |
    // PARTIALLY_REFUNDED (terminal thereafter).
    expect(terminal).toEqual([
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ]);
  });
});

describe("ManualSettlementNote: the rendered honesty contract", () => {
  const markup = renderToStaticMarkup(createElement(ManualSettlementNote));

  test("carries role=note (assistive-tech addressed, not decoration)", () => {
    expect(markup).toContain('role="note"');
  });

  test("leads with the temporary-path framing, never a channel claim", () => {
    expect(markup).toContain("<strong>المسار المعتمد مؤقتاً");
    expect(markup).toContain("الدفع الإلكتروني");
    expect(markup).not.toContain("ادفع الآن");
    expect(markup).not.toContain("بوابة الدفع");
  });

  test("names the measured loop: outside settlement + the reference + the auto close", () => {
    expect(markup).toContain("الدفع خارج المنصة");
    expect(markup).toContain("مرجع العملية");
    expect(markup).toContain("تسجيل المرجع إداريًا");
    expect(markup).toContain("يُكمل الخادم الدائرة تلقائيًا");
    expect(markup).toContain("تأكيد الحجز");
  });

  test("points at the REAL conversation surface by its own affordance name", () => {
    expect(markup).toContain("«محادثة هذا الحجز»");
  });

  test("zero fake surfaces: no form, no button, no link — pure text", () => {
    expect(markup).not.toMatch(/<form[\s>]/);
    expect(markup).not.toMatch(/<button[\s>]/);
    expect(markup).not.toMatch(/<a[\s>]/);
    expect(markup).not.toMatch(/href=/);
  });
});
