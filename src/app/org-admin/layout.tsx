import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgRigAuthor } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Organisation admin layout. Middleware gates /org-admin/* by role; layout
 * re-checks via requireOrgRigAuthor (the broader of the two org-tier roles)
 * and resolves the active organisation display name. Page-level checks
 * further narrow /org-admin/members to org_admin only.
 */
export default async function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireOrgRigAuthor();
  if (auth.error) redirect("/workflows");
  if (!auth.activeOrgId) redirect("/workflows");

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name, slug")
    .eq("id", auth.activeOrgId)
    .single();

  const isOrgAdmin =
    auth.membership?.role === "org_admin" ||
    auth.platformRole === "platform_admin";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Organisation admin
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {org?.name ?? "—"}
            </div>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/org-admin" className="text-slate-700 hover:underline">
              Overview
            </Link>
            <Link
              href="/org-admin/rigs"
              className="text-slate-700 hover:underline"
            >
              Rigs
            </Link>
            {isOrgAdmin && (
              <Link
                href="/org-admin/members"
                className="text-slate-700 hover:underline"
              >
                Members &amp; invitations
              </Link>
            )}
            {isOrgAdmin && (
              <Link
                href="/org-admin/billing"
                className="text-slate-700 hover:underline"
              >
                Billing
              </Link>
            )}
            <Link href="/workflows" className="text-slate-500 hover:underline">
              ← Back to app
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
