"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Stripe-checkout launch button. Flag-gated by the server-side
 * isStripeEnabled() — the server passes `enabled`, and the client trusts it.
 * When `enabled` is false the button is disabled with clear copy so admins
 * don't chase a missing flow.
 */
export function StripeTopUpButton({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);

  if (!enabled) {
    return (
      <Button disabled title="Stripe is not yet enabled for Xtract.">
        Top up (coming soon)
      </Button>
    );
  }

  async function onTopUp() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: 1000 }),
      });
      if (!res.ok) {
        toast.error("Failed to start checkout");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={onTopUp} disabled={loading}>
      {loading ? "Redirecting..." : "Top up"}
    </Button>
  );
}
