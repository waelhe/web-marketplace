// loading.js: default Server Component; Next wraps the segment's page in a
// Suspense boundary automatically (file-conventions/loading). This detail
// fallback mirrors the /listings/[id] surface (Task 7): the header block
// plus the two card blocks (listing facts, property facts) as Skeletons,
// so the streamed placeholder matches the shape of the detail it precedes.
// No fetching code here.
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListingDetailLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <PageHeader title="تفاصيل الإعلان" description="جارٍ تحميل الإعلان…" />
      <section className="card" aria-label="بيانات الإعلان" aria-hidden="true">
        <Skeleton lines={4} />
      </section>
      <section className="card" aria-label="تفاصيل العقار" aria-hidden="true">
        <Skeleton lines={3} />
      </section>
    </main>
  );
}
