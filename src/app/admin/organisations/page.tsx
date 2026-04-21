import Link from "next/link";
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
 * Cross-tenant organisation list. Visible to platform_admin and platform_support.
 */
export default async function OrganisationsListPage() {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  // Membership counts per org — separate query because Supabase doesn't do
  // COUNT(…) GROUPBY in a single PostgREST call without a view.
  const { data: memberships } = await admin
    .from("memberships")
    .select("organization_id");
  const countByOrg = new Map<string, number>();
  for (const m of memberships ?? []) {
    const id = (m as { organization_id: string }).organization_id;
    countByOrg.set(id, (countByOrg.get(id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Organisations</h1>
          <p className="text-sm text-slate-600">
            Every tenant on the platform. Click a row to enter admin context.
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(orgs ?? []).map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link
                  href={`/admin/organisations/${org.slug}`}
                  className="font-medium text-[#0EA5A0] hover:underline"
                >
                  {org.name}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-500">
                {org.slug}
              </TableCell>
              <TableCell>
                <StatusBadge status={org.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {countByOrg.get(org.id) ?? 0}
              </TableCell>
              <TableCell className="text-right text-xs text-slate-500">
                {new Date(org.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    suspended: "bg-amber-100 text-amber-800",
    archived: "bg-slate-200 text-slate-700",
  };
  return (
    <Badge
      variant="secondary"
      className={variants[status] ?? "bg-slate-100 text-slate-700"}
    >
      {status}
    </Badge>
  );
}
