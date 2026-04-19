import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspacesGrid } from "@/components/layout/workspaces-grid";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) redirect("/login");

  const { data: workflows } = await admin
    .from("workflows")
    .select("id, name, template_id, status, created_at, updated_at")
    .eq("workspace_id", profile.workspace_id)
    .order("updated_at", { ascending: false });

  return <WorkspacesGrid workflows={workflows ?? []} />;
}
