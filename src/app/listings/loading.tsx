// loading.js: default Server Component; Next wraps the segment's page in a
// Suspense boundary automatically (file-conventions/loading). This browse
// fallback mirrors the /listings surface (Task 6): the same PageHeader
// title plus a listing-grid of Skeleton cards, so the streamed placeholder
// matches the shape of the results it precedes. No fetching code here.
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_CARDS = 6;

export default function ListingsLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <PageHeader title="الإعلانات" description="جارٍ تحميل الإعلانات…" />
      <ul className="listing-grid" aria-hidden="true">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, i) => (
          <li key={i}>
            <Skeleton lines={3} />
          </li>
        ))}
      </ul>
    </main>
  );
}
