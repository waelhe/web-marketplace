/**
 * The J4 manual-settlement note (charter §7.2, owner decision
 * 2026-09-29) — the consumer-side surfacing of the owner-approved
 * TEMPORARY payment path while no PSP channel is bound on the backend
 * (measured: clientSecret null in the inert path).
 *
 * Pure display: no new endpoint, no form, no claimed channel. It names
 * the measured loop exactly as the backend runs it — settle outside
 * the platform, share the operation reference through the booking's
 * own conversation surface («محادثة هذا الحجز», batch-2 spec §4), the
 * administration records the reference (POST /payments/intents/{id}/
 * confirm {externalId} — the /admin console since S3), and the backend
 * closes the circle itself: intent SUCCEEDED, payment recorded with
 * the reference, booking auto-confirmed. Rendered ONLY while the
 * intent is in a payment-pending state (MANUAL_SETTLEMENT_OPEN) and
 * no client secret exists — the note retires the moment either the
 * state terminalizes or a real channel binds (Stripe activation later
 * changes nothing here, by the charter's own record).
 */

export function ManualSettlementNote() {
  return (
    <p className="page-note" role="note">
      <strong>المسار المعتمد مؤقتاً حتى تفعيل الدفع الإلكتروني:</strong>{" "}
      الدفع خارج المنصة (تحويل أو نقد)، ومشاركة مرجع العملية عبر «محادثة هذا
      الحجز». عند تسجيل المرجع إداريًا يُكمل الخادم الدائرة تلقائيًا — نجاح
      قصد الدفع، وقيد الدفعة بالمرجع، وتأكيد الحجز.
    </p>
  );
}
