import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RigVersionActions } from "@/components/admin/rig-version-actions";
import { NewRigVersionForm } from "@/components/admin/new-rig-version-form";
import { AttachEvidenceForm } from "@/components/admin/attach-evidence-form";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Rig detail — version history, state transitions, calibration evidence.
 * Platform role holders can read; write actions are gated to platform_admin
 * server-side in actions.ts.
 */
export default async function RigDetailPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: rig } = await admin
    .from("rigs")
    .select(
      "id, slug, name, category, tier, organization_id, current_state, current_version, forked_from_rig_id, forked_from_version, created_by_user_id, created_at, updated_at"
    )
    .eq("slug", slug)
    .single();
  if (!rig) notFound();

  const { data: versions } = await admin
    .from("rig_versions")
    .select(
      "id, version, state, pipeline_pattern, methodology_statement, released_at, released_by_user_id, deprecated_at, deprecation_window_ends_at, calibration_evidence_id, created_at"
    )
    .eq("rig_id", rig.id)
    .order("created_at", { ascending: false });

  const versionIds = (versions ?? []).map((v) => v.id);
  const { data: evidenceRows } = versionIds.length
    ? await admin
        .from("calibration_evidence")
        .select("id, rig_version_id, evidence_type, attached_at, payload")
        .in("rig_version_id", versionIds)
        .order("attached_at", { ascending: false })
    : { data: [] };

  const evidenceByVersion = new Map<
    string,
    Array<{
      id: string;
      evidence_type: string;
      attached_at: string;
      payload: Record<string, unknown> | null;
    }>
  >();
  for (const e of evidenceRows ?? []) {
    const list = evidenceByVersion.get(e.rig_version_id) ?? [];
    list.push({
      id: e.id,
      evidence_type: e.evidence_type,
      attached_at: e.attached_at,
      payload: e.payload as Record<string, unknown> | null,
    });
    evidenceByVersion.set(e.rig_version_id, list);
  }

  const suggestedNextVersion = nextPatch(rig.current_version);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            <Link href="/admin/rigs" className="hover:underline">
              Rigs
            </Link>{" "}
            · {rig.tier}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{rig.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-mono">{rig.slug}</span>
            <span>·</span>
            <span>{categoryLabel(rig.category)}</span>
            <span>·</span>
            <StateBadge state={rig.current_state} />
            <span className="font-mono text-xs tabular-nums">
              v{rig.current_version}
            </span>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Version history
        </h2>
        {(versions ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">
            No versions recorded. This should not happen — at least the initial
            draft is expected.
          </p>
        ) : (
          <ul className="space-y-6">
            {(versions ?? []).map((v) => {
              const evidence = evidenceByVersion.get(v.id) ?? [];
              return (
                <li
                  key={v.id}
                  className="space-y-3 rounded-md border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                        v{v.version}
                      </span>
                      <StateBadge state={v.state} />
                      <Badge variant="outline" className="text-xs">
                        {v.pipeline_pattern}
                      </Badge>
                    </div>
                    <RigVersionActions
                      rigVersionId={v.id}
                      currentState={v.state as "draft" | "experimental" | "validated" | "deprecated"}
                    />
                  </div>

                  {v.methodology_statement && (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {v.methodology_statement}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div>
                      Created {new Date(v.created_at).toLocaleString()}
                    </div>
                    {v.released_at && (
                      <div>
                        Released {new Date(v.released_at).toLocaleString()}
                      </div>
                    )}
                    {v.deprecated_at && (
                      <div>
                        Deprecated {new Date(v.deprecated_at).toLocaleString()}
                      </div>
                    )}
                    {v.deprecation_window_ends_at && (
                      <div>
                        Window ends{" "}
                        {new Date(
                          v.deprecation_window_ends_at
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-900">
                      Calibration evidence ({evidence.length})
                    </div>
                    {evidence.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No evidence attached. Validated promotion requires at
                        least two domain tests.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {evidence.map((e) => (
                          <li
                            key={e.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-sky-100 text-sky-800"
                              >
                                {e.evidence_type}
                              </Badge>
                              <span className="text-slate-500">
                                {new Date(e.attached_at).toLocaleString()}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3">
                      <AttachEvidenceForm rigVersionId={v.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Add new draft version
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Versions are immutable once released. Major / minor / patch discipline
          per E-08 §4.3 Table 6.
        </p>
        <NewRigVersionForm
          rigId={rig.id}
          suggestedNextVersion={suggestedNextVersion}
        />
      </Card>
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

function nextPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return "0.1.0";
  const patch = Number(m[3]) + 1;
  return `${m[1]}.${m[2]}.${patch}`;
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
