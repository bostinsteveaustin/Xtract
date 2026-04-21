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

  // Two-query resolution avoids Supabase's embedded-join ambiguity when FKs
  // aren't declared in the generated Relationships metadata.
  const { data: rawMembers } = await admin
    .from("memberships")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", org.id)
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
          {members.map((m) => {
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
          {members.length === 0 && (
            <li className="py-4 text-sm text-slate-500">No members.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
