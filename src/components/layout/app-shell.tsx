"use client";

import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { createClient } from "@/lib/supabase/client";

interface AppShellUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AppShellProps {
  children: React.ReactNode;
  user: AppShellUser;
}

/**
 * Three layout modes based on pathname:
 *
 * 1. /workflows (exact)          → no sidebar, Nexs full-page selection
 * 2. /workflows/:id (and deeper) → WorkspaceSidebar (runs list + tools)
 * 3. Everything else             → AppSidebar (global nav)
 */
export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // ── Mode 1: Workspace selection screen ────────────────────────────────────
  if (pathname === "/workflows") {
    const handleSignOut = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    };

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>
        {/* Minimal top bar */}
        <div style={{
          height: "3.25rem", borderBottom: "1px solid var(--border)",
          background: "var(--paper)", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 2rem", flexShrink: 0,
        }}>
          <div
            style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", cursor: "pointer" }}
            onClick={() => router.push("/workflows")}
          >
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--foreground)", fontFamily: "var(--font-sans)" }}>
              Xtract
            </span>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-fg)" }}>
              BridgingX
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted-fg)" }}>{user.email}</span>
            <button
              onClick={handleSignOut}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "var(--muted-fg)", padding: "0.25rem 0" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-fg)"; }}
            >
              Sign out
            </button>
          </div>
        </div>
        <main style={{ flex: 1, overflow: "hidden" }}>{children}</main>
      </div>
    );
  }

  // ── Mode 2: Inside a workspace ────────────────────────────────────────────
  const workspaceMatch = pathname.match(/^\/workflows\/([0-9a-f-]{36})/i);
  const workspaceId = workspaceMatch?.[1];

  if (workspaceId) {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>
        <WorkspaceSidebar workspaceId={workspaceId} user={user} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  // ── Mode 3: Global app (marketplace, profile, settings, etc.) ────────────
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>
      <AppSidebar user={user} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
