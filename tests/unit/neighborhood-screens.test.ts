import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import MarketPage from "@/app/neighborhood/market/page";
import ServicesPage from "@/app/neighborhood/services/page";
import SafetyPage from "@/app/neighborhood/safety/page";
import GroupsPage from "@/app/neighborhood/groups/page";

/**
 * The S10 screens — the automated net over the three new surfaces the
 * owner's four-screen spec names (سوق الحي / دليل الخدمات / خريطة
 * وتنبيهات الأمان / مجموعات الجيران). The same proven pattern as
 * neighborhood-member-render.test.ts: renderToStaticMarkup over a
 * mocked async server component (session + membership + the
 * location-scoped public search), asserting each screen's own anatomy
 * — the page hero, the server-side filter reads, the REAL bridge, and
 * the display discipline (labeled, demo ids, never links).
 */

const fixtures = vi.hoisted(() => ({
  session: {
    userId: "00000000-0000-4000-8000-000000000001",
    name: "Wael",
    email: "member@example.test",
  },
  locationId: "33333333-3333-4333-8333-333333333301",
  membership: {
    id: "44444444-4444-4444-8444-444444444401",
    userId: "00000000-0000-4000-8000-000000000001",
    locationId: "33333333-3333-4333-8333-333333333301",
    verificationState: "SELF_DECLARED",
    memberSince: "2026-02-01T08:30:00Z",
    createdAt: "2026-02-01T08:30:00Z",
    updatedAt: "2026-02-01T08:30:00Z",
  },
  localListings: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "fa528602-2ab0-4867-b7fc-3d7e2a912eba",
          title: "شقة عائلية حديثة في الحي",
          category: "stay",
          price: 350,
          currency: "SAR",
          providerName: "qa-tester",
        },
      ],
      pageNumber: 0,
      pageSize: 8,
      totalElements: 1,
      totalPages: 1,
      last: true,
      empty: false,
    },
  },
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => fixtures.session),
}));

vi.mock("@/lib/api/community", () => ({
  getMyMembership: vi.fn(async () => ({ ok: true, status: 200, data: fixtures.membership })),
}));

vi.mock("@/lib/api/public", () => ({
  searchListings: vi.fn(async () => fixtures.localListings),
}));

/** Render a screen with its search params — all four screens share the
 * same props shape (the groups screen simply ignores the param). */
async function renderScreen(
  page: (props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }) => Promise<ReactNode>,
  sp: Record<string, string | string[] | undefined> = {},
) {
  return renderToStaticMarkup(await page({ searchParams: Promise.resolve(sp) }));
}

/* ─────────────────── SCREEN ② — سوق الحي والحراج ─────────────────── */

test("the market screen: hero + free-gifts rail + REAL bridge + the display grid, never links", async () => {
  const markup = await renderScreen(MarketPage);

  // The page hero with the design's title + the free-gifts rail.
  expect(markup).toContain("سوق الحي والحراج");
  expect(markup).toContain("ركن الإهداء: 3 مقتنيات مجانية");

  // THE REAL BRIDGE — the location-scoped read with a real detail link.
  expect(markup).toContain("إعلانات جيرانك الحقيقية");
  expect(markup).toContain('href="/listings/fa528602-2ab0-4867-b7fc-3d7e2a912eba"');

  // The display grid: the owner's own items, labeled, never links.
  expect(markup).toContain("معروضات الجيران");
  expect(markup).toContain("بيانات عرض");
  const grid = markup.match(/<ul class="hy-market-grid"[\s\S]*?<\/ul>/)?.[0];
  expect(grid).toBeDefined();
  expect(grid ?? "").toContain("مكتب دراسي خشبي بحالة ممتازة");
  expect(grid ?? "").toContain("مجاني — إهداء");
  expect(grid ?? "").not.toContain("href=");

  // The five category chips + the search box ride the REAL ?cat=/?q= reads.
  expect(markup).toContain('aria-label="تصنيفات السوق"');
  expect(markup).toContain('href="/neighborhood/market?cat=FREE"');
  expect(markup).toContain('name="q"');

  // The safe-transaction rules strip.
  expect(markup).toContain("نصائح بيع آمن");
});

test("the market screen's filters ride the server-side ?cat= and ?q= reads", async () => {
  const { searchListings } = await import("@/lib/api/public");
  // ?cat=FREE: only the free items render.
  const freeMarkup = await renderScreen(MarketPage, { cat: "FREE" });
  expect(freeMarkup).toContain("مكتب دراسي خشبي بحالة ممتازة");
  expect(freeMarkup).toContain("شتلات نعناع وريحان وزعتر");
  expect(freeMarkup).not.toContain("تكييف شباك 1.5 طن");

  // ?q= matches the text read: the AC unit by its title word.
  const qMarkup = await renderScreen(MarketPage, { q: "تكييف" });
  expect(qMarkup).toContain("تكييف شباك 1.5 طن");
  expect(qMarkup).not.toContain("مكتب دراسي خشبي");

  // The bridge read stays the unfiltered location-scoped call.
  expect(searchListings).toHaveBeenCalledWith(
    { locationId: fixtures.locationId },
    0,
    8,
  );
});

/* ─────────────────── SCREEN ③ — دليل الخدمات ─────────────────── */

