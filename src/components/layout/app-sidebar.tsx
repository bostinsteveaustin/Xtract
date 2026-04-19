"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkflows } from "@/hooks/use-workflows";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PanelLeftClose, PanelLeftOpen, LogOut, FolderOpen,
  Settings, User, Store,
} from "lucide-react";
import { CreateWorkflowDialog } from "./create-workflow-dialog";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { workflows, isLoading } = useWorkflows();
  const router = useRouter();
  const pathname = usePathname();

  const initials = (user.displayName ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      className={cn(
        "h-screen flex flex-col flex-shrink-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* ── Brand block + collapse toggle ── */}
      <div
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        className="h-14 flex items-center justify-between px-3 flex-shrink-0"
      >
        {!isCollapsed && (
          <div
            className="flex flex-col cursor-pointer select-none"
            onClick={() => router.push("/workflows")}
          >
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "1rem", color: "var(--foreground)", lineHeight: 1.2 }}>
              Xtract
            </span>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sidebar-muted)" }}>
              BridgingX
            </span>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggle}
              style={{ color: "var(--sidebar-muted)" }}
              className={cn(
                "p-1.5 rounded-md transition-colors hover:bg-black/5",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed
                ? <PanelLeftOpen className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* ── New Workspace button ── */}
      <div className="px-2 pt-3 pb-1 flex-shrink-0">
        <CreateWorkflowDialog />
      </div>

      {/* ── Marketplace link ── */}
      <div className="px-2 pb-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/marketplace")}
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors")}
              style={{ color: "var(--sidebar-fg)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Store className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--sidebar-muted)" }} />
              {!isCollapsed && <span style={{ fontSize: "0.83rem" }}>Marketplace</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Cortx Marketplace</TooltipContent>}
        </Tooltip>
      </div>

      {/* ── Workspace list ── */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 py-1">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className={cn("h-8 rounded-md", isCollapsed ? "w-10 mx-auto" : "w-full")}
                  style={{ background: "rgba(26,35,50,0.07)" }}
                />
              ))}
            </>
          ) : workflows.length === 0 ? (
            !isCollapsed && (
              <p style={{ fontSize: "0.78rem", color: "var(--sidebar-muted)", textAlign: "center", padding: "1rem 0.5rem" }}>
                No workspaces yet
              </p>
            )
          ) : (
            workflows.map((w) => {
              const isActive = pathname === `/workflows/${w.id}`;
              return (
                <Tooltip key={w.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => router.push(`/workflows/${w.id}`)}
                      className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left")}
                      style={{
                        background: isActive ? "var(--sidebar-active)" : "transparent",
                        color: isActive ? "var(--coral)" : "var(--sidebar-fg)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <FolderOpen
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: isActive ? "var(--coral)" : "var(--sidebar-muted)" }}
                      />
                      {!isCollapsed && (
                        <span className="truncate" style={{ fontSize: "0.83rem", fontWeight: isActive ? 500 : 400 }}>
                          {w.name}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{w.name}</TooltipContent>
                  )}
                </Tooltip>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ── Nav footer ── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)" }} className="flex-shrink-0 p-2 space-y-0.5">
        {/* Profile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/profile")}
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors")}
              style={{ color: "var(--sidebar-fg)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div
                className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--coral-soft)", color: "var(--coral)", fontSize: "0.65rem", fontWeight: 700 }}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  : initials}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="truncate" style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--foreground)" }}>
                    {user.displayName ?? "Profile"}
                  </div>
                  <div className="truncate" style={{ fontSize: "0.72rem", color: "var(--sidebar-muted)" }}>
                    {user.email}
                  </div>
                </div>
              )}
              {!isCollapsed && <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--sidebar-muted)" }} />}
            </button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Profile</TooltipContent>}
        </Tooltip>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors")}
              style={{ color: "var(--sidebar-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Settings className="h-3.5 w-3.5 flex-shrink-0" />
              {!isCollapsed && <span style={{ fontSize: "0.83rem" }}>Settings</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>

        {/* Sign out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSignOut}
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors")}
              style={{ color: "var(--sidebar-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--destructive)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--sidebar-muted)"; }}
            >
              <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
              {!isCollapsed && <span style={{ fontSize: "0.83rem" }}>Sign out</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Sign out</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
