import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplate, getDefaultTemplate } from "@/lib/pipeline/templates";
import { PipelinePageClient } from "@/components/pipeline/pipeline-page-client";

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

  const { data: workflow } = await admin
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (!workflow) {
    notFound();
  }

  // Resolve pipeline template
  const template = workflow.template_id
    ? getTemplate(workflow.template_id)
    : null;

  return (
    <PipelinePageClient
      workflowId={workflow.id}
      workflowName={workflow.name}
      template={template ?? getDefaultTemplate()}
    />
  );
}
