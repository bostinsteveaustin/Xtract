"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

interface Props {
  orgSlug: string;
  orgName: string;
}

/**
 * "Enter admin context for X" — client-side button with a non-blocking
 * confirmation. Posts to the enter-context API, which sets the cookie,
 * writes the audit entry, and starts the 60-min timer. The page then refreshes
 * so the red banner appears.
 */
export function EnterAdminContextButton({ orgSlug, orgName }: Props) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const [open, setOpen] = useState(false);

  async function enter() {
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
      setOpen(false);
      router.refresh();
    } finally {
      setEntering(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          className="bg-[#FB3970] text-white hover:bg-[#FB3970]/90"
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          Enter admin context
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter admin context for {orgName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be able to read and write data in this organisation for 60
            minutes. All actions will be tagged in the cross-tenant audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={entering}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              enter();
            }}
            disabled={entering}
            className="bg-[#FB3970] text-white hover:bg-[#FB3970]/90"
          >
            {entering ? "Entering…" : "Enter admin context"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
