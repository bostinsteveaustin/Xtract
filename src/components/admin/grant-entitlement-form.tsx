"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { grantEntitlement } from "@/app/admin/entitlements/actions";

/**
 * Grant a Published Rig entitlement to an organisation. Server action
 * validates Published-tier and uniqueness; this form just collects inputs.
 */
export function GrantEntitlementForm({
  organisations,
  publishedRigs,
}: {
  organisations: Array<{ id: string; name: string; slug: string }>;
  publishedRigs: Array<{ id: string; name: string; slug: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await grantEntitlement(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Grant failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="organization_id">Organisation</Label>
          <select
            id="organization_id"
            name="organization_id"
            required
            defaultValue=""
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rig_id">Published Rig</Label>
          <select
            id="rig_id"
            name="rig_id"
            required
            defaultValue=""
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {publishedRigs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {error && <span className="text-xs text-rose-700">{error}</span>}
        <Button
          type="submit"
          disabled={isPending}
          className="ml-auto bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
        >
          Grant
        </Button>
      </div>
    </form>
  );
}
