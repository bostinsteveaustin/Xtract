"use client";

import { useState, useTransition } from "react";
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
import { revokeEntitlement } from "@/app/admin/entitlements/actions";

export function RevokeEntitlementButton({
  entitlementId,
  orgName,
  rigName,
}: {
  entitlementId: string;
  orgName: string;
  rigName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await revokeEntitlement(entitlementId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Revoke failed");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-rose-700">{error}</span>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            Revoke
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke entitlement?</AlertDialogTitle>
            <AlertDialogDescription>
              {orgName} will lose the ability to bind new workspaces to {rigName}.
              Existing workspace bindings continue to work. To re-grant, create
              a new entitlement — revocation is not reversible on this row.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
