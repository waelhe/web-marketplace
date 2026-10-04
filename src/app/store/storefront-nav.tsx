"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * شريط التنقّل العائم + ورقة النشر — the attached design's app chrome:
 * the floating pill nav (الحي / السوق / نشر / العقار / دليل الأعمال —
 * every destination a REAL platform surface) and the publish bottom
 * sheet (the design's five intents, each an honest link to the
 * platform's real publish lanes — the L50 market publish and the
 * neighborhood feed composer).
 *
 * The sheet is a NATIVE <dialog> (the house modal discipline — the
 * market-create precedent): free focus trap, free ESC, free focus
 * return to the FAB, skinned as the design's bottom sheet.
 */

/** The design's five publish intents — each mapped to its real lane. */
const PUBLISH_INTENTS: ReadonlyArray<{
  href: string;
  icon: string;
  title: string;
  chip?: string;
  desc: string;
}> = [
  {
    href: "/neighborhood/market",
    icon: "inventory_2",
    title: "إضافة منتج لمتجري أو نشاطي",
    chip: "سريع ٦٠ ثانية",
    desc: "للتجار والأسر المنتجة — صورة، تسعير، وخصم الجيران",
  },
  {
    href: "/neighborhood/market",
    icon: "bolt",
    title: "تفعيل عرض أو خصم لحظي",
    chip: "تنبيه حي فوري",
    desc: "مخابز ومحلات الحي — بيع سريع وتخفيض قبل الإغلاق",
  },
  {
    href: "/neighborhood/market",
    icon: "sell",
    title: "بيع غرض مستعمل بحراج الحي",
    chip: "معاينة منزلية",
    desc: "أثاث، أجهزة إلكترونية، مستلزمات أطفال — لأقرب جار",
  },
  {
    href: "/neighborhood/market",
    icon: "featured_seasonal_and_gifts",
    title: "إهداء غرض مجاناً لوجه الله",
    chip: "تكافل الحي",
    desc: "تدوير الأثاث والكتب والألعاب بين عوائل الحي دون مقابل",
  },
  {
    href: "/neighborhood",
    icon: "campaign",
    title: "استفسار أو تنبيه مجتمعي",
    desc: "سؤال أهل الحي، تنبيه خدمات صيانة، أو توصية متجر",
  },
];

export function StorefrontNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const storeActive = pathname === "/store" || pathname.startsWith("/store/");

  // Hydration beacon: on a cold dev server the SSR markup looks
  // interactive seconds before React attaches — a pre-hydration click
  // on the FAB is silently lost (measured on CI 2026-10-04: the dialog
  // stayed closed across the whole retry window). The e2e net waits
  // for this flag before clicking, so the click always lands on a
  // live handler — no retry masks, ever.
  useEffect(() => {
    navRef.current?.setAttribute("data-mounted", "true");
  }, []);

  // The native dialog owns open/close state mirroring: showModal on the
  // React open, and the dialog's own close (ESC / backdrop / intent
  // click) flows back through onClose.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (open && !sheet.open) sheet.showModal();
    if (!open && sheet.open) sheet.close();
  }, [open]);

  return (
    <>
      <nav ref={navRef} className="suq-nav" aria-label="تنقّل سوق الحي">
        <Link
          className="suq-nav-item"
          href="/neighborhood"
          aria-current={pathname === "/neighborhood" ? "page" : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            cottage
          </span>
          الحي
        </Link>
        <Link
          className="suq-nav-item"
          href="/store"
          aria-current={storeActive ? "page" : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            storefront
          </span>
          السوق
        </Link>

        <span className="suq-nav-fab-slot">
          <button
            type="button"
            className="suq-nav-fab"
            aria-label="نشر جديد في الحي"
            aria-expanded={open}
            aria-controls="suq-publish-sheet"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
          </button>
          <span className="suq-nav-fab-label">نشر</span>
        </span>

        <Link
          className="suq-nav-item"
          href="/listings"
          aria-current={pathname === "/listings" ? "page" : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            apartment
          </span>
          العقار
        </Link>
        <Link
          className="suq-nav-item"
          href="/neighborhood/services"
          aria-current={pathname === "/neighborhood/services" ? "page" : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            local_convenience_store
          </span>
          دليل الأعمال
        </Link>
      </nav>

      <dialog
        ref={sheetRef}
        id="suq-publish-sheet"
        className="suq-sheet"
        aria-label="نشر وتفاعل فوري بالحي"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Backdrop click closes (the native dialog's own trick: a
          // click that lands on the dialog element itself is backdrop).
          if (e.target === sheetRef.current) setOpen(false);
        }}
      >
        <div className="suq-sheet-panel">
          <div className="suq-sheet-handle" aria-hidden="true" />
          <div className="suq-sheet-head">
            <span className="suq-sheet-head-icon" aria-hidden="true">
              <span className="material-symbols-outlined">add_circle</span>
            </span>
            <span>
              <h2 className="suq-sheet-title">نشر وتفاعل فوري بالحي</h2>
              <p className="suq-sheet-sub">
                <span className="suq-dot" aria-hidden="true" />
                سوق الحي التجاري والخدمي
              </p>
            </span>
            <button
              type="button"
              className="suq-sheet-close"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <ul className="suq-intent-list">
            {PUBLISH_INTENTS.map((intent) => (
              <li key={`${intent.icon}-${intent.title}`}>
                <Link
                  className="suq-intent"
                  href={intent.href}
                  onClick={() => setOpen(false)}
                >
                  <span className="suq-intent-body">
                    <span className="suq-intent-icon" aria-hidden="true">
                      <span className="material-symbols-outlined">{intent.icon}</span>
                    </span>
                    <span className="suq-intent-text">
                      <span className="suq-intent-title-row">
                        <span className="suq-intent-title">{intent.title}</span>
                        {intent.chip ? <span className="suq-intent-chip">{intent.chip}</span> : null}
                      </span>
                      <span className="suq-intent-desc">{intent.desc}</span>
                    </span>
                  </span>
                  <span className="suq-intent-arrow" aria-hidden="true">
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
