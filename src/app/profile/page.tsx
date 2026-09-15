import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "../auth-buttons";

// P2 proof page: session -> BFF proxy -> backend /me, all server-side.
export default async function ProfilePage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return (
      <main>
        <h1>Profile</h1>
        <p>
          Not signed in. <Link href="/">Sign in</Link>
        </p>
      </main>
    );
  }

  const appURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const meRes = await fetch(`${appURL}/api/backend/api/v1/users/me`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  const meStatus = meRes.status;
  const meBody = meStatus === 200 ? await meRes.json() : null;

  return (
    <main>
      <h1>Profile</h1>
      <p>Signed in as: {session.user.name || session.user.email}</p>
      <p>Backend /me status: {meStatus}</p>
      {meBody ? <pre>{JSON.stringify(meBody, null, 2)}</pre> : null}
      <p>
        <Link href="/">Home</Link> <SignOutButton />
      </p>
    </main>
  );
}
