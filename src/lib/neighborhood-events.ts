/**
 * The NEIGHBORHOOD EVENTS product layer — slice S9, the owner-supplied
 * design spec 2026-09-29 («إدارة الفعاليات وتجمعات الحي»): the
 * product-defined contracts for the events experience (the featured
 * initiative, the events grid with registration states, the
 * suggestion box) in the exact shapes the product needs.
 *
 * THE DISCIPLINE is the neighborhood-product.ts discipline, restated:
 * display data rides the success path only, every row carries the
 * «بيانات عرض» badge on its zone, ids are `demo-` prefixed (never
 * UUIDs), display rows are never links, and the SAME one env
 * off-switch (`DEMO_NEIGHBORHOOD=0|false` — the switch itself lives
 * in neighborhood-product.ts, one switch for the whole sanctuary)
 * governs the layer. When the backend serves
 * these contracts, the real reads take the seats with ZERO
 * product-surface changes; the attendance/vote interactions become
 * real writes at that seam (today they are display interactions —
 * client state only, never fake writes).
 */

/**
 * The neighborhood event contract — ONE shape for the featured
 * initiative AND the grid cards: the what/when/where/who plus the
 * registration state the design specifies (limited seats with a
 * remaining counter, open to all, or table reservation).
 */
export interface NeighborhoodEvent {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The event's headline. */
  title: string;
  /** One-paragraph description — what happens, what to bring. */
  description: string;
  /** The event's category (the product's own filter vocabulary). */
  category: NeighborhoodEventCategory;
  /** Start timestamp (ISO). */
  startsAt: string;
  /** End timestamp (ISO) — optional (a gathering may be open-ended). */
  endsAt: string | null;
  /** The in-neighborhood meeting spot's display label. */
  location: string;
  /** The organizing body's display label. */
  organizer: string;
  /** Capacity when seats are limited; null = open to all. */
  capacity: number | null;
  /** Confirmed attendees so far (the demo seed). */
  attending: number;
  /** The registration model (the design's three states). */
  registration: NeighborhoodEventRegistration;
  /** Exactly ONE featured initiative per week (the design's highlight). */
  featured: boolean;
}

/** The event category vocabulary (the product's filter chips) — ONE
 * source: the served contract re-exported here (community-contract.ts
 * measured it from the backend's EventCategory enum; the display
 * dataset and the served rows share the same membership, zero drift). */
export {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_REGISTRATIONS,
  EVENT_REGISTRATION_LABELS,
} from "@/lib/api/community-contract";
import type {
  EventCategory,
  EventRegistration,
} from "@/lib/api/community-contract";

/** The display-layer aliases (the S9 module's historical names). */
export type NeighborhoodEventCategory = EventCategory;
export type NeighborhoodEventRegistration = EventRegistration;

/** The demo events dataset — the design's five gatherings on real
 * upcoming dates (seeded 2026-09-29; the week of Oct 2–12, 2026). */
