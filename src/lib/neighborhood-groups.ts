/**
 * The groups board's DISPLAY layer (L51 — gap #6 served): the served
 * contract's rendering helpers — the member-count label with the
 * design's own Arabic grammar, the meta line's composition, the club's
 * icon, and the row's tone. Formatting happens in RSC only (the
 * src/lib/format.ts discipline): results ride the serialized payload,
 * so there is no client re-format and no hydration drift.
 *
 * Every rule here is MEASURED from the design's own display dataset
 * (src/lib/neighborhood-design.ts DEMO_OWNER_GROUPS — its labels are
 * the grammar's ground truth): «85 عضواً • تجمّع يومي 5:30 فجراً»،
 * «120 عضواً • نقاش الباصات والأنشطة»، «45 عضواً • مناقشة كتاب
 * شهرياً». The members count is now the SERVED live fact
 * («بعددها الحقيقي» — the display numbers 85/120/45 retired with the
 * display layer); the grammar that rendered them still governs.
 */

/* ── The member-count label ───────────────────────────────────────────────── */

/**
 * The member noun's Arabic grammar (the design's own usage, measured):
 * 1 → عضو، 2 → عضوان، 3–10 → أعضاء، 11–99 → عضواً، exact
 * hundreds/thousands → عضو. Compound numbers follow their own tail
 * (85/120/45 all carry عضواً — the tens component governs), which is
 * exactly the classical rule (the riyalUnit discipline verbatim).
 */
function memberUnit(count: number): string {
  if (count === 1) return "عضو";
  if (count === 2) return "عضوان";
  const tail = count % 100;
  if (tail >= 3 && tail <= 10) return "أعضاء";
  if (tail >= 11) return "عضواً";
  return "عضو";
}

/** The digits in the design's own rendering (western, measured). */
const count = (n: number) => new Intl.NumberFormat("ar").format(n);

/**
 * The member-count label — «N عضواً»: the LIVE count with the grammar
 * above. Zero members is honest (a club nobody joined yet), never
 * hidden — the board's counts are earned by real rows.
 */
export function groupMemberLabel(members: number): string {
  return `${count(members)} ${memberUnit(members)}`;
}

/**
 * The row's meta line — the design's own composition, measured
 * verbatim: «85 عضواً • تجمّع يومي 5:30 فجراً» — the member count and
 * the club's own one-line description joined by the design's bullet.
 */
export function groupMeta(members: number, description: string): string {
  return `${groupMemberLabel(members)} • ${description}`;
}

/* ── The club's icon and tone ─────────────────────────────────────────────── */

/**
 * The club's Material Symbols icon, derived from the club's own name
 * (the design's display dataset carried per-row icons; the served
 * contract carries NO icon field — the market's category-icon
 * discipline's honest mirror for a vocabulary-free entity: one keyword
 * mapping measured from the design's own rows, zero invented fields).
 */
export function groupIcon(name: string): string {
  if (name.includes("دراجي")) return "directions_bike";
  if (name.includes("مشي")) return "directions_walk";
  if (name.includes("أولياء") || name.includes("مدارس")) return "school";
  if (name.includes("قراء") || name.includes("مثقف")) return "menu_book";
  if (name.includes("تشجير") || name.includes("أشجار")) return "park";
  if (name.includes("أمهات")) return "family_restroom";
  if (name.includes("ورشة") || name.includes("أدوات")) return "handyman";
  return "groups_3";
}

/** The row's three tones — the design's own cycle, positional. */
export type GroupTone = "primary" | "secondary" | "tertiary";

const TONES: readonly GroupTone[] = ["primary", "secondary", "tertiary"];

/**
 * The row's tone, derived from its position (the design's rows 1/2/3
 * carry the three tones in order — the honest derivation for a
 * vocabulary-free contract: the cycle, never a stored display fact).
 */
export function groupTone(index: number): GroupTone {
  return TONES[index % TONES.length]!;
}
