import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { WingTabBar } from "@/app/neighborhood/wing-tab-bar";

/**
 * The N1 bottom tab bar — the Nextdoor-2026 signature navigation. The
 * net asserts the six destinations, the icons + short labels, and the
 * PATH-SEGMENT active matching (the measured robots lesson: raw
 * prefix matching makes "/neighborhood/events" active for
 * "/neighborhood" — each item is active iff pathname === href OR
 * pathname startsWith(href + "/")). usePathname is mocked per test —
 * renderToStaticMarkup over a client leaf is safe (no action modules).
 */

const { setState, state } = vi.hoisted(() => {
  const state: { path: string } = { path: "/" };
  return {
    setState: (p: string) => {
      state.path = p;
    },
    state,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
}));

function render(): string {
  return renderToStaticMarkup(<WingTabBar />);
}

test("renders the six destinations as links with icons and short labels", () => {
  setState("/neighborhood");
  const markup = render();

  const tabs = markup.match(/<a class="hy-tab"[^>]*>/g) ?? [];
  expect(tabs.length).toBe(6);

  // The wing's own vocabulary in short form + the full aria labels.
  expect(markup).toContain("الخلاصة");
  expect(markup).toContain("الفعاليات");
  expect(markup).toContain("السوق");
  expect(markup).toContain("الخدمات");
  expect(markup).toContain("الأمان");
  expect(markup).toContain("المجموعات");
  expect(markup).toContain('aria-label="فعاليات وتجمعات الحي"');

  // The icons ride the design's own icon font.
  expect(markup).toContain("forum");
  expect(markup).toContain("storefront");
  expect(markup).toContain("groups");

  // The nav landmark is named for assistive tech.
  expect(markup).toContain('aria-label="أقسام حيّنا"');
});

test("the feed tab is active on the exact feed route ONLY — never on a sibling", () => {
  setState("/neighborhood");
  const markup = render();
  const active = markup.match(/<a class="hy-tab" data-active[^>]*>[\s\S]*?<\/a>/g) ?? [];
  expect(active.length).toBe(1);
  expect(active[0] ?? "").toContain('href="/neighborhood"');
  expect(active[0] ?? "").toContain('aria-current="page"');
});

test("a section route activates its own tab only (path-segment matching)", () => {
  setState("/neighborhood/market");
  const markup = render();
  const active = markup.match(/<a class="hy-tab" data-active[^>]*>[\s\S]*?<\/a>/g) ?? [];
  expect(active.length).toBe(1);
  expect(active[0] ?? "").toContain('href="/neighborhood/market"');

  // A DEEPER route under a section still activates that section.
  setState("/neighborhood/events/some-occasion");
  const deeper = render();
  const activeDeep = deeper.match(/<a class="hy-tab" data-active[^>]*>[\s\S]*?<\/a>/g) ?? [];
  expect(activeDeep.length).toBe(1);
  expect(activeDeep[0] ?? "").toContain('href="/neighborhood/events"');
});

test("the shell's secondary surfaces activate NO tab (they are not destinations)", () => {
  // /neighborhood/notifications and /neighborhood/me are header
  // affordances, not tab destinations — the bar shows no active tab
  // there (and the FEED tab must not steal them via raw prefix match).
  for (const path of ["/neighborhood/notifications", "/neighborhood/me"]) {
    setState(path);
    const markup = render();
    const active = markup.match(/<a class="hy-tab" data-active[^>]*>/g) ?? [];
    expect(active.length).toBe(0);
  }
});