export const DEMO_EVENTS: readonly NeighborhoodEvent[] = [
  {
    id: "demo-event-tree-planting",
    title: "حملة تشجير ونظافة حديقة الحي",
    description:
      "مبادرة أسبوع الحي: غرس ٢٠ شتلة زيتون على الممشى الرئيسي، جمع المخلفات، " +
      "وتركيب مقاعد ظليلة قرب ملعب الأطفال. الأدوات والشتلات توفرها اللجنة — " +
      "أحضر قفازاتك وزجاجة ماء. جولة توزيع المهام تبدأ ٨:١٥ عند البوابة الرئيسية.",
    category: "VOLUNTEER",
    startsAt: "2026-10-02T08:00:00+03:00",
    endsAt: "2026-10-02T11:00:00+03:00",
    location: "حديقة الحي — البوابة الرئيسية",
    organizer: "لجنة تطوير الحي + فريق تشجير الحي",
    capacity: null,
    attending: 28,
    registration: "OPEN",
    featured: true,
  },
  {
    id: "demo-event-football-league",
    title: "دوري كرة القدم لشباب الحي",
    description:
      "أربع فرق، نظام دوري من جولتين، مباريات كل سبت ثلاثة أسابيع. الفئة ١٤–١٨ سنة. " +
      "المران الافتتاحي وتوزيع الفرق في الجولة الأولى — احضر قبل الموعد بربع ساعة.",
    category: "SPORTS_FAMILY",
    startsAt: "2026-10-03T16:30:00+03:00",
    endsAt: "2026-10-03T18:00:00+03:00",
    location: "ملعب الحي الشرقي",
    organizer: "نادي شباب الحي",
    capacity: 16,
    attending: 4,
    registration: "LIMITED_SEATS",
    featured: false,
  },
  {
    id: "demo-event-diwaniya",
    title: "ديوانية الحي الشهرية",
    description:
      "لقاء الجيران الشهري: مستجدات اللجنة، مخطط مواقف السيارات، ثم جلسة مفتوحة. " +
      "قهوة وتمر على حساب الديوانية — الأطفال مرحب بهم في فاحة اللعب المجاورة.",
    category: "SOCIAL",
    startsAt: "2026-10-08T20:30:00+03:00",
    endsAt: null,
    location: "ديوانية البوابة الجنوبية",
    organizer: "ديوانية الحي",
    capacity: null,
    attending: 19,
    registration: "OPEN",
    featured: false,
  },
  {
    id: "demo-event-swap-market",
    title: "سوق مقايضة ألعاب وكتب الأطفال",
    description:
      "اطرح ما كبر عنه أطفالك وخذ ما يناسبهم — ألعاب، كتب قصص، وملابس رياضية بحالة جيدة. " +
      "احجز طاولتك مسبقًا (طاولة لكل عائلة) ووسّم أسعارك بالمنطق: القيمة بالاستخدام لا بالشراء.",
    category: "MARKET",
    startsAt: "2026-10-10T10:00:00+03:00",
    endsAt: "2026-10-10T12:00:00+03:00",
    location: "ساحة المسجد — الظل الشمالي",
    organizer: "صباح الأمهات + مكتب السفر",
    capacity: 12,
    attending: 7,
    registration: "TABLE_RESERVATION",
    featured: false,
  },
  {
    id: "demo-event-garden-workshop",
    title: "ورشة صيانة الحدائق وتوفير المياه",
    description:
      "فني الري يشرح ضبط المؤقتات، فحص التسريبات، وأنظمة التنقيط المنزلي — ثم تطبيق عملي " +
      "على دفيئة الحي. يحضرها سكان من ثلاثة أحياء مجاورة؛ الشهادة تُسلّم للراغبين.",
    category: "WORKSHOP",
    startsAt: "2026-10-12T17:00:00+03:00",
    endsAt: "2026-10-12T19:00:00+03:00",
    location: "دفيئة الحي — مدخل الحديقة الخلفي",
    organizer: "ورشة أدوات الجيران + شركة الري المحلية",
    capacity: 20,
    attending: 13,
    registration: "LIMITED_SEATS",
    featured: false,
  },
];

/** The featured initiative (exactly one — the design's weekly highlight). */
export function featuredEvent(events: readonly NeighborhoodEvent[]): NeighborhoodEvent | null {
  return events.find((event) => event.featured) ?? null;
}

/** Seats remaining for a limited event (null when open). */
export function seatsRemaining(event: NeighborhoodEvent): number | null {
  if (event.capacity === null) return null;
  return Math.max(event.capacity - event.attending, 0);
}

/**
 * The events board's client filters (the design's chips): the week
 * window is 7 days from "today"; my-events is the attendance state
 * the caller passes (the display interaction's set).
 */
export type EventFilter = "ALL" | "THIS_WEEK" | "SPORTS_FAMILY" | "VOLUNTEER" | "MINE";

