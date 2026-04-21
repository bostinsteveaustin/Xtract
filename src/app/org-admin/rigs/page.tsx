import Link from "next/link";
import { requireOrgRigAuthor } from "@/lib/api/auth";
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
import { Button } from "@/components/ui/button";

/**
 * Organisation Rig catalogue (E-08 §12.2 Phase 3, Table 29 /org-admin/rigs).
 *
 * Shows Rigs authored inside the active organisation — both bespoke and forks
 * of Published Rigs. Forks surface their lineage so org admins can trace
 * provenance back to the source SKU.
 */
export default async function OrgAdminRigsPage() {
  const auth = await requireOrgRigAuthor();
  if (auth.error || !auth.activeOrgId) return null;

  const admin = createAdminClient();

  const { data: rigs } = await admin
    .from("rigs")
    .select(
      "id, slug, name, category, current_state, current_version, forked_from_rig_id, forked_from_version, created_at"
    )
    .eq("tier", "organisation")
    .eq("organization_id", auth.activeOrgId)
    .order("created_at", { ascending: false });

  const parentIds = Array.from(
    new Set(
      (rigs ?? [])
        .map((r) => r.forked_from_rig_id)
        .filter((x): x is string => !!x)
    )
  );
  const { data: parentRows } = parentIds.length
    ? await admin.from("rigs").select("id, slug, name").in("id", parentIds)
    : { data: [] };
  const parentMap = new Map<string, { slug: string; name: string }>();
  for (const p of parentRows ?? []) {
    parentMap.set(p.id, { slug: p.slug, name: p.name });
  }

  const rows = (rigs ?? []).map((r) => ({
    ...r,
    parent: r.forked_from_rig_id
      ? parentMap.get(r.forked_from_rig_id) ?? null
      : null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Organisation
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Rigs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rigs authored inside this organisation. Fork a Published Rig to
            customise a BridgingX SKU; author a bespoke Rig when no Published
            Rig fits. Forks record lineage but carry no calibration evidence —
            each fork validates independently.
          </p>
        </div>
        <Button asChild className="bg-[#0EA5A0] text-white hover:bg-[#0B8A86]">
          <Link href="/org-admin/rigs/new">New Rig</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
          No Organisation Rigs yet. Start by forking a Published Rig or
          authoring a bespoke one.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Lineage</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((rig) => (
              <TableRow key={rig.id}>
                <TableCell>
                  <Link
                    href={`/org-admin/rigs/${rig.slug}`}
                    className="font-medium text-[#0EA5A0] hover:underline"
                  >
                    {rig.name}
                  </Link>
                  <div className="font-mono text-xs text-slate-500">
                    {rig.slug}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {categoryLabel(rig.category)}
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {rig.parent ? (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        Fork of
                      </div>
                      <div className="font-mono text-xs">
                        {rig.parent.slug}
                        {rig.forked_from_version
                          ? ` @ v${rig.forked_from_version}`
                          : ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs italic text-slate-500">
                      Bespoke
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StateBadge state={rig.current_state} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {rig.current_version}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    contract_intelligence: "Contract Intelligence",
    controls_extraction: "Controls Extraction",
    ontology_building: "Ontology Building",
    qa_review: "QA & Review",
    custom: "Custom",
  };
  return map[category] ?? category;
}

function StateBadge({ state }: { state: string }) {
  const variants: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    experimental: "bg-amber-100 text-amber-800",
    validated: "bg-emerald-100 text-emerald-800",
    deprecated: "bg-rose-100 text-rose-800",
  };
  return (
    <Badge
      variant="secondary"
      className={variants[state] ?? "bg-slate-100 text-slate-700"}
    >
      {state}
    </Badge>
  );
}
