import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberList } from "@/components/settings/member-list";
import { InviteForm } from "@/components/settings/invite-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) redirect("/login");

  const admin = createAdminClient();

  // Get workspace info
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("id", profile.workspace_id)
    .single();

  // Get current user's role
  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", profile.workspace_id)
    .eq("user_id", user.id)
    .single();

  const isOwnerOrAdmin = ["owner", "admin"].includes(membership?.role ?? "");

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {workspace?.name ?? "Workspace"}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Members</h2>
        <MemberList workspaceId={profile.workspace_id} />
      </section>

      {isOwnerOrAdmin && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Invite Team Member</h2>
          <InviteForm />
        </section>
      )}
    </div>
  );
}
