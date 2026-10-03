import { describe, expect, it } from "vitest";
import {
  DISPLAY_UNIVERSITIES,
  NEIGHBOR_KIND_LABELS,
  DISPLAY_SECTIONS,
  SECTION_RAIL_ORDER,
  neighborKindLine,
  sectionRelativeTime,
  sectionsOfHood,
  sectionsRailLine,
  visionCount,
} from "@/lib/vision-institutions";

/**
 * The full-vision fabric layer's own grammar — pinned to the exact
 * display vocabulary (the N-series discipline: the words are the
 * contract, latn digits inside Arabic text are the owner's own number
 * style).
 */
describe("vision-institutions — the place & institution display world", () => {
  it("every display id carries the demo- prefix (never a backend UUID)", () => {
    for (const u of DISPLAY_UNIVERSITIES) {
      expect(u.id.startsWith("demo-")).toBe(true);
    }
    for (const s of DISPLAY_SECTIONS) {
      expect(s.id.startsWith("demo-")).toBe(true);
    }
  });

  it("the trust formula renders {الشارة} في {الحي}", () => {
    expect(neighborKindLine("EXPAT", "قدسيا البلد")).toBe(
      "جار مغترب في قدسيا البلد",
    );
    expect(neighborKindLine("RESIDENT", "حي القصر")).toBe(
      "جار مقيم في حي القصر",
    );
    expect(NEIGHBOR_KIND_LABELS.RESIDENT).toBe("جار مقيم");
    expect(NEIGHBOR_KIND_LABELS.EXPAT).toBe("جار مغترب");
  });

  it("sections of one hood come in the rail's own order (mosques first)", () => {
    const hood = sectionsOfHood("قدسيا البلد");
    expect(hood.length).toBeGreaterThan(0);
    const order = hood.map((s) => SECTION_RAIL_ORDER.indexOf(s.kind));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Cross-hood sections never leak into another hood's rail.
    expect(sectionsOfHood("حي القصر").every((s) => s.hoodAr === "حي القصر")).toBe(true);
  });

  it("the relative-time grammar keeps the design's own measured words", () => {
    expect(sectionRelativeTime(0)).toBe("الآن");
    expect(sectionRelativeTime(1)).toBe("منذ ساعة");
    expect(sectionRelativeTime(2)).toBe("منذ ساعتين");
    expect(sectionRelativeTime(5)).toBe("منذ 5 ساعات");
    expect(sectionRelativeTime(24)).toBe("منذ يوم");
    expect(sectionRelativeTime(48)).toBe("منذ يومين");
    expect(sectionRelativeTime(72)).toBe("منذ 3 أيام");
  });

  it("the rail line follows the Arabic count grammar", () => {
    expect(sectionsRailLine(0)).toBe("لا أقسام خاصة بعد");
    expect(sectionsRailLine(1)).toBe("قسم خاص واحد");
    expect(sectionsRailLine(2)).toBe("قسمان خاصان");
    expect(sectionsRailLine(3)).toBe("3 أقسام خاصة");
  });

  it("counts render in the owner's latn-digit style", () => {
    expect(visionCount(832)).toBe("832");
    expect(visionCount(128000)).toBe("128,000");
  });
});
