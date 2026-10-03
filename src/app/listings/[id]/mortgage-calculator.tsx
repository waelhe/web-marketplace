"use client";

import { useMemo, useState } from "react";
import {
  MORTGAGE_BOUNDS,
  monthlyPayment,
  mortgageTotalLine,
} from "@/lib/vision-property";

/**
 * حاسبة الأقساط — the full-vision spec §5.4/E5: «أداة أمامية نقية» (a
 * pure front-end tool). The math lives server-shared in
 * vision-property.ts (unit-tested there); this client component only
 * binds inputs to it — the official React pattern for a local
 * interactive tool (no server roundtrip, no client cache, no
 * persistence: the numbers are the user's own arithmetic, never
 * platform data).
 *
 * RTL + Arabic labels; `dir="ltr"` on the numeric inputs per the house
 * form rule; HTML bounds mirror the tool's own limits exactly.
 */
export function MortgageCalculator({
  askingPriceMajor,
}: {
  /** The listing's asking price — the calculator's suggested principal. */
  askingPriceMajor: number;
}) {
  const suggested = Math.min(
    Math.max(askingPriceMajor, MORTGAGE_BOUNDS.principalMin),
    MORTGAGE_BOUNDS.principalMax,
  );

  const [principal, setPrincipal] = useState(String(suggested));
  const [rate, setRate] = useState(String(MORTGAGE_BOUNDS.defaultRate));
  const [years, setYears] = useState(String(MORTGAGE_BOUNDS.defaultYears));

  const parsed = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const y = Number(years);
    if (!Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(y)) {
      return null;
    }
    if (
      p < MORTGAGE_BOUNDS.principalMin ||
      p > MORTGAGE_BOUNDS.principalMax ||
      r < MORTGAGE_BOUNDS.rateMin ||
      r > MORTGAGE_BOUNDS.rateMax ||
      y < MORTGAGE_BOUNDS.yearsMin ||
      y > MORTGAGE_BOUNDS.yearsMax
    ) {
      return null;
    }
    return { p, r, y };
  }, [principal, rate, years]);

  const monthly = parsed ? monthlyPayment(parsed.p, parsed.r, parsed.y) : null;

  return (
    <section className="card" aria-labelledby="mortgage-heading">
      <h2 id="mortgage-heading">حاسبة الأقساط</h2>
      <p className="page-note">
        قدّر قسطك الشهري قبل أي قرار — الحساب يجري في متصفحك مباشرة ولا يُرسل
        لأي خادم.
      </p>

      <div className="mortgage-form">
        <label>
          <span>مبلغ التمويل (ريال)</span>
          <input
            type="number"
            dir="ltr"
            inputMode="numeric"
            min={MORTGAGE_BOUNDS.principalMin}
            max={MORTGAGE_BOUNDS.principalMax}
            step={10000}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
          />
        </label>
        <label>
          <span>الفائدة السنوية (%)</span>
          <input
            type="number"
            dir="ltr"
            inputMode="decimal"
            min={MORTGAGE_BOUNDS.rateMin}
            max={MORTGAGE_BOUNDS.rateMax}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
        <label>
          <span>مدة التمويل (سنة)</span>
          <input
            type="number"
            dir="ltr"
            inputMode="numeric"
            min={MORTGAGE_BOUNDS.yearsMin}
            max={MORTGAGE_BOUNDS.yearsMax}
            step={1}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            required
          />
        </label>
      </div>

      <p className="mortgage-result" role="status" aria-live="polite">
        {monthly === null ? (
          "أدخل قيمًا داخل الحدود المسموحة لحساب القسط."
        ) : (
          <>
            القسط الشهري التقديري:{" "}
            <strong>
              {new Intl.NumberFormat("ar-u-nu-latn", {
                maximumFractionDigits: 0,
              }).format(Math.round(monthly))}{" "}
              ريال
            </strong>
            <br />
            <span className="page-note">
              {mortgageTotalLine(parsed!.p, parsed!.r, parsed!.y)}
            </span>
          </>
        )}
      </p>
      <p className="page-note">
        أداة تقديرية بحتة — الأرقام النهائية بيد جهة التمويل، وليست عرضًا من
        المنصة.
      </p>
    </section>
  );
}
