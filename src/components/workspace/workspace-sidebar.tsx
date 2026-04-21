"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkflows } from "@/hooks/use-workflows";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PanelLeftClose, PanelLeftOpen, ChevronLeft,
  FlaskConical, FileText, Brain, Settings2,
  User, LogOut, Cpu,
} from "lucide-react";
import { WORKSPACE_TYPE_REGISTRY } from "@/lib/pipeline/workspace-registry";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceSidebarProps {
  workspaceId: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  contract:   "var(--coral)",
  regulatory: "var(--tier-authoritative)",
  knowhow:    "var(--tier-working)",
  custom:     "var(--muted-fg)",
};

const NAV_ITEMS = [
  { id: "pipeline-runs", label: "Pipeline Runs",    icon: FlaskConical },
  { id: "rig",           label: "Rig",              icon: Cpu          },
  { id: "documents",     label: "Source Documents", icon: FileText     },
  { id: "context",       label: "Context",          icon: Brain        },
  { id: "settings",      label: "Settings",         icon: Settings2    },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceSidebar({ workspaceId, user }: WorkspaceSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { workflows } = useWorkflows();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve workspace identity from context
  const workspace = workflows.find((w) => w.id === workspaceId);
  const workspaceName = workspace?.name ?? "Workspace";
  const workspaceType = workspace?.type ?? "custom";
  const typeDef = WORKSPACE_TYPE_REGISTRY.find((t) => t.type === workspaceType) ?? WORKSPACE_TYPE_REGISTRY[3];
  const typeColor = TYPE_COLOR[workspaceType] ?? TYPE_COLOR.custom;

  // Active nav item
  const isOnWorkspace = pathname === `/workflows/${workspaceId}`;
  const activeSection = searchParams.get("section") ?? "pipeline-runs";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = (user.displayName ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <aside
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      className={cn(
        "h-screen flex flex-col flex-shrink-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* ── Brand + collapse toggle ── */}
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
              className={cn("p-1.5 rounded-md transition-colors hover:bg-black/5", isCollapsed && "mx-auto")}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{isCollapsed ? "Expand" : "Collapse"}</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Back to workspaces ── */}
      <div className="px-2 pt-3 pb-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/workflows")}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors"
              style={{ color: "var(--sidebar-muted)", fontSize: "0.78rem" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" />
              {!isCollapsed && <span>Workspaces</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Back to Workspaces</TooltipContent>}
        </Tooltip>
      </div>

      {/* ── Workspace identity (name + type chip) ── */}
      {!isCollapsed && (
        <div className="px-3 pb-3 flex-shrink-0">
          <div
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "0.18rem 0.55rem", borderRadius: "999px",
              background: `${typeColor}14`, color: typeColor,
              fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.02em",
              marginBottom: "0.4rem",
            }}
          >
            {typeDef.label}
          </div>
          <p
            style={{
              fontSize: "0.88rem", fontWeight: 600, color: "var(--foreground)",
              lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {workspaceName}
          </p>
        </div>
      )}

      {/* ── Nav items ── */}
      <div
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
        className="flex-1 flex flex-col px-2 pt-2 gap-0.5 overflow-y-auto"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = isOnWorkspace && activeSection === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push(`/workflows/${workspaceId}?section=${id}`)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
                  style={{
                    background: active ? "var(--sidebar-active)" : "transparent",
                    color: active ? "var(--coral)" : "var(--sidebar-fg)",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: active ? "var(--coral)" : "var(--sidebar-muted)" }}
                  />
                  {!isCollapsed && (
                    <span style={{ fontSize: "0.84rem", fontWeight: active ? 500 : 400 }}>
                      {label}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          );
        })}
      </div>

      {/* ── User footer ── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)" }} className="flex-shrink-0 p-2 space-y-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/profile")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
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

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
              style={{ color: "var(--sidebar-muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                (e.currentTarget as HTMLElement).style.color = "var(--destructive)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--sidebar-muted)";
              }}
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
