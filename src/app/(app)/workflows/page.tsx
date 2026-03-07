import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAY_UK_TEMPLATE } from "@/lib/workflow/templates";
import { WorkflowPageClient } from "@/components/workflow/workflow-page-client";

export default async function WorkflowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get user's workspace
  const { data: profile } = await admin
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    redirect("/login");
  }

  const workspaceId = profile.workspace_id;

  // Find or create the default workflow for this workspace
  const { data: existingWorkflows } = await admin
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1);

  let workflowId: string;

  if (existingWorkflows && existingWorkflows.length > 0) {
    workflowId = existingWorkflows[0].id;
  } else {
    // Create default workflow
    const { data: newWorkflow, error: createError } = await admin
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: "Contract Analysis Pipeline",
        template_id: PAY_UK_TEMPLATE.templateId,
        node_graph: JSON.parse(JSON.stringify(PAY_UK_TEMPLATE)),
      })
      .select()
      .single();

    if (createError || !newWorkflow) {
      console.error("Failed to create workflow:", createError);
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-destructive">Failed to initialize workflow. Please try again.</p>
        </div>
      );
    }

    workflowId = newWorkflow.id;
  }

  return (
    <WorkflowPageClient
      workflowId={workflowId}
      definition={PAY_UK_TEMPLATE}
    />
  );
}
