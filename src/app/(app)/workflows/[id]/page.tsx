import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateById, getDefaultTemplate } from "@/lib/workflow/templates";
import { WorkflowPageClient } from "@/components/workflow/workflow-page-client";
import type { WorkflowDefinition } from "@/types/workflow";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Load the specific workflow
  const { data: workflow } = await admin
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (!workflow) {
    notFound();
  }

  // Load definition from node_graph, fallback to template
  let definition: WorkflowDefinition;
  try {
    const stored = workflow.node_graph as unknown as WorkflowDefinition;
    if (stored?.nodes?.length > 0) {
      definition = stored;
    } else {
      definition =
        (workflow.template_id
          ? getTemplateById(workflow.template_id)
          : null) ?? getDefaultTemplate();
    }
  } catch {
    definition = getDefaultTemplate();
  }

  return (
    <WorkflowPageClient
      workflowId={workflow.id}
      definition={definition}
    />
  );
}
