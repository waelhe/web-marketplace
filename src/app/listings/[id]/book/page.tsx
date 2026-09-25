import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatPrice } from "@/lib/format";
import { getListingDetail } from "@/lib/api/public";
import { BookingRequestForm } from "@/app/bookings/forms";

/**
 * طلب حجز — roadmap stage 6's consumer request surface (الحجز
 * والدفع). The privacy contract is the booking path's own measured
 * model: the write behind this form is authenticated (CONSUMER role),
 * so the GATE renders before ANY listing read — an anonymous visitor
 * never probes the booking surface, exactly like /provider and
 * /bookings (the stage-3 discipline, re-measured on this route).
 *
 * The request itself rides the backend's own contract: the stay
 * window [startsAt, endsAt) half-open, the nightly total DERIVED
 * server-side (the client never sends pricing), and the exact-slot
 * gate's 400 words surface verbatim when the window does not match a
 * published slot exactly. The consumer cannot browse the provider's
 * slots first — a measured backend seam (the availability read is
 * authenticated and keyed by the unexposed provider user id) — so the
 * form teaches the convention and the backend teaches the gate.
 *
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "طلب حجز",
  description: "اطلب حجز المكان — نافذة الإقامة وملاحظة للمزوّد",
  robots: { index: false },
};

type BookPageProps = PageProps<"/listings/[id]/book">;

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    // The booking-path gate — BEFORE any listing read (the measured
    // privacy contract: the anonymous render never probes the booking
    // surface, not even with the listing's public read).
    return (
      <main>
        <h1>طلب حجز</h1>
        <p className="page-note" role="status">
          الحجز للمستخدمين المسجّلين — سجّل الدخول لتطلب حجز هذا المكان.
        </p>
        <SignInButton callbackURL={`/listings/${id}/book`} />
        <p>
          <Link href={`/listings/${id}`}>عودة إلى الإعلان</Link>
        </p>
      </main>
    );
  }

  const result = await getListingDetail(id);

  if (!result.ok) {
    if (result.status === 404) {
      // The public detail read's own contract: unknown/inactive ids
      // answer 404 — the page mirrors it (the same documented
      // streamed-404 family as the detail page).
      notFound();
    }
    return (
      <main>
        <h1>طلب حجز</h1>
        <p className="page-note" role="status">
          {result.status === 0
            ? "الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلان الآن."
            : problemMessage(result.problem, `تعذّر قراءة الإعلان (رمز ${result.status}).`)}
        </p>
        <p>
          <Link href="/listings">كل الإعلانات</Link>
        </p>
      </main>
    );
  }

  const listing = result.data;

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/listings">الإعلانات</Link> /{" "}
        <Link href={`/listings/${listing.id}`}>{listing.title}</Link> /{" "}
        <span>طلب حجز</span>
      </p>
      <h1>طلب حجز</h1>

      <section className="card" aria-label="الإعلان المحجوز">
        <h2>{listing.title}</h2>
        <p className="listing-price">{formatPrice(listing.price, listing.currency)}</p>
        <p className="page-note">
          {/* The honest convention, stated up front: the total is
              derived server-side from the effective price of the
              window — never authored by this form. */}
          المجموع يُحتسب في الخادم من السعر الفعّال لنافذة الإقامة — لا يُدخل
          هنا. يظهر لك في قصد الدفع بعد تأكيد المزوّد.
        </p>
      </section>

      <section className="card" aria-labelledby="request-heading">
        <h2 id="request-heading">نافذة الإقامة</h2>
        <p className="page-note">
          يفتح الطلب حالة «بانتظار تأكيد المزوّد» — يؤكده المزوّد من لوحته،
          ثم يُفتح الدفع من صفحة الحجز.
        </p>
        <BookingRequestForm listingId={listing.id} />
      </section>

      <p>
        <Link href={`/listings/${listing.id}`}>عودة إلى الإعلان</Link>
      </p>
    </main>
  );
}
