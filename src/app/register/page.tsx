import type { Metadata } from "next";
import { RegisterForm } from "./forms";

/**
 * The public registration page (charter J1 — "رحلة الانضمام", slice S1).
 * Public conversion surface: no session gate, no data read — the page is
 * a static shell + the public write form, so it renders identically for
 * crawlers and visitors (the browse-first SEO policy is untouched; this
 * route adds no backend read to the render path).
 */

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابك في السوق: احفظ بحوثك، راسل أصحاب الإعلانات، واحجز مباشرة",
};

export default function RegisterPage() {
  return (
    <main>
      <h1>إنشاء حساب</h1>
      <p className="page-note">
        بالتسجيل تصبح عضواً في السوق: تواصل مع أصحاب الإعلانات، احفظ بحوثك
        وتنبيهاتها، احجز أماكن الإقامة وقيّم تجربتك — وابدأ كمزوّد متى شئت.
      </p>
      <RegisterForm />
    </main>
  );
}
