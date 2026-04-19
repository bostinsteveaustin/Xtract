import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { WorkflowsProvider } from "@/hooks/use-workflows";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const sidebarUser = {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <WorkflowsProvider>
          <div className="h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>
            <AppSidebar user={sidebarUser} />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {children}
            </main>
          </div>
        </WorkflowsProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
