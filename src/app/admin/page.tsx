import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";

/**
 * Platform admin dashboard — landing page for /admin. Shows counts and
 * jump-off points. Rig management UI lands in Phase 2.
 */
export default async function AdminDashboard() {
  const admin = createAdminClient();
  const [orgsRes, auditRes, platformRes] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("audit_log").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("platform_role", "none"),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Platform admin dashboard
        </h1>
        <p className="text-sm text-slate-600">
          BridgingX cross-tenant controls. Actions taken here are logged to the
          cross-tenant audit trail and tagged with your user id.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Organisations" value={orgsRes.count ?? 0} />
        <StatCard label="Platform role holders" value={platformRes.count ?? 0} />
        <StatCard label="Audit events" value={auditRes.count ?? 0} />
      </div>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Quick actions
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/admin/organisations"
              className="text-[#0EA5A0] hover:underline"
            >
              Browse and manage organisations →
            </Link>
          </li>
          <li>
            <Link
              href="/admin/audit"
              className="text-[#0EA5A0] hover:underline"
            >
              Review cross-tenant audit log →
            </Link>
          </li>
          <li className="text-slate-500">
            <span>Rig management</span>{" "}
            <span className="ml-2 text-xs italic">(Phase 2)</span>
          </li>
          <li className="text-slate-500">
            <span>Entitlement management</span>{" "}
            <span className="ml-2 text-xs italic">(Phase 2)</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
    </Card>
  );
}
