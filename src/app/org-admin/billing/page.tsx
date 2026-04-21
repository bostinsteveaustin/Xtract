import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCreditBalance, resolveCreditRate } from "@/lib/billing/credit-rate";
import { isStripeEnabled } from "@/lib/config/flags";
import { StripeTopUpButton } from "@/components/org-admin/stripe-topup-button";
import { PlatformAdminAdjustmentForm } from "@/components/org-admin/platform-admin-adjustment-form";
import type { HybridRateConfig } from "@/lib/billing/types";

/**
 * /org-admin/billing — E-08 §4.7 organisation billing surface.
 *
 * Shows:
 *   * Live credit balance.
 *   * Effective rate per entitled Published Rig (base + override merge), so
 *     org admins know exactly what a Run will cost before submitting.
 *   * Recent ledger entries (paginated in Phase 6 — this is the first 50).
 *   * Top-up CTA. Stripe is flag-gated (XTRACT_STRIPE_ENABLED). Off ⇒ the
 *     button is disabled with copy directing the admin to their BridgingX
 *     contact; on ⇒ the button launches Stripe Checkout.
 *   * Platform-admin-only manual adjustment form, for pilot-phase invoicing
 *     before Stripe flips on.
 */
export default async function OrgBillingPage() {
  const auth = await requireOrgAdmin();
  if (auth.error) redirect("/org-admin");
  if (!auth.activeOrgId) return null;

  const admin = createAdminClient();
  const orgId = auth.activeOrgId;

  const balance = await getCreditBalance(admin, orgId);

  // Ledger — most recent 50. Pagination / export comes in Phase 6.
  const { data: ledgerRows } = await admin
    .from("credit_ledger")
    .select("id, entry_type, amount, reference, balance_after, created_at, run_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Bound-Rig rate matrix: entitled Published Rigs + Organisation Rigs owned
  // by this org. For each, show the effective (base merged with override)
  // rate against the Rig's current validated/experimental version.
  const { data: entitlements } = await admin
    .from("rig_entitlements")
    .select("rig_id")
    .eq("organization_id", orgId)
    .is("revoked_at", null);
  const { data: orgOwnedRigs } = await admin
    .from("rigs")
    .select("id")
    .eq("organization_id", orgId)
    .eq("tier", "organisation");

  const rigIds = Array.from(
    new Set<string>([
      ...((entitlements ?? []).map((e) => e.rig_id as string)),
      ...((orgOwnedRigs ?? []).map((r) => r.id as string)),
    ])
  );

  const rigRateRows: Array<{
    rigId: string;
    rigName: string;
    rigSlug: string;
    version: string;
    state: string;
    rate: HybridRateConfig | null;
    hasOverride: boolean;
  }> = [];

  if (rigIds.length > 0) {
    const { data: rigs } = await admin
      .from("rigs")
      .select("id, name, slug, current_version")
      .in("id", rigIds);
    const { data: versions } = await admin
      .from("rig_versions")
      .select("rig_id, version, state")
      .in("rig_id", rigIds);
    const { data: overrides } = await admin
      .from("rig_entitlements")
      .select("rig_id, credit_rate_override")
      .eq("organization_id", orgId)
      .is("revoked_at", null);

    const overrideMap = new Map<string, boolean>();
    for (const o of overrides ?? []) {
      overrideMap.set(
        o.rig_id as string,
        o.credit_rate_override !== null && o.credit_rate_override !== undefined
      );
    }

    for (const rig of rigs ?? []) {
      // Prefer the version matching rigs.current_version (what workspaces
      // bind against by default); fall back to latest validated/experimental.
      const rigVersions = (versions ?? []).filter((v) => v.rig_id === rig.id);
      const current =
        rigVersions.find((v) => v.version === rig.current_version)
        ?? rigVersions.find((v) => v.state === "validated")
        ?? rigVersions.find((v) => v.state === "experimental")
        ?? null;
      if (!current) continue;

      const rate = await resolveCreditRate(admin, orgId, rig.id, current.version);
      rigRateRows.push({
        rigId: rig.id,
        rigName: rig.name,
        rigSlug: rig.slug,
        version: current.version,
        state: current.state,
        rate,
        hasOverride: overrideMap.get(rig.id) ?? false,
      });
    }
  }

  const isPlatformAdmin = auth.platformRole === "platform_admin";
  const stripeOn = isStripeEnabled();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Current balance
          </div>
          <div className="mt-1 text-4xl font-semibold text-slate-900">
            {formatCredits(balance)}
          </div>
          <div className="mt-1 text-xs text-slate-500">credits</div>
        </Card>

        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Top up
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {stripeOn
              ? "Purchase credits via Stripe Checkout."
              : "Self-service top-up is not yet enabled. Contact your BridgingX account manager to arrange an adjustment."}
          </div>
          <div className="mt-4">
            <StripeTopUpButton enabled={stripeOn} />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Rates for your Rigs
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Cost of a Run on each bindable Rig. &ldquo;Override&rdquo; means your
          organisation has a custom rate negotiated with BridgingX; otherwise
          the published base rate applies.
        </p>
        {rigRateRows.length === 0 ? (
          <div className="text-sm text-slate-500">
            No Rig entitlements yet. Published Rigs are granted by the platform
            team; Organisation Rigs are authored under{" "}
            <Link href="/org-admin/rigs" className="text-[#0EA5A0] hover:underline">
              Rigs
            </Link>
            .
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rig</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Per document</TableHead>
                <TableHead>Per token</TableHead>
                <TableHead>Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rigRateRows.map((r) => (
                <TableRow key={r.rigId}>
                  <TableCell className="font-medium">
                    {r.rigName}
                    <div className="text-xs text-slate-500">{r.rigSlug}</div>
                  </TableCell>
                  <TableCell>
                    {r.version}
                    <Badge variant="outline" className="ml-2">
                      {r.state}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.rate ? formatCredits(r.rate.base_credits) : "—"}
                  </TableCell>
                  <TableCell>
                    {r.rate?.per_document !== null && r.rate !== null
                      ? formatCredits(r.rate.per_document ?? 0)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.rate?.per_token !== null && r.rate !== null
                      ? formatCredits(r.rate.per_token ?? 0)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.hasOverride ? (
                      <Badge>Custom</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Recent activity
        </h2>
        {ledgerRows?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance after</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">
                    {new Date(row.created_at as string).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.entry_type}</Badge>
                  </TableCell>
                  <TableCell
                    className={
                      Number(row.amount) < 0
                        ? "font-medium text-red-700"
                        : "font-medium text-emerald-700"
                    }
                  >
                    {Number(row.amount) > 0 ? "+" : ""}
                    {formatCredits(Number(row.amount))}
                  </TableCell>
                  <TableCell>{formatCredits(Number(row.balance_after))}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {row.reference ?? (row.run_id ? `run ${String(row.run_id).slice(0, 8)}` : "—")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-sm text-slate-500">No activity yet.</div>
        )}
      </Card>

      {isPlatformAdmin && (
        <Card className="border-amber-200 bg-amber-50/50 p-6">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Platform-admin tools
          </h2>
          <p className="mb-4 text-xs text-slate-600">
            Manual credit adjustments are for pilot-phase invoicing before
            Stripe is enabled. Every adjustment is audit-logged as{" "}
            <code className="rounded bg-slate-100 px-1">
              billing.adjustment_written
            </code>
            .
          </p>
          <PlatformAdminAdjustmentForm organizationId={orgId} />
        </Card>
      )}
    </div>
  );
}

function formatCredits(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}
