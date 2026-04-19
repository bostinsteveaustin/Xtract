"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkflows } from "@/hooks/use-workflows";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PanelLeftClose, PanelLeftOpen, ArrowLeft, Play,
  CheckCircle2, AlertCircle, Clock, Loader2 as Spin,
  FileText, Brain, Settings2, Plus, User, LogOut,
  ChevronLeft,
} from "lucide-react";
import { PIPELINE_REGISTRY } from "@/lib/pipeline/workspace-registry";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunItem {
  id: string;
  status: string;
  pipeline_type: string | null;
  tokens_used: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface WorkspaceSidebarProps {
  workspaceId: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RunStatusDot({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-3 w-3 flex-shrink-0" style={{ color: "var(--tier-working)" }} />;
  if (status === "failed")
    return <AlertCircle className="h-3 w-3 flex-shrink-0" style={{ color: "var(--destructive)" }} />;
  if (status === "running")
    return <Spin className="h-3 w-3 flex-shrink-0 animate-spin" style={{ color: "var(--coral)" }} />;
  return <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "var(--muted-fg)" }} />;
}

function pipelineLabel(key: string | null): string {
  if (!key) return "Pipeline Run";
  return PIPELINE_REGISTRY.find((p) => p.key === key)?.label ?? "Pipeline Run";
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceSidebar({ workspaceId, user }: WorkspaceSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { workflows } = useWorkflows();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [runs, setRuns] = useState<RunItem[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  // Resolve workspace name from already-loaded workflows list
  const workspace = workflows.find((w) => w.id === workspaceId);
  const workspaceName = workspace?.name ?? "Workspace";

  // Active run = the runId in the results page URL
  const activeRunId =
    pathname.includes("/results") ? searchParams.get("runId") ?? "__latest__" : null;

  const fetchRuns = useCallback(() => {
    fetch(`/api/workflows/${workspaceId}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => {})
      .finally(() => setRunsLoading(false));
  }, [workspaceId]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navigateRun = (run: RunItem) => {
    if (run.status === "completed") {
      router.push(`/workflows/${workspaceId}/results?runId=${run.id}`);
    }
    // pending/running/failed: stay on workspace overview
  };

  const isRunActive = (run: RunItem) => {
    if (!activeRunId) return false;
    if (activeRunId === "__latest__" && runs[0]?.id === run.id) return true;
    return activeRunId === run.id;
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
      <div className="px-2 pt-2 pb-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/workflows")}
              className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors")}
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

      {/* ── Workspace name ── */}
      {!isCollapsed && (
        <div
          className="px-3 pb-2 flex-shrink-0 cursor-pointer"
          onClick={() => router.push(`/workflows/${workspaceId}`)}
        >
          <p
            style={{
              fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)",
              lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {workspaceName}
          </p>
        </div>
      )}

      {/* ── New Pipeline Run button ── */}
      <div className="px-2 pb-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            {isCollapsed ? (
              <button
                onClick={() => router.push(`/workflows/${workspaceId}/run`)}
                style={{
                  background: "var(--coral)", color: "#fff", border: "none",
                  borderRadius: "6px", padding: "0.4rem", cursor: "pointer",
                  display: "flex", margin: "0 auto", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral)"; }}
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => router.push(`/workflows/${workspaceId}/run`)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "var(--coral)", color: "#fff", border: "none",
                  borderRadius: "8px", padding: "0.45rem 0.75rem", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 500, transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral)"; }}
              >
                <Play className="h-3 w-3" />
                New Pipeline Run
              </button>
            )}
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">New Pipeline Run</TooltipContent>}
        </Tooltip>
      </div>

      {/* ── Runs list ── */}
      <div
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
        className="flex-shrink-0 px-2 pt-1.5 pb-0.5"
      >
        {!isCollapsed && (
          <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--sidebar-muted)", padding: "0 0.375rem 0.375rem" }}>
            Pipeline Runs
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 py-0.5">
          {runsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className={cn("h-8 rounded-md", isCollapsed ? "w-10 mx-auto" : "w-full")}
                  style={{ background: "rgba(26,35,50,0.07)" }}
                />
              ))}
            </>
          ) : runs.length === 0 ? (
            !isCollapsed && (
              <p style={{ fontSize: "0.75rem", color: "var(--sidebar-muted)", textAlign: "center", padding: "0.75rem 0.5rem" }}>
                No runs yet
              </p>
            )
          ) : (
            runs.map((run) => {
              const active = isRunActive(run);
              const label = pipelineLabel(run.pipeline_type);
              const date = formatShortDate(run.completed_at ?? run.started_at ?? run.created_at);
              const clickable = run.status === "completed";

              return (
                <Tooltip key={run.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => clickable && navigateRun(run)}
                      className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors text-left")}
                      style={{
                        background: active ? "var(--sidebar-active)" : "transparent",
                        color: active ? "var(--coral)" : "var(--sidebar-fg)",
                        cursor: clickable ? "pointer" : "default",
                        opacity: run.status === "failed" ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!active && clickable) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <RunStatusDot status={run.status} />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="truncate" style={{ fontSize: "0.8rem", fontWeight: active ? 500 : 400, lineHeight: 1.3 }}>
                            {label}
                          </div>
                          {date && (
                            <div style={{ fontSize: "0.68rem", color: "var(--sidebar-muted)", lineHeight: 1.2 }}>
                              {date}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {label} · {date}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* ── Workspace tools (Docs / Context / Settings) ── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)" }} className="flex-shrink-0 px-2 py-1.5 space-y-0.5">
        {[
          { icon: FileText, label: "Source Documents", tab: "documents" },
          { icon: Brain,    label: "Context",          tab: "context"   },
          { icon: Settings2, label: "Settings",        tab: "settings"  },
        ].map(({ icon: Icon, label, tab }) => {
          const href = `/workflows/${workspaceId}?tab=${tab}`;
          const active = pathname === `/workflows/${workspaceId}` && searchParams.get("tab") === tab;
          return (
            <Tooltip key={tab}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push(href)}
                  className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors")}
                  style={{
                    background: active ? "var(--sidebar-active)" : "transparent",
                    color: active ? "var(--coral)" : "var(--sidebar-fg)",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: active ? "var(--coral)" : "var(--sidebar-muted)" }} />
                  {!isCollapsed && <span style={{ fontSize: "0.8rem" }}>{label}</span>}
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
              className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors")}
              style={{ color: "var(--sidebar-fg)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--coral-soft)", color: "var(--coral)", fontSize: "0.65rem", fontWeight: 700 }}>
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
