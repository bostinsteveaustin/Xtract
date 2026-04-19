"use client";

import { useRouter } from "next/navigation";
import { FileText, Shield, Brain, Layers } from "lucide-react";
import { CreateWorkflowDialog } from "./create-workflow-dialog";
import type { WorkspaceType } from "@/lib/pipeline/workspace-registry";

interface Workflow {
  id: string;
  name: string;
  template_id: string | null;
  type: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspacesGridProps {
  workflows: Workflow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Type badge helpers ───────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  contract:   "Contract",
  regulatory: "Regulatory",
  knowhow:    "Knowhow",
  custom:     "Custom",
};

const TYPE_COLOR: Record<string, string> = {
  contract:   "var(--coral)",
  regulatory: "var(--tier-authoritative)",
  knowhow:    "var(--tier-working)",
  custom:     "var(--muted-fg)",
};

function TypeBadge({ type }: { type: string | null }) {
  const t = (type ?? "custom") as WorkspaceType;
  const label = TYPE_LABEL[t] ?? "Custom";
  const color = TYPE_COLOR[t] ?? TYPE_COLOR.custom;

  const Icon = {
    contract:   FileText,
    regulatory: Shield,
    knowhow:    Brain,
    custom:     Layers,
  }[t] ?? Layers;

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        padding: "0.18rem 0.55rem", borderRadius: "999px",
        background: `${color}12`, color,
        fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.01em",
      }}
    >
      <Icon style={{ width: "0.7rem", height: "0.7rem" }} />
      {label}
    </span>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function WorkspacesGrid({ workflows }: WorkspacesGridProps) {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-auto" style={{ padding: "2.5rem 3rem" }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            Workspaces
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
            {workflows.length} engagement {workflows.length === 1 ? "workspace" : "workspaces"}
          </p>
        </div>
        <CreateWorkflowDialog variant="page" />
      </div>

      {/* Grid */}
      {workflows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{
            width: "3.5rem", height: "3.5rem", borderRadius: "50%",
            background: "var(--muted)", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 1rem",
          }}>
            <Layers className="h-6 w-6" style={{ color: "var(--muted-fg)" }} />
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
            No workspaces yet
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.5rem" }}>
            Create your first workspace to start extracting intelligence from documents.
          </p>
          <CreateWorkflowDialog variant="page" />
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "1.25rem",
        }}>
          {workflows.map((w) => (
            <button
              key={w.id}
              onClick={() => router.push(`/workflows/${w.id}`)}
              style={{
                background: "var(--paper)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "1.25rem 1.5rem",
                textAlign: "left", cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(26,35,50,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Name */}
              <div style={{
                fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)",
                lineHeight: 1.3,
              }}>
                {w.name}
              </div>

              {/* Description */}
              {w.description && (
                <div style={{
                  fontSize: "0.8rem", color: "var(--muted-fg)", lineHeight: 1.45,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {w.description}
                </div>
              )}

              {/* Footer: type badge + date */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                <TypeBadge type={w.type} />
                <span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
                  {formatDate(w.updated_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
