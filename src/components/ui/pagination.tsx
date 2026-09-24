import Link from "next/link";

// Pagination over the backend Spring contract: `page` is 0-based on the
// wire (first page is `page=0`, omitted entirely for clean first-page
// URLs) but displayed 1-based to users. `params` is the CURRENT search
// params as a plain record of strings — every entry is preserved and ONLY
// `page` is swapped, serialized with URLSearchParams (never string concat
// of params). Task 5 consumes this component.
export function Pagination({ page, totalPages, basePath, params }: {
  page: number; totalPages: number; basePath: string; params: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const hrefFor = (target: number) => {
    const qs = new URLSearchParams(params);
    if (target <= 0) qs.delete("page");
    else qs.set("page", String(target));
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav className="listing-pager" aria-label="تصفّح الصفحات">
      {current > 0 ? (
        <Link className="button" rel="prev" href={hrefFor(current - 1)}>
          الصفحة السابقة
        </Link>
      ) : null}
      <span className="pager-pages">
        {Array.from({ length: totalPages }, (_, p) => (
          p === current ? (
            <Link key={p} className="pager-num" aria-current="page" href={hrefFor(p)}>
              {p + 1}
            </Link>
          ) : (
            <Link key={p} className="pager-num" href={hrefFor(p)}>
              {p + 1}
            </Link>
          )
        ))}
      </span>
      {current < totalPages - 1 ? (
        <Link className="button" rel="next" href={hrefFor(current + 1)}>
          الصفحة التالية
        </Link>
      ) : null}
    </nav>
  );
}
