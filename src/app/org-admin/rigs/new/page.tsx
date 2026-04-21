import Link from "next/link";
import { requireOrgRigAuthor } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewOrgRigForm } from "@/components/org-admin/new-org-rig-form";
import { ForkPublishedRigForm } from "@/components/org-admin/fork-published-rig-form";

/**
 * Compose a new Organisation Rig. Two modes (E-08 §4.4):
 *   - Fork a Published Rig (lineage preserved, calibration evidence reset)
 *   - Author a bespoke Rig from scratch
 */
export default async function NewOrgRigPage() {
  const auth = await requireOrgRigAuthor();
  if (auth.error || !auth.activeOrgId) return null;

  const admin = createAdminClient();

  const { data: publishedRigs } = await admin
    .from("rigs")
    .select("id, slug, name, category, current_state, current_version")
    .eq("tier", "published")
    .order("name", { ascending: true });

  const forkable = (publishedRigs ?? []).filter(
    (r) => r.current_state !== "deprecated"
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">
          <Link href="/org-admin/rigs" className="hover:underline">
            Rigs
          </Link>{" "}
          · New
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">New Rig</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start from a Published Rig to keep the BridgingX-validated shape, or
          author a bespoke Rig if no Published Rig fits.
        </p>
      </div>

      <Tabs defaultValue="fork" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fork">Fork a Published Rig</TabsTrigger>
          <TabsTrigger value="bespoke">Bespoke</TabsTrigger>
        </TabsList>

        <TabsContent value="fork" className="mt-4">
          <Card className="p-6">
            {forkable.length === 0 ? (
              <p className="text-sm text-slate-600">
                No non-deprecated Published Rigs are available to fork yet. Ask
                your BridgingX contact or author a bespoke Rig on the other
                tab.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-600">
                  A fork inherits the source Rig&apos;s pipeline pattern and
                  methodology at a specific version, recorded as lineage. It
                  does <strong>not</strong> inherit calibration evidence — the
                  fork re-validates from scratch (E-08 §4.4).
                </p>
                <ForkPublishedRigForm sources={forkable} />
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="bespoke" className="mt-4">
          <Card className="p-6">
            <p className="mb-4 text-sm text-slate-600">
              Use this when your engagement needs a configuration no Published
              Rig provides. You&apos;ll need your own validation evidence before
              promoting out of draft.
            </p>
            <NewOrgRigForm />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
