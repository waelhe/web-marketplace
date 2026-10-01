import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import {
  getMyMembership,
  getMyNeighborhoodEvents,
} from "@/lib/api/community";
import { EVENTS_PAGE_SIZE } from "@/lib/api/community-contract";
import { findGeoNodeById } from "@/lib/api/geo";
import { neighborhoodDemoEnabled } from "@/lib/neighborhood-product";
import {
  DEMO_ACTIVITY,
  DEMO_IDEAS,
  featuredEvent,
  type NeighborhoodEvent,
} from "@/lib/neighborhood-events";
import { EventBoard } from "./event-board";
import { EventCalendar } from "./event-calendar";
import { EventCreateLauncher } from "./event-create";
import { SuggestionBox } from "./suggestion-box";

/**
 * فعاليات الحي — the events management product surface (slice S9, the
 * owner-supplied design spec 2026-09-29: «إدارة الفعاليات وتجمعات
 * الحي»). The same sanctuary identity (.hood-app) and the same privacy
 * contract as the feed: everything community answers 401 to anonymous
 * callers (measured), so the honest anonymous render is the gate
 * itself. `noindex` — session-scoped content.
 *
 * The product view: the prominent «تنظيم فعالية جديدة +» launcher
 * (full form, honestly-gated submission — the creation contract is
 * registered §7/7), the filter chips, the featured weekly initiative
 * with attendance + volunteer actions, the events grid with the three
 * registration states (limited seats / open to all / table
 * reservation), and the interactive sidebar (the month calendar with
 * event dots, the activity summary + badge, the suggestion box, the
 * safety guidelines). All display layers carry the «بيانات عرض»
 * badge and the ONE env kill-switch.
 */
export const metadata: Metadata = {
  title: "فعاليات الحي",
  description: "تجمعات ومبادرات جيرانك — حضر، تطوّع، أو نظّم فعاليتك",
  robots: { index: false },
};

type EventsPageProps = PageProps<"/neighborhood/events">;

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

