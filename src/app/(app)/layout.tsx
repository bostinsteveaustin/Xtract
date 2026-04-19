import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/layout/app-shell";
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

  const shellUser = {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <WorkflowsProvider>
          <AppShell user={shellUser}>
            {children}
          </AppShell>
        </WorkflowsProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