test("the services screen: hero + the owner's featured card + the directory rows, never links", async () => {
  const markup = await renderScreen(ServicesPage);

  expect(markup).toContain("دليل الخدمات والتوصيات");

  // THE FEATURED ROW — the owner's own card.
  expect(markup).toContain("توصية الحي الأولى");
  expect(markup).toContain("أبو حاتم - صيانة التكييف المتقدمة");
  expect(markup).toContain("4.9");
  expect(markup).toContain("(31 تقييم من أهل الحي)");
  expect(markup).toContain("توصية د. خالد التميمي");

  // The directory rows — the S8 businesses contract, labeled, never links.
  expect(markup).toContain("أعمال وخدمات حيّك");
  const directory = markup.match(/<ul class="hy-directory-rows"[\s\S]*?<\/ul>/)?.[0];
  expect(directory).toBeDefined();
  expect(directory ?? "").toContain("دار الضيافة");
  expect(directory ?? "").not.toContain("href=");

  // The trades chips + the search box ride the REAL ?trade=/?q= reads.
  expect(markup).toContain('aria-label="تصنيفات الدليل"');
  expect(markup).toContain('href="/neighborhood/services?trade=COOLING"');
  expect(markup).toContain('name="q"');
});

test("the services screen's trades filter hides non-matching rows", async () => {
  const stayMarkup = await renderScreen(ServicesPage, { trade: "STAY" });
  expect(stayMarkup).toContain("دار الضيافة");
  expect(stayMarkup).not.toContain("أركان النظافة");
  // The featured cooling card hides under the STAY chip.
  expect(stayMarkup).not.toContain("توصية الحي الأولى");

  const coolingMarkup = await renderScreen(ServicesPage, { trade: "COOLING" });
  expect(coolingMarkup).toContain("توصية الحي الأولى");
  expect(coolingMarkup).not.toContain("دار الضيافة");
});

/* ─────────────────── SCREEN ④ — خريطة الحي وتنبيهات الأمان ─────────────────── */

test("the safety screen: the zone map + the incidents + the lost&found board", async () => {
  const markup = await renderScreen(SafetyPage);

  expect(markup).toContain("خريطة الحي وتنبيهات الأمان");

  // THE ZONE MAP — six blocks, one mine, all REAL server-side filter links.
  const map = markup.match(/<div class="hy-map-grid"[\s\S]*?<\/div>/)?.[0];
  expect(map).toBeDefined();
  expect((map ?? "").match(/<a class="hy-zone"/g)?.length).toBe(6);
  expect(map ?? "").toContain('class="hy-zone-mine">مربعي');
  expect(map ?? "").toContain('data-status="WORKS"');
  expect(map ?? "").toContain('data-status="NOTICE"');
  expect(markup).toContain('href="/neighborhood/safety?zone=');

  // The incidents with their zone chips + confirmations.
  expect(markup).toContain("تنبيهات الأمان");
  expect(markup).toContain("إغلاق جزئي بمسار شارع وادي السرحان");
  expect(markup).toContain("84 جارًا أكّد الملاحظة");

  // The lost&found board with both states.
  expect(markup).toContain("لوحة المفقودات");
  expect(markup).toContain("تم العثور عليه بنجاح");
  expect(markup).toContain("ما زال مفقوداً — نبحث عنه");

  // The legend rows + the display badges.
  expect(markup).toContain("بيانات عرض");
  expect(markup).toContain("آمن ومستقر");
});

test("the safety screen's ?zone= read filters the incidents to the block", async () => {
  const zoneMarkup = await renderScreen(SafetyPage, { zone: "مربع 5" });
  expect(zoneMarkup).toContain("تفعيل رادارات السرعة");
  expect(zoneMarkup).not.toContain("إغلاق جزئي بمسار شارع وادي السرحان");
  // The reset affordance appears only under an active filter.
  expect(zoneMarkup).toContain("كل المربعات");

  const allMarkup = await renderScreen(SafetyPage);
  expect(allMarkup).not.toContain("كل المربعات");
});

/* ─────────────────── مجموعات الجيران ─────────────────── */

test("the groups screen: the clubs with honest gated joins, never links", async () => {
  const markup = await renderScreen(GroupsPage);

  expect(markup).toContain("مجموعات الحي التخصصية");
  expect(markup).toContain("3 نوادٍ نشطة");
  const list = markup.match(/<ul class="hy-group-list"[\s\S]*?<\/ul>/)?.[0];
  expect(list).toBeDefined();
  expect(list ?? "").toContain("فريق دراجي ومشي النخيل");
  expect(list ?? "").toContain("مجلس أولياء أمور المدارس");
  expect(list ?? "").toContain("نادي قراء ومثقفي النخيل");
  expect(list ?? "").not.toContain("href=");
  // The join buttons are honestly gated (disabled, with the reason).
  expect(list ?? "").not.toContain('class="hy-btn hy-btn-soft">');
  expect((list ?? "").match(/disabled=""/g)?.length).toBe(3);
  expect(list ?? "").toContain("قريبًا — الانضمام للمجموعات بانتظار عقد الباك اند");
});

/* ─────────────────── The anonymous gates on every screen ─────────────────── */

test("every screen answers anonymous callers with the sign-in gate — no board render", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const market = await renderScreen(MarketPage);
  expect(market).toContain("هذا القسم لأعضاء الحارات");
  expect(market).not.toContain("hy-market-grid");
});
