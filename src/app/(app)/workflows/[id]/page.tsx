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
    .select("id, name, type, description, workspace_ctx_id, template_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!workflow) notFound();

  return <WorkspaceDetailView workflow={workflow} />;
}
