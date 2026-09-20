import Link from "next/link";
import type { Metadata } from "next";

// not-found.js: no props, may export metadata (file-conventions/not-found).
// Serves unmatched routes at the root level (Arabic UI, RTL inherits).
export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
};

export default function NotFound() {
  return (
    <main>
      <h1>٤٠٤ — الصفحة غير موجودة</h1>
      <p className="page-note">
        العنوان الذي طلبته غير موجود أو تم نقله.
      </p>
      <p>
        <Link href="/">العودة إلى الصفحة الرئيسية</Link>
      </p>
    </main>
  );
}
