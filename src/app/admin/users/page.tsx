import type { Metadata } from "next";
import Link from "next/link";
import { getUsers } from "@/lib/api/admin";
import { ADMIN_USERS_PAGE_SIZE } from "@/lib/api/admin-contract";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import {
  PseudonymizeForm,
  PurgeAuditHistoryForm,
  PurgeContentForm,
  UserStatusForm,
  UserRoleForm,
} from "../forms";

/**
 * لوحة المستخدمين (slice N2): the accounts administration — the S6
 * console's users section on its own panel. The list read + the five
 * account commands (role, status, pseudonymize, purge content, purge
 * audit history) ride the same admin contract verbatim, with the
 * backend's own dictionaries and literal bounds.
 */

export const metadata: Metadata = {
  title: "المستخدمون",
  robots: { index: false },
};

export default async function UsersPanelPage() {
  const users = await getUsers(0, ADMIN_USERS_PAGE_SIZE);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="المستخدمون"
        note={
          <>
            قائمة الحسابات مع أدوارها — وأوامر الدور والحالة والتجنّي وتطهير
            المحتوى وسجل التدقيق، كلها بمعاجم الخلفي وحدوده الحرفية.
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="users-heading">
        <h2 id="users-heading">الحسابات</h2>
        {users.ok ? (
          users.data.content.length === 0 ? (
            <EmptyState title="لا مستخدمون" />
          ) : (
            <ul className="feed-list">
              {users.data.content.map((user) => (
                <li key={user.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="الدور">
                      {user.role}
                    </span>
                    <span>·</span>
                    <span>{user.displayName ?? user.email ?? "بلا اسم ظاهر"}</span>
                    <span>·</span>
                    <span>{formatDateTime(user.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>user: {user.id}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={users.problem} status={users.status} what="المستخدمين" />
        )}
      </section>

      <section className="card hy-adm-section" aria-labelledby="users-commands-heading">
        <h2 id="users-commands-heading">أوامر الحساب</h2>
        <p className="page-note">
          كل أمر يعمل على معرّف مستخدم من الصفوف أعلاه — حدود الخلفي نفسها.
        </p>
        <UserRoleForm />
        <UserStatusForm />
        <PseudonymizeForm />
        <PurgeContentForm />
        <PurgeAuditHistoryForm />
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
