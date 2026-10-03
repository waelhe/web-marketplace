import { describe, expect, it } from "vitest";
import {
  BOOKING_MODES,
  SERVICE_PACKAGES,
  packageProgressLine,
  packageTotalLine,
} from "@/lib/vision-services";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";

/**
 * The Wyzant layer's own grammar (the pure helpers) — the block's
 * rendering words are pinned through the shared display vocabulary.
 */
describe("vision-services — the packages display world", () => {
  it("every package id carries the demo- prefix", () => {
    for (const p of SERVICE_PACKAGES) {
      expect(p.id.startsWith("demo-")).toBe(true);
    }
  });

  it("the bundle line states N × price = total (lossless whole riyals)", () => {
    const english = SERVICE_PACKAGES.find((p) => p.id === "demo-package-english-10")!;
    expect(packageTotalLine(english)).toBe("10 جلسات × 120 ريال = 1,200 ريالًا للحزمة");
    const quran = SERVICE_PACKAGES.find((p) => p.id === "demo-package-quran-5")!;
    expect(packageTotalLine(quran)).toBe("5 جلسات × 80 ريال = 400 ريالًا للحزمة");
  });

  it("the progress line clamps honestly and celebrates completion", () => {
    const p = SERVICE_PACKAGES[0];
    expect(packageProgressLine(p, 0)).toBe("لم تبدأ الحزمة بعد");
    expect(packageProgressLine(p, p.sessionsTotal)).toBe(
      "الحزمة مكتملة — كل الجلسات منتهية",
    );
    expect(packageProgressLine(p, 3)).toContain(`3 من ${p.sessionsTotal}`);
    // Over-clamp lands on the completion line (never an impossible count).
    expect(packageProgressLine(p, 99)).toBe("الحزمة مكتملة — كل الجلسات منتهية");
    // Negative clamps to zero.
    expect(packageProgressLine(p, -5)).toBe("لم تبدأ الحزمة بعد");
  });

  it("the booking-mode pairing states both modes explicitly", () => {
    expect(BOOKING_MODES.instant.labelAr).toBe("حجز فوري");
    expect(BOOKING_MODES.quote.labelAr).toBe("طلب عرض سعر");
    expect(BOOKING_MODES.quote.hintAr).toContain("بلا التزام");
  });

  it("the display vocabulary words the provider block pins", () => {
    expect(DISPLAY_BADGE_LABEL).toBe("بيانات عرض");
    expect(SERVICE_PACKAGES.length).toBe(3);
  });
});
