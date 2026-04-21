import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GrantEntitlementForm } from "@/components/admin/grant-entitlement-form";
import { RevokeEntitlementButton } from "@/components/admin/revoke-entitlement-button";

/**
 * Rig entitlements (E-08 §4.4, §9.1 Table 21). Lists active + historical
 * grants of Published Rigs to organisations.
 */
export default async function EntitlementsPage() {
  const admin = createAdminClient();

  const [entsRes, orgsRes, rigsRes] = await Promise.all([
    admin
      .from("rig_entitlements")
      .select(
        "id, organization_id, rig_id, granted_at, revoked_at, granted_by_user_id, revoked_by_user_id"
      )
      .order("granted_at", { ascending: false }),
    admin
      .from("organizations")
      .select("id, name, slug, status")
      .order("name", { ascending: true }),
    admin
      .from("rigs")
      .select("id, name, slug, current_state, current_version")
      .eq("tier", "published")
      .order("name", { ascending: true }),
  ]);

  const entitlements = entsRes.data ?? [];
  const orgs = orgsRes.data ?? [];
  const rigs = rigsRes.data ?? [];

  const orgMap = new Map(orgs.map((o) => [o.id, o]));
  const rigMap = new Map(rigs.map((r) => [r.id, r]));

  const active = entitlements.filter((e) => !e.revoked_at);
  const revoked = entitlements.filter((e) => !!e.revoked_at);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Platform
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Entitlements</h1>
        <p className="mt-1 text-sm text-slate-600">
          Which organisations are licensed to bind which Published Rigs.
          Organisation-tier rigs don&apos;t need entitlements — members see
          them by default.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Grant new entitlement
        </h2>
        <GrantEntitlementForm organisations={orgs} publishedRigs={rigs} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">No active entitlements.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Rig</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((e) => {
                const org = orgMap.get(e.organization_id);
                const rig = rigMap.get(e.rig_id);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-slate-900">
                      {org?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {rig?.name ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">
                          v{rig?.current_version}
                        </span>{" "}
                        · {rig?.current_state}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(e.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeEntitlementButton
                        entitlementId={e.id}
                        orgName={org?.name ?? "Unknown"}
                        rigName={rig?.name ?? "Unknown"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {revoked.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Revoked ({revoked.length})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Rig</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Revoked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revoked.map((e) => {
                const org = orgMap.get(e.organization_id);
                const rig = rigMap.get(e.rig_id);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-slate-700">
                      {org?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {rig?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(e.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {e.revoked_at
                        ? new Date(e.revoked_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

    </div>
  );
}
