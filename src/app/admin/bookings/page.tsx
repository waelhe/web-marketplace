import type { Metadata } from "next";
import Link from "next/link";
import { getAllBookings } from "@/lib/api/admin";
import { ADMIN_BOOKINGS_PAGE_SIZE } from "@/lib/api/admin-contract";
import { formatDateTime, formatPrice } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";

/**
 * لوحة الحجوزات (slice N2): the platform-wide bookings administration
 * — the S6 console's bookings section on its own panel. The status
 * filter rides the URL as state through a plain GET form (the
 * /neighborhoods?parent= discipline) and passes through to the backend
 * LITERALLY (no client-side dictionary).
 */

export const metadata: Metadata = {
  title: "الحجوزات",
  robots: { index: false },
};

type BookingsPageProps = PageProps<"/admin/bookings">;

function first(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

export default async function BookingsPanelPage({
  searchParams,
}: BookingsPageProps) {
  const sp = await searchParams;
  const bookingStatus = first(sp?.bookingStatus);

  const bookings = await getAllBookings(
    bookingStatus === "" ? null : bookingStatus,
    0,
    ADMIN_BOOKINGS_PAGE_SIZE,
  );

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="الحجوزات (كلها)"
        note={
          <>
            كل حجوزات المنصة بجانبيها (المستهلك والمزوّد) — مرشّح الحالة يمرّ
            كما هو إلى الخلفي (لا معجم طرفي).
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="bookings-heading">
        <h2 id="bookings-heading">الجرد</h2>
        <form method="get" action="/admin/bookings" className="stack-form">
          <label htmlFor="bookings-status">مرشّح الحالة (اختياري — يمرّ حرفيًا)</label>
          <input
            id="bookings-status"
            name="bookingStatus"
            type="text"
            dir="ltr"
            defaultValue={bookingStatus}
          />
          <button type="submit" className="button">رشّح</button>
        </form>
        {bookings.ok ? (
          bookings.data.content.length === 0 ? (
            <EmptyState title="لا حجوزات" />
          ) : (
            <ul className="feed-list">
              {bookings.data.content.map((booking) => (
                <li key={booking.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة الحجز">
                      {booking.status}
                    </span>
                    <span>·</span>
                    <span>
                      {booking.priceCents !== null
                        ? formatPrice(booking.priceCents / 100, booking.currency)
                        : "بلا سعر"}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(booking.startsAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>booking: {booking.id}</span>
                    <span> · consumer: {booking.consumerId}</span>
                    <span> · provider: {booking.providerId}</span>
                    <span> · listing: {booking.listingId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={bookings.problem} status={bookings.status} what="الحجوزات" />
        )}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
