import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import AdminOverviewPage from "@/app/admin/page";

/**
 * لوحات التحكم — النظرة العامة (slice N2): the KPI row's automated
 * net — every number is the read's own totalElements (never invented),
 * the failure branch is the honest «—» card (the backend's own refusal
 * is data, not an exception), and the panels map carries the console's
 * full vocabulary minus the overview itself.
 */

const fixtures = vi.hoisted(() => ({
  queue: {
    ok: true,
    status: 200,
    data: {
      content: [
        {
          id: "646f386f-e502-4dc5-ab28-06975a29ad9d",
          targetType: "POST",
          targetId: "3e3e3e3e-3e3e-43e3-83e3-3e3e3e3e0005",
          reason: "SPAM",
          status: "OPEN",
          createdAt: "2026-09-30T10:00:00Z",
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    },
  },
  users: {
    ok: true,
    status: 200,
    data: { content: [], totalElements: 13, pageNumber: 0, pageSize: 1, totalPages: 13, last: false },
  },
  listings: {
    ok: true,
    status: 200,
    data: { content: [], totalElements: 24, pageNumber: 0, pageSize: 1, totalPages: 24, last: false },
  },
  bookings: {
    ok: true,
    status: 200,
    data: { content: [], totalElements: 16, pageNumber: 0, pageSize: 1, totalPages: 16, last: false },
  },
  payments: {
    ok: false,
    status: 403,
    problem: { title: "Unauthorized", detail: "AUTHZ-001", status: 403 },
  },
}));

vi.mock("@/lib/api/admin", () => ({
  getModerationQueue: vi.fn(async () => fixtures.queue),
  getUsers: vi.fn(async () => fixtures.users),
  getAllListings: vi.fn(async () => fixtures.listings),
  getAllBookings: vi.fn(async () => fixtures.bookings),
  getPaymentSummaries: vi.fn(async () => fixtures.payments),
}));

test("the KPI row renders each read's own totalElements — never invented", async () => {
  const element = await AdminOverviewPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve<Record<string, string | string[] | undefined>>({}),
  });
  const markup = renderToStaticMarkup(element);

  // The four live numbers — each its own panel door.
  expect(markup).toContain("بلاغات مفتوحة");
  expect(markup).toContain("13");
  expect(markup).toContain("المستخدمون");
  expect(markup).toContain("24");
  expect(markup).toContain("الإعلانات");
  expect(markup).toContain("16");
  expect(markup).toContain("الحجوزات");

  // The payments read failed 403 — the honest «—» card with the
  // backend's own code, NOT a fabricated zero.
  expect(markup).toContain("أقساط الدفع");
  expect(markup).toContain("تعذّرت القراءة (رمز 403)");

  // The queue head renders the open report's own row.
  expect(markup).toContain("رأس طابور البلاغات");
  expect(markup).toContain("مفتوح");
  expect(markup).toContain("محتوى مزعج/إعلاني");

  // The panels map — the full console vocabulary minus the overview
  // itself (the map's own filter).
  expect(markup).toContain("بلاغات الإشراف");
  expect(markup).toContain("المستخدمون");
  expect(markup).toContain("الإعلانات والمزوّدون");
  expect(markup).toContain("المالية");
  expect(markup).toContain("الفهرس والقواعد");
  expect(markup).toContain("التدقيق");
  // The map never links the overview itself (its own filter).
  expect(markup).not.toContain('href="/admin"');
});
