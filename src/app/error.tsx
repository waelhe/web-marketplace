"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Error boundary (file-conventions/error): MUST be a Client Component.
// Next 16.3.5 props: error (with digest) + retry() — retry re-fetches and
// re-renders the boundary children (reference prefers it over reset()).
// Server-side errors arrive as a generic message + digest identifier only,
// which is safe to surface as-is. Visual language is the Task-2 Button
// (variant/size/type props only, R19) + the pre-existing .page-note; the
// contract (props, digest logging, retry) is unchanged.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <h1>حدث خطأ غير متوقع</h1>
      <p className="page-note">
        {error.digest
          ? `معرّف الخطأ: ${error.digest}`
          : "تعذّر إكمال هذا الجزء من الصفحة."}
      </p>
      <p>
        <Button variant="primary" size="md" type="button" onClick={() => retry()}>
          إعادة المحاولة
        </Button>{" "}
        <Link href="/">العودة إلى الصفحة الرئيسية</Link>
      </p>
    </main>
  );
}
