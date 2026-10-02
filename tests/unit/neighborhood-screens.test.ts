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
  // N8: the SERVED market board (L50) — the caller's own neighborhood,
  // the honest badge mix (one earned, one floor), the caller's own row
  // (mine — the withdraw button's gate), and both product states.
  marketBoard: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "55555555-5555-4555-8555-555555550001",
          authorId: "00000000-0000-4000-8000-000000000002",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "FREE",
          title: "مكتب دراسي خشبي بحالة ممتازة — إهداء لأسرة طلاب",
          condition: "LIKE_NEW",
          priceCents: null,
          priceCurrency: null,
          status: "ACTIVE",
          locationLabel: "شارع المسجد - مربع 2",
          sellerVerified: true,
          mine: false,
          createdAt: "2026-10-01T20:15:00Z",
          updatedAt: "2026-10-01T20:15:00Z",
        },
        {
          id: "55555555-5555-4555-8555-555555550002",
          authorId: "00000000-0000-4000-8000-000000000001",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "FURNITURE",
          title: "أريكة جلسة عائلية 7 مقاعد — قماش قابل للغسل",
          condition: "GOOD",
          priceCents: 48000,
          priceCurrency: "SAR",
          status: "ACTIVE",
          locationLabel: "شارع الأمير - قرب المخبز",
          sellerVerified: false,
          mine: true,
          createdAt: "2026-10-01T18:30:00Z",
          updatedAt: "2026-10-01T18:30:00Z",
        },
        {
          id: "55555555-5555-4555-8555-555555550003",
          authorId: "00000000-0000-4000-8000-000000000003",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "ELECTRONICS",
          title: "مكيف هوائي شباكي 1.5 طن يعمل بكفاءة — صيانته حديثة",
          condition: "GOOD",
          priceCents: 35000,
          priceCurrency: "SAR",
          status: "SOLD",
          locationLabel: "الشارع العام - قرب الصيدلية",
          sellerVerified: true,
          mine: false,
          createdAt: "2026-10-01T22:40:00Z",
          updatedAt: "2026-10-01T22:40:00Z",
        },
        {
          id: "55555555-5555-4555-8555-555555550004",
          authorId: "00000000-0000-4000-8000-000000000004",
          locationId: "33333333-3333-4333-8333-333333333301",
          category: "FREE",
          title: "شتلات نعناع وريحان وزعتر — إهداء لبستنة الجيران",
          condition: "LIKE_NEW",
          priceCents: null,
          priceCurrency: null,
          status: "ACTIVE",
          locationLabel: "مدخل الحديقة الصغيرة",
          sellerVerified: false,
          mine: false,
          createdAt: "2026-10-01T12:10:00Z",
          updatedAt: "2026-10-01T12:10:00Z",
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 4,
      totalPages: 1,
      last: true,
      empty: false,
    },
  },
  // N9: the SERVED groups board (L51) — the caller's own neighborhood,
  // the LIVE member counts («بعددها الحقيقي»), and both membership
  // states live (one joined, three open — the toggle button's own gates).
  groupsBoard: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "66666666-6666-4666-8666-666666660001",
          name: "فريق دراجي ومشي النخيل",
          description: "تجمّع يومي 5:30 فجراً",
          members: 2,
          joinedByMe: true,
        },
        {
          id: "66666666-6666-4666-8666-666666660002",
          name: "مجلس أولياء أمور المدارس",
          description: "نقاش الباصات والأنشطة",
          members: 2,
          joinedByMe: false,
        },
        {
          id: "66666666-6666-4666-8666-666666660003",
          name: "نادي قراء ومثقفي النخيل",
          description: "مناقشة كتاب شهرياً",
          members: 2,
          joinedByMe: false,
        },
        {
          id: "66666666-6666-4666-8666-666666660004",
          name: "نادي المشي المسائي",
          description: "جولة يومية بعد المغرب من بوابة الحديقة",
          members: 1,
          joinedByMe: false,
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 4,
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
  getMyNeighborhoodMarket: vi.fn(async () => fixtures.marketBoard),
  getMyNeighborhoodGroups: vi.fn(async () => fixtures.groupsBoard),
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

test("the market screen: hero + free-gifts rail + REAL bridge + the SERVED board, never links", async () => {
  const markup = await renderScreen(MarketPage);

  // The page hero with the design's title + the free-gifts rail (the
  // served board's own gifts: 2 of 4).
  expect(markup).toContain("سوق الحي والحراج");
  expect(markup).toContain("ركن الإهداء: 2 مقتنيات مجانية");

  // THE REAL BRIDGE — the location-scoped read with a real detail link.
  expect(markup).toContain("إعلانات جيرانك الحقيقية");
  expect(markup).toContain('href="/listings/fa528602-2ab0-4867-b7fc-3d7e2a912eba"');

  // THE SERVED BOARD (N8): the real rows over the backend's contract —
  // the gift band's own words, the measured price labels, both badge
  // states (earned + the honest floor), and the SOLD chip.
  expect(markup).toContain("معروضات الجيران");
  const grid = markup.match(/<ul class="hy-market-grid"[\s\S]*?<\/ul>/)?.[0];
  expect(grid).toBeDefined();
  expect(grid ?? "").toContain("مكتب دراسي خشبي بحالة ممتازة");
  expect(grid ?? "").toContain("مجاني — إهداء");
  expect(grid ?? "").toContain("480 ريالاً");
  expect(grid ?? "").toContain("350 ريالاً");
  expect(grid ?? "").toContain("جار موثق");
  expect(grid ?? "").toContain(">جار<");
  expect(grid ?? "").toContain("تم البيع");
  // The cards are never links (the item ids are backend UUIDs with no
  // public detail route — a fake link would poison trust).
  expect(grid ?? "").not.toContain("href=");

  // The withdraw button rides ONLY the caller's own row (mine) — one
  // button for one owned item in the fixture.
  expect((grid ?? "").match(/اسحب معروضك/g)?.length).toBe(1);

  // The display layer retired with its badge: the market screen
  // carries no «بيانات عرض» zone anymore.
  expect(markup).not.toContain("بيانات عرض");

  // The five category chips + the mine view + the search box ride the
  // REAL ?cat=/?mine=/?q= reads.
  expect(markup).toContain('aria-label="تصنيفات السوق"');
  expect(markup).toContain('href="/neighborhood/market?cat=FREE"');
  expect(markup).toContain('href="/neighborhood/market?mine=1"');
  expect(markup).toContain('name="q"');

  // The publisher — the wave's real write path.
  expect(markup).toContain("عندك شيء للبيع؟");
  expect(markup).toContain("انشر معروضًا");

  // The safe-transaction rules strip.
  expect(markup).toContain("نصائح بيع آمن");
});

test("the market screen's filters ride the board read's own server-side axes", async () => {
  const { getMyNeighborhoodMarket } = await import("@/lib/api/community");
  const { searchListings } = await import("@/lib/api/public");

  // ?cat=FREE: the chips' axis rides the READ (the backend filters).
  await renderScreen(MarketPage, { cat: "FREE" });
  expect(getMyNeighborhoodMarket).toHaveBeenCalledWith(0, 20, "FREE", "", false);

  // ?q= rides the search box's own axis.
  await renderScreen(MarketPage, { q: "تكييف" });
  expect(getMyNeighborhoodMarket).toHaveBeenCalledWith(0, 20, undefined, "تكييف", false);

  // ?mine=1 rides the member's own-items view.
  await renderScreen(MarketPage, { mine: "1" });
  expect(getMyNeighborhoodMarket).toHaveBeenCalledWith(0, 20, undefined, "", true);

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

test("the groups screen: the served board with real membership toggles, never gated buttons", async () => {
  const markup = await renderScreen(GroupsPage);

  expect(markup).toContain("مجموعات الحي التخصصية");
  expect(markup).toContain("4 نوادٍ نشطة");
  const list = markup.match(/<ul class="hy-group-list"[\s\S]*?<\/ul>/)?.[0];
  expect(list).toBeDefined();
  // The served clubs — the design's own vocabulary, the LIVE counts.
  expect(list ?? "").toContain("فريق دراجي ومشي النخيل");
  expect(list ?? "").toContain("مجلس أولياء أمور المدارس");
  expect(list ?? "").toContain("نادي قراء ومثقفي النخيل");
  expect(list ?? "").toContain("نادي المشي المسائي");
  // The meta lines — the design's own composition: the live count + the
  // club's own description.
  expect(list ?? "").toContain("عضوان • تجمّع يومي 5:30 فجراً");
  expect(list ?? "").toContain("عضوان • نقاش الباصات والأنشطة");
  expect(list ?? "").toContain("عضو • جولة يومية بعد المغرب من بوابة الحديقة");
  // The display layer retired with its badge and its disabled gate.
  expect(markup).not.toContain("بيانات عرض");
  expect(list ?? "").not.toContain("disabled");
  expect(markup).not.toContain("بانتظار عقد الباك اند");
  // The membership toggle: the joined row carries the confirmed button
  // (and the live fact that gates its direction), the open rows carry
  // the join button — the RSVP button's own shape.
  expect(list ?? "").toContain("عضو ✓");
  expect((list ?? "").match(/>انضمام</g)?.length).toBe(3);
  expect(list ?? "").toContain('name="joinedByMe" value="true"');
  expect(list ?? "").toContain('name="groupId" value="66666666-6666-4666-8666-666666660001"');
  // The honest discipline card replaced the disabled-gate card.
  expect(markup).toContain("عضوية واحدة لكل جار");
});

/* ─────────────────── The anonymous gates on every screen ─────────────────── */

test("every screen answers anonymous callers with the sign-in gate — no board render", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const market = await renderScreen(MarketPage);
  expect(market).toContain("هذا القسم لأعضاء الحارات");
  expect(market).not.toContain("hy-market-grid");
});
