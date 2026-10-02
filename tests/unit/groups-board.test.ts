import { describe, expect, test } from "vitest";
import {
  groupIcon,
  groupMemberLabel,
  groupMeta,
  groupTone,
} from "@/lib/neighborhood-groups";

/**
 * The groups board's display helpers (L51 — gap #6 served): every rule
 * is pinned against the design's own display vocabulary (the
 * DEMO_OWNER_GROUPS labels are the grammar's ground truth — «85 عضواً
 * • تجمّع يومي 5:30 فجراً»، «120 عضواً • نقاش الباصات والأنشطة»، «45
 * عضواً • مناقشة كتاب شهرياً») and the served contract's own facts
 * (the members count is the LIVE fact, never a seeded display number).
 */

describe("groupMemberLabel — the design's own Arabic member grammar", () => {
  test("the display dataset's own counts land in their measured labels", () => {
    // 85/120/45 — the tens tail governs: عضواً.
    expect(groupMemberLabel(85)).toBe("85 عضواً");
    expect(groupMemberLabel(120)).toBe("120 عضواً");
    expect(groupMemberLabel(45)).toBe("45 عضواً");
  });

  test("the grammar's own classes: singular, dual, plural, accusative, exact hundreds", () => {
    expect(groupMemberLabel(1)).toBe("1 عضو");
    expect(groupMemberLabel(2)).toBe("2 عضوان");
    expect(groupMemberLabel(5)).toBe("5 أعضاء");
    expect(groupMemberLabel(10)).toBe("10 أعضاء");
    expect(groupMemberLabel(11)).toBe("11 عضواً");
    expect(groupMemberLabel(100)).toBe("100 عضو");
    expect(groupMemberLabel(102)).toBe("102 عضو");
    expect(groupMemberLabel(105)).toBe("105 أعضاء");
  });

  test("zero members is honest, never hidden", () => {
    // A club nobody joined yet renders its own truth — the board's
    // counts are earned by real rows («بعددها الحقيقي»).
    expect(groupMemberLabel(0)).toBe("0 عضو");
  });
});

describe("groupMeta — the design's own composition", () => {
  test("the display dataset's own rows compose verbatim", () => {
    expect(groupMeta(85, "تجمّع يومي 5:30 فجراً")).toBe(
      "85 عضواً • تجمّع يومي 5:30 فجراً",
    );
    expect(groupMeta(120, "نقاش الباصات والأنشطة")).toBe(
      "120 عضواً • نقاش الباصات والأنشطة",
    );
  });

  test("the live counts compose with the same grammar", () => {
    expect(groupMeta(2, "مناقشة كتاب شهرياً")).toBe("2 عضوان • مناقشة كتاب شهرياً");
    expect(groupMeta(1, "جولة يومية بعد المغرب من بوابة الحديقة")).toBe(
      "1 عضو • جولة يومية بعد المغرب من بوابة الحديقة",
    );
  });
});

describe("groupIcon — the keyword mapping measured from the design's own rows", () => {
  test("the design's three screen clubs derive their measured icons", () => {
    expect(groupIcon("فريق دراجي ومشي النخيل")).toBe("directions_bike");
    expect(groupIcon("مجلس أولياء أمور المدارس")).toBe("school");
    expect(groupIcon("نادي قراء ومثقفي النخيل")).toBe("menu_book");
  });

  test("the seed's own clubs derive the same family's icons", () => {
    expect(groupIcon("نادي المشي المسائي")).toBe("directions_walk");
    expect(groupIcon("فريق تشجير الحي")).toBe("park");
    expect(groupIcon("صباح الأمهات")).toBe("family_restroom");
    expect(groupIcon("ورشة أدوات الجيران")).toBe("handyman");
    expect(groupIcon("فريق دراجي ومشي الهامة")).toBe("directions_bike");
  });

  test("an unmatched club falls to the surface's own icon, never an invented one", () => {
    expect(groupIcon("نادٍ لم نعرفه بعد")).toBe("groups_3");
  });
});

describe("groupTone — the design's positional cycle", () => {
  test("the first three rows carry the design's three tones in order", () => {
    expect(groupTone(0)).toBe("primary");
    expect(groupTone(1)).toBe("secondary");
    expect(groupTone(2)).toBe("tertiary");
  });

  test("the cycle repeats for the fourth row and beyond", () => {
    expect(groupTone(3)).toBe("primary");
    expect(groupTone(4)).toBe("secondary");
  });
});
