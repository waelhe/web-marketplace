import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import {
  findGeoNodeById,
  GEO_ROOT_ID,
  GEO_SUGGEST_MIN_LENGTH,
  getGeoChildren,
  getGeoSuggest,
  isUuid,
} from "@/lib/api/geo";
import { JoinForm } from "@/app/neighborhood/forms";

/**
 * اختيار الحارة — the PUBLIC neighborhood picker (roadmap stage 2's
 * entry surface). The geo tree surface is anonymous by design (measured
 * live: /api/v1/geo/{id}/children and /api/v1/geo/suggest answer public
 * GETs), so this page is SEO-indexable exactly like /listings — it is
 * the discovery surface for "find your neighborhood".
 *
 * Two honest modes, both zero-client-JS server renders:
 * - `?parent=<id>` — the drill-down (level links; level-3 = leaf, the
 *   join affordance). The default parent is the seeded tree root.
 * - `?q=<prefix>` — the autocomplete (GET form; the backend's
 *   2-character floor is mirrored here instead of spending the 400).
 *
 * The designed one-shot `/geo/tree` read is NOT used: it answers 409
 * CONFLICT-001 persistently on production (measured 2026-09-22) — the
 * walk rides /children until the backend incident is resolved.
 *
 * Level semantics (measured GeoNode.level): 0=country, 1=governorate,
 * 2=city, 3=neighborhood. Only level-3 nodes can be joined (the
 * backend's PUT gate answers 400 otherwise — mirrored by the join
 * affordance appearing only on leaves).
 */
export const metadata: Metadata = {
  title: "المناطق والأحياء",
  description: "ابحث عن حارتك أو تنقّل في المناطق — مدخل مجتمع الجيران",
};

type NeighborhoodsPageProps = PageProps<"/neighborhoods">;

const LEVEL_LABELS: Record<number, string> = {
  1: "المحافظات",
  2: "المدن",
  3: "الأحياء",
};

function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

export default async function NeighborhoodsPage({ searchParams }: NeighborhoodsPageProps) {
  const sp = await searchParams;
  const q = first(sp?.q);
  const parent = first(sp?.parent);

  const session = await getSession();

  // ---- search mode (the autocomplete) ----
  if (q.length > 0) {
    if (q.length < GEO_SUGGEST_MIN_LENGTH) {
      return (
        <main>
          <h1>المناطق والأحياء</h1>
          <SearchForm defaultValue={q} />
          <p className="page-note" role="status">
            اكتب حرفين على الأقل للبحث.
          </p>
          <BackToRoot />
        </main>
      );
    }

    const results = await getGeoSuggest(q);
    return (
      <main>
        <h1>المناطق والأحياء</h1>
        <SearchForm defaultValue={q} />

        {results.ok ? (
          results.data.length === 0 ? (
            <p className="page-note" role="status">
              لا نتائج تطابق «{q}» — جرّب تنقّل المناطق بدلاً من البحث.
            </p>
          ) : (
            <ul className="geo-list">
              {results.data.map((node) => (
                <li key={node.id}>{<GeoNodeRow node={node} session={!!session} />}</li>
              ))}
            </ul>
          )
        ) : results.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن البحث الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            تعذّر البحث (رمز {results.status}).
          </p>
        )}
        <BackToRoot />
      </main>
    );
  }

  // ---- drill-down mode ----
  const parentId = parent.length > 0 && isUuid(parent) ? parent : GEO_ROOT_ID;
  const isRoot = parentId === GEO_ROOT_ID;
  const parentName = isRoot ? null : (await findGeoNodeById(parentId))?.nameAr ?? null;

  const children = await getGeoChildren(parentId);

  return (
    <main>
      <h1>المناطق والأحياء</h1>
      <SearchForm defaultValue="" />

      {parentName ? (
        <p className="page-note">تتصفّح: {parentName}</p>
      ) : !isRoot ? (
        <p className="page-note" role="status">
          لا نعرف اسم هذا الفرع — ابدأ من الأعلى.
        </p>
      ) : null}

      {children.ok ? (
        children.data.length === 0 ? (
          <p className="page-note" role="status">
            {isRoot
              ? "لا مناطق متاحة حالياً."
              : "لا أحياء مسجّلة تحت هذه المنطقة بعد."}
          </p>
        ) : (
          <>
            <p className="page-note">{LEVEL_LABELS[children.data[0].level] ?? "المناطق"}</p>
            <ul className="geo-list">
              {children.data.map((node) => (
                <li key={node.id}>
                  <GeoNodeRow node={node} session={!!session} />
                </li>
              ))}
            </ul>
          </>
        )
      ) : children.status === 404 ? (
        <p className="page-note" role="status">
          هذا الموقع غير موجود — ابدأ من الأعلى.
        </p>
      ) : children.status === 0 ? (
        <p className="page-note" role="status">
          الخادم الخلفي غير متاح حالياً — لا يمكن قراءة المناطق الآن.
        </p>
        ) : (
        <p className="page-note" role="status">
          تعذّرت قراءة المناطق (رمز {children.status}).
        </p>
      )}
      <BackToRoot />
    </main>
  );
}

/** The zero-JS search form — a plain GET form (server renders the results). */
function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="get" action="/neighborhoods" className="geo-search">
      <label htmlFor="geo-q">ابحث عن منطقتك أو حارتك</label>
      <input
        id="geo-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        minLength={GEO_SUGGEST_MIN_LENGTH}
        placeholder="مثال: قدسيا"
        autoComplete="off"
      />
      <button type="submit" className="button" data-variant="primary">
        بحث
      </button>
    </form>
  );
}

/**
 * One geo node row: a non-leaf links deeper into the drill-down; a
 * level-3 leaf is the join affordance (the backend's PUT gate accepts
 * level-3 only). Signed-out visitors get the sign-in gate instead of a
 * doomed join roundtrip — the action re-checks the session regardless
 * (render-time gating is UX, not the security boundary).
 */
function GeoNodeRow({ node, session }: { node: GeoNodeRowNode; session: boolean }) {
  const label = node.nameAr;
  if (node.level < 3) {
    return (
      <Link className="listing-card geo-node" href={`/neighborhoods?parent=${node.id}`}>
        <h2>{label}</h2>
        <p className="listing-meta">
          <span className="listing-category">
            {node.level === 0 ? "دولة" : node.level === 1 ? "محافظة" : "مدينة"}
          </span>
          {node.nameEn ? (
            <>
              <span>·</span>
              <span>{node.nameEn}</span>
            </>
          ) : null}
        </p>
      </Link>
    );
  }
  return session ? (
    <div className="listing-card geo-node">
      <h2>{label}</h2>
      <p className="listing-meta">
        <span className="listing-category">حيّ</span>
        {node.nameEn ? (
          <>
            <span>·</span>
            <span>{node.nameEn}</span>
          </>
        ) : null}
      </p>
      <JoinForm locationId={node.id} label={label} />
    </div>
  ) : (
    <div className="listing-card geo-node">
      <h2>{label}</h2>
      <p className="listing-meta">
        <span className="listing-category">حيّ</span>
        {node.nameEn ? (
          <>
            <span>·</span>
            <span>{node.nameEn}</span>
          </>
        ) : null}
      </p>
      <p className="page-note">سجّل الدخول لتنضم إلى حارتك.</p>
      <SignInButton callbackURL="/neighborhoods" />
    </div>
  );
}

type GeoNodeRowNode = {
  id: string;
  level: number;
  nameAr: string;
  nameEn: string | null;
};

function BackToRoot() {
  return (
    <p>
      <Link href="/neighborhoods">تصفّح من الأعلى</Link>
    </p>
  );
}
