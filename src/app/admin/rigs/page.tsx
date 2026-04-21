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
import { Button } from "@/components/ui/button";

/**
 * Published Rig catalogue — the landing page of the Rig authoring surface.
 * Organisation-tier rigs are surfaced separately below so the platform admin
 * can see cross-tenant author activity without clicking into each org.
 *
 * Per E-08 Table 29: /admin/rigs is platform_admin only for management.
 * platform_support gets read access (middleware gates /admin by any platform
 * role; write actions below check is_platform_admin separately).
 */
export default async function AdminRigsPage() {
  const admin = createAdminClient();

  const [publishedRes, orgRigsRes] = await Promise.all([
    admin
      .from("rigs")
      .select(
        "id, slug, name, category, current_state, current_version, created_at"
      )
      .eq("tier", "published")
      .order("name", { ascending: true }),
    admin
      .from("rigs")
      .select(
        "id, slug, name, category, current_state, current_version, organization_id, created_at"
      )
      .eq("tier", "organisation")
      .order("created_at", { ascending: false }),
  ]);

  const published = publishedRes.data ?? [];
  const orgRigsRaw = orgRigsRes.data ?? [];

  // Two-query pattern — matches /admin/organisations/[slug]/page.tsx. Avoids
  // Supabase embed ambiguity when FK metadata isn't declared.
  const orgIds = Array.from(
    new Set(
      orgRigsRaw.map((r) => r.organization_id).filter((x): x is string => !!x)
    )
  );
  const { data: orgRows } = orgIds.length
    ? await admin.from("organizations").select("id, name, slug").in("id", orgIds)
    : { data: [] };
  const orgMap = new Map<string, { name: string; slug: string }>();
  for (const o of orgRows ?? []) orgMap.set(o.id, { name: o.name, slug: o.slug });
  const orgRigs = orgRigsRaw.map((r) => ({
    ...r,
    organizations: r.organization_id ? orgMap.get(r.organization_id) ?? null : null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Platform
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Rigs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Published Rigs are BridgingX commercial SKUs. Organisation Rigs are
            authored inside tenants and shown here for cross-tenant visibility.
          </p>
        </div>
        <Button asChild className="bg-[#0EA5A0] text-white hover:bg-[#0B8A86]">
          <Link href="/admin/rigs/new">New Published Rig</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Published ({published.length})
        </h2>
        <RigsTable rows={published} tier="published" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Organisation ({orgRigs.length})
        </h2>
        <RigsTable
          rows={orgRigs}
          tier="organisation"
          showOrgColumn
        />
      </section>
    </div>
  );
}

type RigRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  current_state: string;
  current_version: string;
  organization_id?: string | null;
  organizations?: { name: string; slug: string } | null;
};

function RigsTable({
  rows,
  tier,
  showOrgColumn = false,
}: {
  rows: RigRow[];
  tier: "published" | "organisation";
  showOrgColumn?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
        {tier === "published"
          ? "No Published Rigs yet. Seed migration 023 should have populated four draft rigs."
          : "No Organisation Rigs authored yet."}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          {showOrgColumn && <TableHead>Organisation</TableHead>}
          <TableHead>State</TableHead>
          <TableHead className="text-right">Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((rig) => (
          <TableRow key={rig.id}>
            <TableCell>
              <Link
                href={`/admin/rigs/${rig.slug}`}
                className="font-medium text-[#0EA5A0] hover:underline"
              >
                {rig.name}
              </Link>
              <div className="font-mono text-xs text-slate-500">{rig.slug}</div>
            </TableCell>
            <TableCell className="text-sm text-slate-700">
              {categoryLabel(rig.category)}
            </TableCell>
            {showOrgColumn && (
              <TableCell className="text-sm text-slate-700">
                {rig.organizations?.name ?? "—"}
              </TableCell>
            )}
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
