import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignInButton, SignOutButton } from "./auth-buttons";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main>
      <h1>Marketplace Web</h1>
      {session ? (
        <>
          <p>Signed in as: {session.user.name || session.user.email}</p>
          <p>
            <Link href="/profile">Profile (reads backend /me via BFF)</Link>
          </p>
          <SignOutButton />
        </>
      ) : (
        <>
          <p>Not signed in.</p>
          <SignInButton />
        </>
      )}
    </main>
  );
}
