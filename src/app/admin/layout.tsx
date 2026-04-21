import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_CONTEXT_COOKIE,
  type AdminContextState,
} from "@/lib/api/auth";
import { AdminContextBanner } from "@/components/admin/admin-context-banner";

/**
 * Platform admin / support layout. Gate enforced in middleware.ts; the layout
 * assumes the user has a non-'none' platform_role. Visually distinct from the
 * /org-admin and user-facing surfaces per E-08 §5.4, §10.3.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Defence-in-depth — middleware already gated, but re-check in case the
  // layout is rendered outside the matcher.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role, display_name")
    .eq("id", user.id)
    .single();
  if (!profile || profile.platform_role === "none") {
    redirect("/workflows");
  }

  // Admin-context cookie → populate banner if active.
  const cookieStore = await cookies();
  const adminContextRaw = cookieStore.get(ADMIN_CONTEXT_COOKIE)?.value;
  let adminContext: AdminContextState | null = null;
  let adminContextOrgName: string | null = null;
  if (adminContextRaw) {
    try {
      const parsed = JSON.parse(adminContextRaw) as AdminContextState;
      if (new Date(parsed.expiresAt) > new Date()) {
        adminContext = parsed;
        const { data: org } = await admin
          .from("organizations")
          .select("name")
          .eq("id", parsed.targetOrganizationId)
          .single();
        adminContextOrgName = org?.name ?? "(unknown org)";
      }
    } catch {
      // malformed cookie
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {adminContext && adminContextOrgName && (
        <AdminContextBanner
          targetOrganizationName={adminContextOrgName}
          expiresAt={adminContext.expiresAt}
        />
      )}

      <header className="border-b border-slate-300 bg-[#344654] px-6 py-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">
              BridgingX Platform Admin
            </div>
            <div className="text-lg font-semibold">
              {profile.display_name ?? user.email}
              <span className="ml-2 text-xs font-normal text-white/70">
                · {profile.platform_role}
              </span>
            </div>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/organisations" className="hover:underline">
              Organisations
            </Link>
            <Link href="/admin/rigs" className="hover:underline">
              Rigs
            </Link>
            <Link href="/admin/entitlements" className="hover:underline">
              Entitlements
            </Link>
            <Link href="/admin/audit" className="hover:underline">
              Audit log
            </Link>
            <Link href="/workflows" className="text-white/70 hover:underline">
              ← Exit admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
