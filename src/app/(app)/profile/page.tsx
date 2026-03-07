import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email, avatar_url, workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  let workspaceName: string | null = null;
  if (profile.workspace_id) {
    const { data: workspace } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", profile.workspace_id)
      .single();
    workspaceName = workspace?.name ?? null;
  }

  return (
    <ProfilePageClient
      userId={user.id}
      email={profile.email}
      displayName={profile.display_name}
      avatarUrl={profile.avatar_url}
      workspaceName={workspaceName}
    />
  );
}
