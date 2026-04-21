import { redirect } from "next/navigation";
import { requireOrgAdmin } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgInviteForm } from "@/components/org-admin/org-invite-form";
import { OrgPendingInvites } from "@/components/org-admin/org-pending-invites";
import { MemberRoleSelect } from "@/components/org-admin/member-role-select";

/**
 * /org-admin/members is org_admin only — rig_manager reaches /org-admin (layout
 * gate) but must not manage memberships. We re-check here.
 */
export default async function OrgMembersPage() {
  const auth = await requireOrgAdmin();
  if (auth.error) redirect("/org-admin");
  if (!auth.activeOrgId) return null;

  const admin = createAdminClient();
  const { data: rawMembers } = await admin
    .from("memberships")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", auth.activeOrgId)
    .order("created_at", { ascending: true });

  const memberUserIds = (rawMembers ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = memberUserIds.length
    ? await admin
        .from("profiles")
        .select("id, email, display_name")
        .in("id", memberUserIds)
    : { data: [] };
  const profileMap = new Map<string, { email: string; display_name: string | null }>();
  for (const p of memberProfiles ?? []) {
    profileMap.set(p.id, { email: p.email, display_name: p.display_name });
  }
  const members = (rawMembers ?? []).map((m) => ({
    ...m,
    profiles: profileMap.get(m.user_id) ?? null,
  }));

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
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Members ({members.length})
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Rig manager</span> can
          author and manage Organisation Rigs (E-08 §7.2 Table 13) but cannot
          manage memberships or billing. Use it for technical leads who need
          Rig authoring rights without full org admin.
        </p>
        <ul className="divide-y divide-slate-200">
          {members.map((m) => {
            const profile = m.profiles;
            const isSelf = m.user_id === auth.user.id;
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">
                    {profile?.display_name ?? profile?.email ?? m.user_id}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (you)
                      </span>
                    )}
                  </div>
                  {profile?.display_name && (
                    <div className="truncate text-xs text-slate-500">
                      {profile.email}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {m.status === "active" ? (
                    <MemberRoleSelect
                      userId={m.user_id}
                      currentRole={
                        m.role as "org_admin" | "rig_manager" | "member"
                      }
                    />
                  ) : (
                    <Badge variant="outline">{m.role}</Badge>
                  )}
                  {m.status !== "active" && (
                    <Badge variant="secondary">{m.status}</Badge>
                  )}
                </div>
              </li>
            );
          })}
          {members.length === 0 && (
            <li className="py-4 text-sm text-slate-500">No members.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
