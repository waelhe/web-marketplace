"use client";

// Client-only share island (Web Share API with copy-link fallback): no
// backend contract, no session, no fetch — always allowed on the public
// detail page. Lives in the PageHeader actions slot; the button reuses
// the Task-2 Button (variant/size props only — R19), the status line the
// pre-existing .page-note. No new tokens.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function ShareButton({ title }: { title: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onShare() {
    const url = window.location.href;
    const nav = window.navigator as Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
      } catch {
        // The user dismissed the sheet — stay silent, no fallback noise.
      }
      return;
    }
    try {
      await window.navigator.clipboard.writeText(url);
      setStatus("تم نسخ الرابط");
    } catch {
      setStatus("تعذّر نسخ الرابط — انسخه من شريط العنوان");
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" type="button" onClick={onShare}>
        <Icon name="share" /> مشاركة
      </Button>
      {status ? (
        <p className="page-note" role="status">
          {status}
        </p>
      ) : null}
    </>
  );
}
