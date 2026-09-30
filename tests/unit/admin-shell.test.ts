import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import AdminLayout from "@/app/admin/layout";
import { getSession } from "@/lib/dal";

/**
 * لوحات التحكم — the console shell's automated net (slice N2): the
 * signed-in branch (the shell furniture — the header brand, the
 * operator chip with the session's own initials, the authority note)
 * and the anonymous branch (the sign-in gate INSTEAD of the panels —
 * the children never render, so no panel read ever fires for a
 * visitor). The same proven pattern as neighborhood-shell.test.ts:
 * .ts (no JSX — a marker string rides children), fonts + the client
 * navigation stubbed (the active matching is the e2e round's business
 * — the browser owns the URL).
 */

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "--font-manrope" }),
  Plus_Jakarta_Sans: () => ({ variable: "--font-jakarta" }),
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-00000000000a",
    name: "مشرف المنصة",
    email: "admin.demo@marketplace.local",
  })),
}));

vi.mock("@/app/admin/panel-nav", () => ({
  PanelNavSide: () => null,
  PanelNavStrip: () => null,
}));

// The sign-out button rides useRouter (a client hook needing the app
// router's context) — stubbed the same way the fonts are: the shell's
// business here is the furniture, not the router.
vi.mock("@/app/auth-buttons", async () => {
  const { createElement } = await import("react");
  return {
    SignInButton: () => createElement("button", null, "تسجيل الدخول"),
    SignOutButton: () => createElement("button", null, "تسجيل الخروج"),
  };
});

test("the signed-in shell carries the console furniture + the authority note", async () => {
  const element = await AdminLayout({ children: "PANEL-CONTENT-MARKER" });
  const markup = renderToStaticMarkup(element);

  // The console brand — the header's own vocabulary.
  expect(markup).toContain("لوحات التحكم");
  expect(markup).toContain("Marketplace — وحدة الإدارة");

  // The operator chip — the session's own name + initials (no invented
  // identity, no role claim — the backend's grant stays the backend's).
  expect(markup).toContain("مشرف المنصة");
  expect(markup).toContain("م ا");
  expect(markup).not.toContain("ROLE_ADMIN");

  // The authority note — the honest contract (the 403 words are data).
  expect(markup).toContain("السلطة على الخلفي");
  expect(markup).toContain("كلماته الحرفية");

  // The sign-out affordance is present for the operator, and the
  // panels render for the operator (the marker child went through).
  expect(markup).toContain("تسجيل الخروج");
  expect(markup).toContain("PANEL-CONTENT-MARKER");

  // The shell rides the wing's own design system scope.
  expect(markup).toContain("hy-adm");
});

test("the anonymous branch renders the sign-in gate INSTEAD of the panels", async () => {
  vi.mocked(getSession).mockResolvedValueOnce(null);
  const element = await AdminLayout({ children: "PANEL-CONTENT-MARKER" });
  const markup = renderToStaticMarkup(element);

  // The gate's own words.
  expect(markup).toContain("اللوحات للحسابات الإدارية — سجّل الدخول أولًا.");
  expect(markup).toContain("تسجيل الدخول");

  // The children never rendered (the gate replaces them — a visitor
  // fires NO panel read).
  expect(markup).not.toContain("PANEL-CONTENT-MARKER");
});
