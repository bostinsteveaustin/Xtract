import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Plus, GitBranch } from "lucide-react";

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

  // Fetch all workflows, ordered by most recently updated
  const { data: workflows } = await admin
    .from("workflows")
    .select("id")
    .eq("workspace_id", profile.workspace_id)
    .order("updated_at", { ascending: false })
    .limit(1);

  // If any workflows exist, redirect to the latest one
  if (workflows && workflows.length > 0) {
    redirect(`/workflows/${workflows[0].id}`);
  }

  // Otherwise render empty state
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <GitBranch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No pipelines yet</h2>
        <p className="text-sm text-muted-foreground">
          Create your first pipeline to get started with document extraction.
          Use the <Plus className="inline h-3.5 w-3.5" /> button in the sidebar.
        </p>
      </div>
    </div>
  );
}
