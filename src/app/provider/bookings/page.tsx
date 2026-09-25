import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDateTime } from "@/lib/format";
import { getMyAvailability, getMyProviderBookings } from "@/lib/api/booking";
import {
  AVAILABILITY_WINDOW_DAYS,
  BOOKING_STATUS_LABELS,
  type AvailabilitySlotView,
  type BookingStatus,
  type BookingView,
} from "@/lib/api/booking-contract";
import { AvailabilityRuleForm, SlotPublishForm, TimeOffForm } from "./forms";

/**
 * حجوزات ضيوفك — roadmap stage 6's provider surface (الحجز والدفع):
 * the bookings placed on the caller's listings (self-scoped through
 * the ME chain — GET /bookings/provider/{me.id}) plus the
 * availability management that feeds the exact-slot gate (the
 * provider's own published slots; the consumer's stay window must
 * match one EXACTLY, measured in BookingService.create).
 *
 * The privacy model is the booking path's measured contract (401
 * AUTHN-001 to anonymous callers) — the honest anonymous render is
 * the gate. The availability read is authenticated too (NOT in the
 * SecurityConfig permitAll list — measured), and its display window
 * is computed inside the channel function (booking.ts), never in
 * component render.
 *
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "حجوزات ضيوفك",
  description: "حجوزات عملائك على إعلاناتك + إدارة فتحات التوافر",
  robots: { index: false },
};

type ProviderBookingsPageProps = PageProps<"/provider/bookings">;

export default async function ProviderBookingsPage({}: ProviderBookingsPageProps) {
  const session = await getSession();
  if (!session) {
    // The booking-path gate: every surface behind it is authenticated
    // (measured 401 contract) — the honest anonymous render is the gate.
    return (
      <main>
        <h1>حجوزات ضيوفك</h1>
        <p className="page-note" role="status">
          إدارة الحجوزات والتوافر للمزوّدين المسجّلين — سجّل الدخول للمتابعة.
        </p>
        <SignInButton callbackURL="/provider/bookings" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // Parallel reads (Server Components fetch in parallel — the
  // packaged guide's model): the bookings list + the availability
  // window, both self-scoped through the me chain.
  const [bookings, availability] = await Promise.all([
    getMyProviderBookings(0),
    getMyAvailability(),
  ]);

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/provider">لوحة المزوّد</Link> / <span>حجوزات ضيوفك</span>
      </p>
      <h1>حجوزات ضيوفك</h1>

      <section className="card" aria-label="الحجوزات الواردة">
        <h2>الحجوزات الواردة</h2>
        {bookings.ok ? (
          bookings.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا حجوزات بعد — تظهر هنا متى طلب الضيوف أماكنك.
            </p>
          ) : (
            <ul className="feed-list">
              {bookings.data.content.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            {bookings.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  bookings.problem,
                  `تعذّرت قراءة حجوزاتك (رمز ${bookings.status}).`,
                )}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="availability-heading">
        <h2 id="availability-heading">فتحات التوافر</h2>
        <p className="page-note">
          {/* The exact-slot contract, stated to the provider: the
              consumer's stay window must match a published slot
              EXACTLY (measured) — a sub-window request is rejected by
              the backend's own 400 words. */}
          طلب الحجز يُقبل فقط إذا طابق فتحة منشورة تمامًا — نافذة الفتحة هي
          نفسها نافذة الإقامة التي يطلبها الضيف. تنشر الفتحات بتوقيت UTC.
        </p>
        {availability.ok ? (
          availability.data.length === 0 ? (
            <p className="page-note" role="status">
              لا فتحات منشورة — انشر أول فتحة ليتمكن الضيوف من الحجز.
            </p>
          ) : (
            <ul className="slot-list">
              {availability.data.map((slot) => (
                <SlotRow key={slot.id} slot={slot} />
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            {availability.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  availability.problem,
                  `تعذّرت قراءة التوافر (رمز ${availability.status}).`,
                )}
          </p>
        )}
        <p className="page-note">
          تُعرض الفتحات في نافذة الأيام الستين القادمة (
          {new Intl.NumberFormat("ar").format(AVAILABILITY_WINDOW_DAYS)} يومًا).
        </p>
        <SlotPublishForm />

        {/* The batch-2 spec §5 pair: the weekly rule (the generator's
            source) and the time-off block — both on the MEASURED
            query-string contracts, write-only by the contract's own
            shape (no rules/time-off reads exist — measured). */}
        <div className="availability-forms">
          <div>
            <h3>قاعدة أسبوعية</h3>
            <AvailabilityRuleForm />
          </div>
          <div>
            <h3>تعطيل نافذة</h3>
            <TimeOffForm />
          </div>
        </div>
      </section>

      <p>
        <Link href="/provider">لوحة المزوّد</Link>
      </p>
    </main>
  );
}

function BookingRow({ booking }: { booking: BookingView }) {
  return (
    <li className="card post-card">
      <p className="listing-meta">
        <span className="booking-status" data-status={booking.status}>
          {BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status}
        </span>
        <span>·</span>
        <span>
          {formatDateTime(booking.startsAt)} — {formatDateTime(booking.endsAt)}
        </span>
      </p>
      {booking.notes ? <p className="listing-description">{booking.notes}</p> : null}
      <p className="listing-meta">
        <Link href={`/listings/${booking.listingId}`}>الإعلان</Link>
        <span>·</span>
        <Link href={`/bookings/${booking.id}`}>إدارة الحجز</Link>
      </p>
    </li>
  );
}

function SlotRow({ slot }: { slot: AvailabilitySlotView }) {
  return (
    <li className="slot-row" data-booked={slot.booked ? "yes" : "no"}>
      <span>
        {formatDateTime(slot.startsAt)} — {formatDateTime(slot.endsAt)}
      </span>
      <span className="stat-value">{slot.booked ? "محجوزة" : "متاحة"}</span>
    </li>
  );
}
