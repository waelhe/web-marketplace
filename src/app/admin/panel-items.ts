/**
 * لوحات التحكم — the panel registry (slice N2): the console's own
 * navigation vocabulary, shared by the client navigation (the sidebar
 * links + the mobile pill strip in panel-nav.tsx) and the server
 * surfaces (the overview's panels map). A plain module — no client
 * directive — so both worlds import the SAME single source (a constant
 * crossing the client boundary as a proxy is not callable — measured:
 * `PANEL_ITEMS.filter is not a function`).
 */

export const PANEL_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  short: string;
  icon: string;
}> = [
  { href: "/admin", label: "نظرة عامة", short: "النظرة العامة", icon: "dashboard" },
  { href: "/admin/moderation", label: "بلاغات الإشراف", short: "البلاغات", icon: "flag" },
  { href: "/admin/verification", label: "توثيق السكن", short: "التوثيق", icon: "verified_user" },
  { href: "/admin/users", label: "المستخدمون", short: "المستخدمون", icon: "group" },
  { href: "/admin/listings", label: "الإعلانات والمزوّدون", short: "الإعلانات", icon: "home_work" },
  { href: "/admin/bookings", label: "الحجوزات", short: "الحجوزات", icon: "event_note" },
  { href: "/admin/finance", label: "المالية", short: "المالية", icon: "payments" },
  { href: "/admin/catalog", label: "الفهرس والقواعد", short: "الفهرس", icon: "category" },
  { href: "/admin/audit", label: "التدقيق", short: "التدقيق", icon: "history" },
  { href: "/admin/reviews", label: "إشراف المراجعات", short: "المراجعات", icon: "rate_review" },
  { href: "/admin/settings", label: "إعدادات المنصة", short: "الإعدادات", icon: "settings" },
];
