"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  targetOrganizationName: string;
  expiresAt: string;
}

/**
 * Persistent red banner shown when a platform role holder has entered
 * admin-context for a different org than their own. Per E-08 §5.4 the
 * banner must be visible on every page in admin mode.
 */
export function AdminContextBanner({ targetOrganizationName, expiresAt }: Props) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function exit() {
    setExiting(true);
    try {
      await fetch("/api/admin/exit-context", { method: "POST" });
      router.refresh();
    } finally {
      setExiting(false);
    }
  }

  const minutesLeft = Math.max(
    0,
    Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000)
  );

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[#FB3970]/40 bg-[#FB3970] px-4 py-2 text-white shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Admin context active for <strong>{targetOrganizationName}</strong> —
          expires in {minutesLeft} min
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={exit}
        disabled={exiting}
        className="bg-white/20 text-white hover:bg-white/30"
      >
        {exiting ? "Exiting…" : "Exit admin context"}
      </Button>
    </div>
  );
}
