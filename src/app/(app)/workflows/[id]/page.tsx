import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceDetailView } from "@/components/workspace/workspace-detail-view";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: workflow } = await admin
    .from("workflows")
    .select(
      "id, name, type, description, workspace_ctx_id, template_id, bound_rig_id, bound_rig_version, bound_at, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (!workflow) notFound();

  // Hydrate the bound Rig's human details in one extra round-trip — keeps
  // the RunsSection header honest about tier/state without denormalising
  // those fields onto workflows.
  let boundRig: {
    id: string;
    slug: string;
    name: string;
    tier: "published" | "organisation";
    current_version: string;
  } | null = null;
  let boundVersionState:
    | "experimental"
    | "validated"
    | "deprecated"
    | "draft"
    | null = null;
  let boundVersionWindowEnd: string | null = null;

  if (workflow.bound_rig_id) {
    const { data: rig } = await admin
      .from("rigs")
      .select("id, slug, name, tier, current_version")
      .eq("id", workflow.bound_rig_id)
      .maybeSingle();
    if (rig) {
      boundRig = {
        id: rig.id,
        slug: rig.slug,
        name: rig.name,
        tier: rig.tier,
        current_version: rig.current_version,
      };
    }
    if (workflow.bound_rig_version) {
      const { data: rv } = await admin
        .from("rig_versions")
        .select("state, deprecation_window_ends_at")
        .eq("rig_id", workflow.bound_rig_id)
        .eq("version", workflow.bound_rig_version)
        .maybeSingle();
      if (rv) {
        boundVersionState = rv.state as
          | "experimental"
          | "validated"
          | "deprecated"
          | "draft";
        boundVersionWindowEnd = rv.deprecation_window_ends_at;
      }
    }
  }

  return (
    <WorkspaceDetailView
      workflow={workflow}
      boundRig={boundRig}
      boundVersionState={boundVersionState}
      boundVersionWindowEnd={boundVersionWindowEnd}
    />
  );
}
