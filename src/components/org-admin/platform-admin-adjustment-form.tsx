"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Platform-admin-only manual credit adjustment form. Signed amount — positive
 * to add credits (e.g. pilot grant), negative to remove (e.g. correcting a
 * duplicate purchase). Reference is mandatory so every adjustment has a
 * human-readable reason in the ledger and audit log.
 *
 * The authorisation check is server-side in /api/org-admin/billing/adjustments.
 * This form just collects + submits; no platform_admin gate here.
 */
export function PlatformAdminAdjustmentForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error("Amount must be a non-zero number");
      return;
    }
    if (!reference.trim()) {
      toast.error("Reference is required");
      return;
    }
    start(async () => {
      const res = await fetch("/api/org-admin/billing/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          amount: parsed,
          reference: reference.trim(),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error ?? "Adjustment failed");
        return;
      }
      toast.success("Adjustment written");
      setAmount("");
      setReference("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="adj-amount">Amount (signed)</Label>
          <Input
            id="adj-amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000 or -250"
          />
        </div>
        <div>
          <Label htmlFor="adj-reference">Reference</Label>
          <Input
            id="adj-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Pilot grant — Pay.UK invoice #123"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Writing..." : "Apply adjustment"}
      </Button>
    </form>
  );
}
