import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDateTime } from "@/lib/format";
import { getMyConsumerBookings } from "@/lib/api/booking";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingView,
} from "@/lib/api/booking-contract";

/**
 * حجوزاتي — roadmap stage 6's consumer home (الحجز والدفع): the
 * caller's own bookings placed as a consumer, self-scoped through the
 * ME chain (GET /bookings/consumer/{me.id} — the id resolves from the
 * backend's own /me projection, never from the client). The privacy
 * model is the backend's own contract, measured live: every booking
 * surface answers 401 AUTHN-001 to anonymous callers — the honest
 * anonymous render is the gate, never a probe that would 401.
 *
 * BookingResponse carries NO participant ids and NO price (measured)
 * — the card shows the state machine's own signals (status + window)
 * and the detail page carries the role-classified actions.
 *
 * Private surface — `noindex` is the honest robots contract for
 * session-scoped content.
 */
export const metadata: Metadata = {
  title: "حجوزاتي",
  description: "حجوزاتك كمستهلك — طلباتك وحالتها ودفعها",
  robots: { index: false },
};

type BookingsPageProps = PageProps<"/bookings">;

/** Parse ?page= (0-based; negative or non-numeric falls back to the first page). */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    // The booking-path gate: every surface behind it is authenticated
    // (measured 401 contract) — the honest anonymous render is the gate.
    return (
      <main>
        <h1>حجوزاتي</h1>
        <p className="page-note" role="status">
          الحجز للمستخدمين المسجّلين — سجّل الدخول لترى حجوزاتك وتدير دفعها.
        </p>
        <SignInButton callbackURL="/bookings" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const result = await getMyConsumerBookings(page);

  return (
    <main>
      <h1>حجوزاتي</h1>

      {result.ok ? (
        result.data.content.length === 0 ? (
          <p className="page-note" role="status">
            لا حجوزات بعد — ابدأ من صفحة أي إعلان بزر «احجز هذا المكان».
          </p>
        ) : (
          <>
            <ul className="feed-list">
              {result.data.content.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح الحجوزات">
              {result.data.pageNumber > 0 ? (
                <Link className="button" href={`/bookings?page=${result.data.pageNumber}`}>
                  الصفحة السابقة
                </Link>
              ) : null}
              {!result.data.last ? (
                <Link
                  className="button"
                  href={`/bookings?page=${result.data.pageNumber + 2}`}
                >
                  الصفحة التالية
                </Link>
              ) : null}
            </nav>
          </>
        )
      ) : (
        <p className="page-note" role="status">
          {result.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(result.problem, `تعذّرت قراءة حجوزاتك (رمز ${result.status}).`)}
        </p>
      )}

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}

function BookingCard({ booking }: { booking: BookingView }) {
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
        <Link href={`/bookings/${booking.id}`}>تفاصيل الحجز</Link>
      </p>
    </li>
  );
}
