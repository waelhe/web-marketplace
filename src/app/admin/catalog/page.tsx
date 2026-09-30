import type { Metadata } from "next";
import Link from "next/link";
import { getPricingRules } from "@/lib/api/admin";
import { getListingCategories } from "@/lib/api/public";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import {
  GeoCreateForm,
  GeoDeleteForm,
  GeoRenameForm,
  PricingRuleCreateForm,
  RuleActiveButton,
  RuleDeleteButton,
} from "../forms";

/**
 * لوحة الفهرس والقواعد (slice N2): the platform's structural
 * administration — the S6 console's pricing-rules + geo-tree sections
 * on ONE panel (the catalog side of the console: how listings are
 * priced and where they live). The rules list + create/activate/
 * deactivate/delete ride the same admin contract verbatim; the geo
 * CRUD keeps the backend's own bounds (unknown parent 404, slug
 * clashes and dialogs-with-children 409 in its own words).
 */

export const metadata: Metadata = {
  title: "الفهرس والقواعد",
  robots: { index: false },
};

export default async function CatalogPanelPage() {
  // The rules read is ADMIN-gated; the category vocabulary is the PUBLIC
  // registry read (no admin gate — it feeds the create form's live
  // picker; the same S2 discipline the old console rode).
  const [rules, categories] = await Promise.all([
    getPricingRules(),
    getListingCategories(),
  ]);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="الفهرس والقواعد"
        note={
          <>
            قواعد التسعير العامة والشجرة الجغرافية — بنية المنصة الفهرسية.
            الإنشاء والتفعيل والتعطيل والحذف بحدود الخلفي نفسها (الاسم ≤ ٢٠٠
            حرف، الفئة ≤ ١٠٠، والكسور بين ٠ و١).
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="pricing-rules-heading">
        <h2 id="pricing-rules-heading">قواعد التسعير</h2>
        {rules.ok ? (
          rules.data.length === 0 ? (
            <EmptyState title="لا قواعد تسعير بعد" />
          ) : (
            <ul className="feed-list">
              {rules.data.map((rule) => (
                <li key={rule.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة القاعدة">
                      {rule.active ? "مفعّلة" : "معطّلة"}
                    </span>
                    <span>·</span>
                    <span>{rule.name}</span>
                    {rule.category ? (
                      <>
                        <span>·</span>
                        <span>{rule.category}</span>
                      </>
                    ) : null}
                  </p>
                  {rule.taxRate !== null || rule.discountPct !== null ? (
                    <p className="post-body">
                      {rule.taxRate !== null
                        ? `ضريبة ${new Intl.NumberFormat("ar", { maximumFractionDigits: 4 }).format(rule.taxRate)}`
                        : ""}
                      {rule.taxRate !== null && rule.discountPct !== null
                        ? " · "
                        : ""}
                      {rule.discountPct !== null
                        ? `خصم ${new Intl.NumberFormat("ar", { maximumFractionDigits: 4 }).format(rule.discountPct)}`
                        : ""}
                    </p>
                  ) : null}
                  <div className="inline-actions">
                    <RuleActiveButton ruleId={rule.id} active={rule.active} />
                    <RuleDeleteButton ruleId={rule.id} />
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={rules.problem} status={rules.status} what="القواعد" />
        )}
        <PricingRuleCreateForm categories={categories.ok ? categories.data : null} />
      </section>

      <section className="card hy-adm-section" aria-labelledby="geo-heading">
        <h2 id="geo-heading">الشجرة الجغرافية</h2>
        <p className="page-note">
          إنشاء موقع وابن وإعادة تسمية وحذف — حدود الخلفي نفسها: الأصل
          المجهول 404، وتعارض slug والحوارات ذات الأبناء 409 بكلماته.
        </p>
        <GeoCreateForm />
        <GeoRenameForm />
        <GeoDeleteForm />
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
