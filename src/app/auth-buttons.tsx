"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * The sign-in entry. `callbackURL` controls where Better Auth returns
 * the member after the OAuth round trip (community surfaces pass their
 * own route so the flow resumes exactly where the gate stopped it);
 * the historical default `/profile` keeps every existing caller intact.
 */
export function SignInButton({ callbackURL = "/profile" }: { callbackURL?: string }) {
  return (
    <button
      type="button"
      className="button"
      data-variant="primary"
      onClick={() =>
        authClient.signIn.social({ provider: "marketplace-web", callbackURL })
      }
    >
      تسجيل الدخول
    </button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      تسجيل الخروج
    </button>
  );
}
