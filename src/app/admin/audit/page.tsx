import type { Metadata } from "next";
import Link from "next/link";
import { getAuditedEntities, getRevisions } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";

/**
 * لوحة التدقيق (slice N2): the Envers trail — the S6 console's
 * revision section on its own panel. The audited-entities read +
 * the entity-revisions lookup ride the same admin contract verbatim;
 * the entity renders RAW as the backend returned it (no reassembly).
 * The lookup rides the URL as state through a plain GET form.
 */

export const metadata: Metadata = {
  title: "التدقيق",
  robots: { index: false },
};

type AuditPageProps = PageProps<"/admin/audit">;

function first(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

export default async function AuditPanelPage({ searchParams }: AuditPageProps) {
  const sp = await searchParams;
  const revisionEntity = first(sp?.revisionEntity);
  const revisionId = first(sp?.revisionId);

  const [entities, revisions] = await Promise.all([
    getAuditedEntities(),
    revisionEntity === "" || revisionId === ""
      ? null
      : getRevisions(revisionEntity, revisionId),
  ]);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="التدقيق"
        note={
          <>
            كيانات التدقيق (Envers) ومراجعات أي كيان بمعرّفه — الكيان يُعرض
            خامًا كما أعاده الخلفي (بلا إعادة تركيب).
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="revisions-heading">
        <h2 id="revisions-heading">سجل المراجعات</h2>
        {entities.ok ? (
          entities.data.length === 0 ? (
            <EmptyState title="لا كيانات مدقّقة" />
          ) : (
            <ul className="feed-list" dir="ltr">
              {entities.data.map((name) => (
                <li key={name} className="card post-card">
                  <p className="listing-meta">
                    <span>{name}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={entities.problem} status={entities.status} what="الكيانات المدقّقة" />
        )}
        <form method="get" action="/admin/audit" className="stack-form">
          <label htmlFor="revision-entity">اسم الكيان المدقّق</label>
          <input
            id="revision-entity"
            name="revisionEntity"
            type="text"
            dir="ltr"
            defaultValue={revisionEntity}
          />
          <label htmlFor="revision-id">معرّف الكيان</label>
          <input
            id="revision-id"
            name="revisionId"
            type="text"
            dir="ltr"
            defaultValue={revisionId}
          />
          <button type="submit" className="button">اقرأ المراجعات</button>
        </form>
        {revisions ? (
          revisions.ok ? (
            revisions.data.length === 0 ? (
              <EmptyState title="لا مراجعات لهذا الكيان" />
            ) : (
              <ul className="feed-list">
                {revisions.data.map((entry) => (
                  <li key={entry.revisionNumber} className="card post-card">
                    <p className="listing-meta">
                      <span className="listing-category" aria-label="نوع المراجعة">
                        {entry.revisionType}
                      </span>
                      <span>·</span>
                      <span dir="ltr">rev {entry.revisionNumber}</span>
                      <span>·</span>
                      <span>{formatDateTime(entry.revisedAt)}</span>
                    </p>
                    <pre className="post-body" dir="ltr">
                      {JSON.stringify(entry.entity, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ReadFailure problem={revisions.problem} status={revisions.status} what="المراجعات" />
          )
        ) : null}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
