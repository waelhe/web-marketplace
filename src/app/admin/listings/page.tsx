import type { Metadata } from "next";
import Link from "next/link";
import { getAllListings } from "@/lib/api/admin";
import { ADMIN_LISTINGS_PAGE_SIZE } from "@/lib/api/admin-contract";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import {
  ArchiveListingForm,
  PromotionForm,
  SuspendProviderForm,
  VerifyProviderForm,
} from "../forms";

/**
 * لوحة الإعلانات والمزوّدين (slice N2): the inventory administration —
 * the S6 console's listings section + the providers section on ONE
 * panel (they were always one workflow: the listing rows expose
 * providerId — the sole contract source of the provider id the
 * verify/suspend commands need). Archive + promotion ride the same
 * admin contract verbatim.
 */

export const metadata: Metadata = {
  title: "الإعلانات والمزوّدون",
  robots: { index: false },
};

export default async function ListingsPanelPage() {
  const listings = await getAllListings(0, ADMIN_LISTINGS_PAGE_SIZE);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="الإعلانات والمزوّدون"
        note={
          <>
            جرد المنصة كاملًا بكل الحالات — صفوفه تحمل providerId (مصدر معرّف
            المزوّد الوحيد في قراءة عقدية)، والأرشفة والترويج أوامر إدارية،
            والتوثيق والتعليق للمزوّد على معرّف الملف نفسه.
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="listings-heading">
        <h2 id="listings-heading">كل الإعلانات</h2>
        {listings.ok ? (
          listings.data.content.length === 0 ? (
            <EmptyState title="لا إعلانات" />
          ) : (
            <ul className="feed-list">
              {listings.data.content.map((listing) => (
                <li key={listing.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة الإعلان">
                      {listing.status}
                    </span>
                    <span>·</span>
                    <span>{listing.title}</span>
                    <span>·</span>
                    <span>{listing.category}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>listing: {listing.id}</span>
                    <span> · provider: {listing.providerId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={listings.problem} status={listings.status} what="الإعلانات" />
        )}
        <ArchiveListingForm />
        <PromotionForm />
      </section>

      <section className="card hy-adm-section" aria-labelledby="providers-heading">
        <h2 id="providers-heading">المزوّدون</h2>
        <p className="page-note">
          التوثيق والتعليق — بمعرّف الملف (فضاء معرّف الملف، لا معرّف
          المستخدم؛ مصدره عمود providerId في قائمة الإعلانات أعلاه).
        </p>
        <VerifyProviderForm />
        <SuspendProviderForm />
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
