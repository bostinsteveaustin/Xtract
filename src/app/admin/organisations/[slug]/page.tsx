import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnterAdminContextButton } from "@/components/admin/enter-admin-context-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OrganisationDetailPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, status, billing_contact_user_id, stripe_customer_id, branding, created_at, updated_at")
    .eq("slug", slug)
    .single();
  if (!org) notFound();

  const { data: members } = await admin
    .from("memberships")
    .select("id, user_id, role, status, created_at, profiles:user_id(email, display_name)")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Organisation
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{org.name}</h1>
          <div className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{org.slug}</span>
            <span className="mx-2">·</span>
            <Badge variant="secondary">{org.status}</Badge>
          </div>
        </div>

        <EnterAdminContextButton orgSlug={org.slug} orgName={org.name} />
      </div>

      <Card className="p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Members</h2>
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
                  <Badge
                    variant={m.status === "active" ? "secondary" : "outline"}
                    className={
                      m.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : ""
                    }
                  >
                    {m.status}
                  </Badge>
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
