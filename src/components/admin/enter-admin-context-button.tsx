"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface Props {
  orgSlug: string;
  orgName: string;
}

/**
 * "Enter admin context for X" — client-side button. Posts to the enter-context
 * API, which sets the cookie + writes an audit entry + starts the 60-min timer,
 * then refreshes the page so the red banner appears.
 */
export function EnterAdminContextButton({ orgSlug, orgName }: Props) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  async function enter() {
    if (
      !confirm(
        `Enter admin context for ${orgName}?\n\nYou will be able to read and write data in this organisation for 60 minutes. All actions will be tagged in the cross-tenant audit log.`
      )
    ) {
      return;
    }
    setEntering(true);
    try {
      const res = await fetch(
        `/api/admin/enter-context/${encodeURIComponent(orgSlug)}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Failed: ${body.error ?? res.statusText}`);
        return;
      }
      router.refresh();
    } finally {
      setEntering(false);
    }
  }

  return (
    <Button
      onClick={enter}
      disabled={entering}
      variant="default"
      className="bg-[#FB3970] text-white hover:bg-[#FB3970]/90"
    >
      <ShieldAlert className="mr-2 h-4 w-4" />
      {entering ? "Entering…" : "Enter admin context"}
    </Button>
  );
}
