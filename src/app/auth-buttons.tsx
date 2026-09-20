"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      type="button"
      className="button"
      data-variant="primary"
      onClick={() =>
        authClient.signIn.social({ provider: "marketplace-web", callbackURL: "/profile" })
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
