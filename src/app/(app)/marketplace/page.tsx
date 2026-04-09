import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceBrowser } from "@/components/marketplace/marketplace-browser";

export default async function MarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cortx Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and import context packages for your extraction pipelines
        </p>
      </div>
      <MarketplaceBrowser />
    </div>
  );
}