export default async function EventsPage({}: EventsPageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>فعاليات الحي</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood/events" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const membership = await getMyMembership();
  if (!membership.ok) {
    if (membership.status === 404) {
      return (
        <main>
          <h1>فعاليات الحي</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح فعاليات الحي.
          </p>
          <p>
            <Link className="button" data-variant="primary" href="/neighborhoods">
              اختر حارتك
            </Link>
          </p>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>فعاليات الحي</h1>
        <p className="page-note" role="status">
          {membership.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                membership.problem,
                `تعذّرت قراءة عضويتك (رمز ${membership.status}).`,
              )}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const node = await findGeoNodeById(membership.data.locationId);
  const neighborhoodName = node?.nameAr ?? null;

  // N6 (gap #4 served): the board read went REAL — the backend's own
  // GET /api/v1/neighborhood/events (L49), membership-scoped,
  // forward-looking, every row carrying attending + rsvpedByMe. The
  // display widgets that have no served contract yet (the ideas box,
  // the activity badge) stay the labeled display layers; the events
  // themselves are the real rows now — the seam's ONE adaptation maps
  // the backend's locationLabel/organizerLabel into the S9 display
  // shape the board/calendar components speak (zero visual change).
  const board = await getMyNeighborhoodEvents(0, EVENTS_PAGE_SIZE);
  let events: readonly NeighborhoodEvent[] = [];
  let boardError: string | null = null;
  if (board.ok) {
    events = board.data.content.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      location: row.locationLabel,
      organizer: row.organizerLabel,
      capacity: row.capacity,
      attending: row.attending,
      registration: row.registration,
      featured: row.featured,
    }));
  } else {
    boardError = board.unauthenticated
      ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
      : problemMessage(board.problem, `تعذّرت قراءة فعاليات حارتك (رمز ${board.status}).`);
  }
  // The LIVE seat flags — the board's joined state rides the read's
  // own rsvpedByMe per row (never client-invented state).
  const mine = new Set(
    board.ok ? board.data.content.filter((row) => row.rsvpedByMe).map((row) => row.id) : [],
  );

  const demoOn = neighborhoodDemoEnabled();
  const ideas = demoOn ? DEMO_IDEAS : [];
  const activity = demoOn ? DEMO_ACTIVITY[0] ?? null : null;
  const featured = featuredEvent(events);

  return (
    <main className="hood-app">
      <header className="hood-hero">
        <h1 className="hood-title">
          فعاليات الحي{neighborhoodName ? ` — ${neighborhoodName}` : ""}
        </h1>
        <p className="hood-hero-sub listing-meta">
          <span className="listing-category">{neighborhoodName ?? "حارة غير معروفة"}</span>
          <span>·</span>
          <span>
            {featured
              ? `مبادرة الأسبوع: ${featured.title}`
              : "اجتماعات ومبادرات وتجمعات الجيران"}
          </span>
          <span>·</span>
          <span>عضو منذ {formatDate(membership.data.memberSince)}</span>
        </p>
        {/* The product's own navigation — the events wing is the active surface. */}
        <nav className="hood-tabs" aria-label="أقسام حيّنا">
          <Link className="hood-tab" href="/neighborhood">
            الخلاصة
          </Link>
          <span className="hood-tab" data-active="true" aria-current="page">
            الفعاليات
          </span>
          <Link className="hood-tab" href="/listings">
            سوق الحي
          </Link>
          <a className="hood-tab" href="/neighborhood#hood-biz">
            أعمال الحي
          </a>
        </nav>
        {/* The prominent create launcher rides the band (the design's
            always-visible «+») — N6: the submission is the real organize
            write into the caller's own neighborhood. */}
        <div className="hood-hero-cta">
          <EventCreateLauncher locationId={membership.data.locationId} />
        </div>
      </header>

      <div className="hood-layout">
        <section className="hood-main">
          <section className="hood-section" aria-labelledby="events-heading">
            <div className="hood-section-head">
              <h2 id="events-heading">تجمعات ومبادرات الحي</h2>
            </div>
            {boardError ? (
              <p className="page-note" role="status">
                {boardError}
              </p>
            ) : events.length > 0 ? (
              <EventBoard events={events} mine={mine} />
            ) : (
              <p className="page-note" role="status">
                لا فعاليات معروضة الآن — كن أول من ينظّم تجمّعًا لجيرانك من زر «تنظيم فعالية
                جديدة».
              </p>
            )}
          </section>
        </section>

        <aside className="hood-side">
          {events.length > 0 ? <EventCalendar events={events} /> : null}

          {activity ? (
            <section className="card hood-widget" aria-labelledby="activity-heading">
              <div className="hood-widget-head">
                <h2 id="activity-heading">نشاطك الاجتماعي</h2>
                <span className="badge badge-muted">بيانات عرض</span>
              </div>
              <p className="activity-badge">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M12 2 15 8l6.5 1-4.7 4.6L18 20l-6-3.1L6 20l1.2-6.4L2.5 9 9 8l3-6Z"
                  />
                </svg>
                {activity.badge}
              </p>
              <dl className="weather-rows">
                <div>
                  <dt>فعاليات حضرتها</dt>
                  <dd>{count(activity.eventsAttended)}</dd>
                </div>
                <div>
                  <dt>نقاط التفاعل</dt>
                  <dd>{count(activity.points)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {ideas.length > 0 ? <SuggestionBox ideas={ideas} /> : null}

          <section className="card hood-widget" aria-labelledby="event-safety-heading">
            <div className="hood-widget-head">
              <h2 id="event-safety-heading">سلامة الفعاليات</h2>
            </div>
            <ul className="safety-list">
              <li>الفعاليات داخل حدود الحي وبموافقة الجهة المنظمة — لا تجمعات خارج المحدد.</li>
              <li>فعاليات الأطفال يرافقها وليّ أمر في كل وقت.</li>
              <li>التنسيق مع أمن الحي للفعاليات الكبرى — عبر لجنة تطوير الحي.</li>
              <li>أبلغ عن أي ملاحظة سلامة عبر التبليغ على منشور الفعالية في الخلاصة.</li>
            </ul>
          </section>
        </aside>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحارة</Link> · <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
