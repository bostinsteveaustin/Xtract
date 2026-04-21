import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/**
 * Cross-tenant audit log viewer — last 200 entries.
 * Platform admin and platform support both read; the RLS layer enforces
 * who sees what (platform roles → all rows via audit_log_select_platform).
 */
export default async function AuditLogPage() {
  const admin = createAdminClient();
  const { data: rawRows } = await admin
    .from("audit_log")
    .select(
      "id, created_at, action, acting_user_id, acting_user_platform_role, target_organization_id, admin_context_flag, resource_type, resource_id, payload"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolve org + user profile in two follow-up queries — avoids Supabase's
  // embedded-join ambiguity without declared FK relationships.
  const orgIds = Array.from(
    new Set((rawRows ?? []).map((r) => r.target_organization_id).filter(Boolean))
  ) as string[];
  const userIds = Array.from(
    new Set((rawRows ?? []).map((r) => r.acting_user_id).filter(Boolean))
  ) as string[];

  const [orgLookup, profileLookup] = await Promise.all([
    orgIds.length
      ? admin.from("organizations").select("id, name, slug").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    userIds.length
      ? admin.from("profiles").select("id, email, display_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string; display_name: string | null }[] }),
  ]);
  const orgMap = new Map<string, { name: string; slug: string }>();
  for (const o of orgLookup.data ?? []) orgMap.set(o.id, { name: o.name, slug: o.slug });
  const profileMap = new Map<string, { email: string; display_name: string | null }>();
  for (const p of profileLookup.data ?? [])
    profileMap.set(p.id, { email: p.email, display_name: p.display_name });

  const rows = (rawRows ?? []).map((r) => ({
    ...r,
    organizations: r.target_organization_id
      ? orgMap.get(r.target_organization_id) ?? null
      : null,
    profiles: r.acting_user_id ? profileMap.get(r.acting_user_id) ?? null : null,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-600">
          Cross-tenant activity — most recent 200 events. Append-only; entries
          are retained indefinitely.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target org</TableHead>
            <TableHead>Resource</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const org = r.organizations;
            const profile = r.profiles;
            return (
              <TableRow key={r.id}>
                <TableCell className="text-xs tabular-nums text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{r.action}</span>
                    {r.admin_context_flag && (
                      <Badge
                        variant="secondary"
                        className="bg-[#FB3970]/15 text-[#FB3970]"
                      >
                        admin-ctx
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{profile?.display_name ?? profile?.email ?? "—"}</div>
                  {r.acting_user_platform_role &&
                    r.acting_user_platform_role !== "none" && (
                      <div className="text-xs text-slate-500">
                        {r.acting_user_platform_role}
                      </div>
                    )}
                </TableCell>
                <TableCell className="text-sm">
                  {org ? (
                    <span>
                      {org.name}
                      <span className="ml-1 font-mono text-xs text-slate-500">
                        ({org.slug})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {r.resource_type ? (
                    <span>
                      {r.resource_type}
                      {r.resource_id && (
                        <span className="text-slate-400">:{r.resource_id.slice(0, 8)}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                No audit events yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
