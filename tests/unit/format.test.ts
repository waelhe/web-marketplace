import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("renders major units with Arabic currency (measured production shape)", () => {
    const out = formatPrice(1000, "SAR");
    expect(out).toContain("1,000.00");
    expect(out).toContain("ر.س");
  });

  it("never divides by 100 (R21 lock: backend already sends majors)", () => {
    // A cents-contract would render 1000 as "10.00" — assert it does not.
    expect(formatPrice(1000, "SAR")).not.toContain("10.00 ر");
  });

  it("renders zero without throwing", () => {
    expect(formatPrice(0, "SAR")).toContain("0.00");
  });
});

describe("formatDate / formatDateTime", () => {
  const iso = "2026-09-22T19:47:00.000Z";

  it("renders a non-empty Arabic date carrying the year", () => {
    const out = formatDate(iso);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toBe(iso);
    expect(out).toMatch(/20\d\d|٢٠[٠-٩]{2}/);
  });

  it("datetime adds a time marker beyond the date", () => {
    const d = formatDate(iso);
    const dt = formatDateTime(iso);
    expect(dt.length).toBeGreaterThan(0);
    expect(dt === d).toBe(false);
  });
});
