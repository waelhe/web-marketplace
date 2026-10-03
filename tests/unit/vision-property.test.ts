import { describe, expect, it } from "vitest";
import {
  DISPLAY_ESTIMATE_QUDSAYYA,
  DISPLAY_INSIGHTS_QUDSAYYA,
  MORTGAGE_BOUNDS,
  estimateHeadline,
  estimateRangeLine,
  monthlyPayment,
  mortgageTotalLine,
  totalRepaid,
} from "@/lib/vision-property";

/**
 * The Redfin layer's REAL math (the pure annuity formula — E5) plus the
 * display blocks' own honesty rules (تقدير framing, computation dates).
 */
describe("vision-property — the mortgage calculator's pure math", () => {
  it("the standard annuity formula computes the monthly payment exactly", () => {
    // 1,000,000 SAR @ 5% annual for 20 years (240 months):
    // r = 0.05/12 = 0.0041666666…; M = P·r(1+r)^n / ((1+r)^n − 1)
    const m = monthlyPayment(1_000_000, 5, 20);
    expect(m).toBeCloseTo(6599.56, 1);
  });

  it("zero rate divides straight (the formula's own limit)", () => {
    expect(monthlyPayment(1_200_000, 0, 20)).toBe(1_200_000 / 240);
    expect(monthlyPayment(1_200_000, 0, 20)).toBeCloseTo(5000, 6);
  });

  it("the total repaid and the interest line stay consistent", () => {
    const total = totalRepaid(1_000_000, 5, 20);
    expect(total).toBeCloseTo(monthlyPayment(1_000_000, 5, 20) * 240, 6);
    expect(mortgageTotalLine(1_000_000, 5, 20)).toContain("فائدة");
    expect(mortgageTotalLine(1_000_000, 0, 20)).toContain("0 ريال فائدة");
  });

  it("the bounds mirror the tool's own HTML gates", () => {
    expect(MORTGAGE_BOUNDS.principalMin).toBe(50_000);
    expect(MORTGAGE_BOUNDS.principalMax).toBe(10_000_000);
    expect(MORTGAGE_BOUNDS.rateMax).toBe(25);
    expect(MORTGAGE_BOUNDS.yearsMax).toBe(30);
  });
});

describe("vision-property — the display blocks' honesty rules", () => {
  it("the estimate leads with the word «تقدير» (never a bare price)", () => {
    expect(estimateHeadline(DISPLAY_ESTIMATE_QUDSAYYA)).toMatch(/^تقدير القيمة:/);
    expect(estimateRangeLine(DISPLAY_ESTIMATE_QUDSAYYA)).toMatch(/^المدى المحتمل:/);
  });

  it("the confidence interval brackets the point estimate", () => {
    const e = DISPLAY_ESTIMATE_QUDSAYYA;
    expect(e.lowMajor).toBeLessThan(e.pointMajor);
    expect(e.pointMajor).toBeLessThan(e.highMajor);
  });

  it("every insight carries its computation date (the spec's own rule)", () => {
    for (const insight of DISPLAY_INSIGHTS_QUDSAYYA) {
      expect(insight.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(DISPLAY_ESTIMATE_QUDSAYYA.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
