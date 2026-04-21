import Link from "next/link";
import { requireOrgRigAuthor } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";

export default async function OrgAdminOverview() {
  const auth = await requireOrgRigAuthor();
  if (auth.error || !auth.activeOrgId) return null;

  const isOrgAdmin =
    auth.membership?.role === "org_admin" ||
    auth.platformRole === "platform_admin";

  const admin = createAdminClient();
  const [membersRes, invitesRes, rigsRes] = await Promise.all([
    admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.activeOrgId)
      .eq("status", "active"),
    admin
      .from("invite_tokens")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.activeOrgId)
      .eq("status", "pending"),
    admin
      .from("rigs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.activeOrgId)
      .eq("tier", "organisation"),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Active members
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {membersRes.count ?? 0}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Pending invites
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {invitesRes.count ?? 0}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Organisation Rigs
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {rigsRes.count ?? 0}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Quick actions
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/org-admin/rigs"
              className="text-[#0EA5A0] hover:underline"
            >
              Author Organisation Rigs and fork Published Rigs →
            </Link>
          </li>
          {isOrgAdmin && (
            <li>
              <Link
                href="/org-admin/members"
                className="text-[#0EA5A0] hover:underline"
              >
                Manage members and invitations →
              </Link>
            </li>
          )}
          <li className="text-slate-500">
            Billing <span className="ml-2 text-xs italic">(Phase 5)</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