export const EVENT_FILTERS: ReadonlyArray<{ value: EventFilter; label: string }> = [
  { value: "ALL", label: "الكل" },
  { value: "THIS_WEEK", label: "هذا الأسبوع" },
  { value: "SPORTS_FAMILY", label: "رياضية وعائلية" },
  { value: "VOLUNTEER", label: "تطوعية" },
  { value: "MINE", label: "فعالياتي" },
];

export function filterEvents(
  events: readonly NeighborhoodEvent[],
  filter: EventFilter,
  mine: ReadonlySet<string>,
  today: Date = new Date(),
): readonly NeighborhoodEvent[] {
  switch (filter) {
    case "ALL":
      return events;
    case "THIS_WEEK": {
      const horizon = today.getTime() + 7 * 24 * 60 * 60 * 1000;
      return events.filter((event) => {
        const at = new Date(event.startsAt).getTime();
        return at >= today.getTime() - 24 * 60 * 60 * 1000 && at <= horizon;
      });
    }
    case "SPORTS_FAMILY":
    case "VOLUNTEER":
      return events.filter((event) => event.category === filter);
    case "MINE":
      return events.filter((event) => mine.has(event.id));
  }
}

/**
 * The suggestion-box contract — the design's «صندوق اقتراح فكرة تجمع
 * والتصويت عليها بين الجيران»: display ideas with vote counts; the
 * vote and the new-idea add are display interactions (client state).
 */
export interface NeighborhoodIdea {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The proposed gathering's one-liner. */
  text: string;
  /** Votes so far (the demo seed). */
  votes: number;
}

/** The suggestion-box display dataset. */
export const DEMO_IDEAS: readonly NeighborhoodIdea[] = [
  { id: "demo-idea-morning-run", text: "تشجيع جماعي صباح السبت حول الممشى", votes: 14 },
  { id: "demo-idea-bake-day", text: "يوم مخبوزات الجيران أمام الديوانية", votes: 9 },
  { id: "demo-idea-book-box", text: "رف تبادل كتب ثابت عند البوابة الشمالية", votes: 6 },
];

/** The user's social activity summary (the design's sidebar widget):
 * display numbers + the interaction badge — one labeled dataset row. */
export interface NeighborhoodActivity {
  /** Events attended in the last month. */
  eventsAttended: number;
  /** Interaction points (comments + votes + acks). */
  points: number;
  /** The badge's display label (the product's own vocabulary). */
  badge: string;
}

/** The activity display dataset — one row. */
export const DEMO_ACTIVITY: readonly NeighborhoodActivity[] = [
  { eventsAttended: 3, points: 47, badge: "جار فعّال" },
];

/* ── Date rendering discipline ────────────────────────────────────────────────
 *
 * The events surfaces include CLIENT components (the board, the
 * calendar) whose Intl formatting runs on BOTH the server render and
 * the browser hydration. The house pattern (src/lib/format.ts)
 * avoids hydration drift by formatting in RSC only — impossible here
 * (interactivity needs the client) — so these surfaces pin the
 * timezone to the product's own geography (Asia/Damascus: the geo
 * tree is ريف دمشق → قدسيا → الهامة). A pinned zone makes the output
 * DETERMINISTIC across server and browser: a 08:00 Damascus event
 * reads 08:00 for every neighbor, and the calendar dots land on the
 * event's own Damascus day. NEVER drop the pinned zone — an unpinned
 * format would drift with the viewer's clock.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The product's pinned display timezone. */
export const EVENT_TIMEZONE = "Asia/Damascus";

/** The event's Damascus calendar parts (day/month/year numbers). */
export function eventDayParts(iso: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-u-nu-latn", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** The event's Damascus weekday + date + time, Arabic display. */
export function formatEventWhen(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: EVENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** The event's Damascus time-of-day, Arabic display. */
export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: EVENT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** The event's Damascus day-of-month (the preview's date tile). */
export function formatEventDay(iso: string): string {
  return new Intl.NumberFormat("ar").format(eventDayParts(iso).day);
}

/** The event's Damascus month name, Arabic display. */
export function formatEventMonth(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    timeZone: EVENT_TIMEZONE,
    month: "long",
  }).format(new Date(iso));
}
