import { requireOrgAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgInviteForm } from "@/components/org-admin/org-invite-form";
import { OrgPendingInvites } from "@/components/org-admin/org-pending-invites";

export default async function OrgMembersPage() {
  const auth = await requireOrgAdmin();
  if (auth.error || !auth.activeOrgId) return null;

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("memberships")
    .select(
      "id, user_id, role, status, created_at, profiles:user_id(email, display_name)"
    )
    .eq("organization_id", auth.activeOrgId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Members &amp; invitations
      </h1>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Invite someone
        </h2>
        <OrgInviteForm />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Pending invitations
        </h2>
        <OrgPendingInvites />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Members ({members?.length ?? 0})
        </h2>
        <ul className="divide-y divide-slate-200">
          {(members ?? []).map((row) => {
            const m = row as unknown as {
              id: string;
              user_id: string;
              role: string;
              status: string;
              created_at: string;
              profiles: { email: string; display_name: string | null } | null;
            };
            const profile = m.profiles;
            return (
              <li
                key={m.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {profile?.display_name ?? profile?.email ?? m.user_id}
                  </div>
                  {profile?.display_name && (
                    <div className="text-xs text-slate-500">{profile.email}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.role}</Badge>
                  {m.status !== "active" && (
                    <Badge variant="secondary">{m.status}</Badge>
                  )}
                </div>
              </li>
            );
          })}
          {(!members || members.length === 0) && (
            <li className="py-4 text-sm text-slate-500">No members.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
