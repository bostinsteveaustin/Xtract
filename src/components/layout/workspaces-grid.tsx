"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { CreateWorkflowDialog } from "./create-workflow-dialog";

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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspacesGrid({ workflows }: WorkspacesGridProps) {
  const router = useRouter();

  return (
    <div className="flex-1 overflow-auto" style={{ padding: "2.5rem 2rem" }}>
      {/* Page header — matches Nexs: heading left, single CTA right */}
      <div className="flex items-center justify-between mb-8">
        <h1
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "var(--foreground)",
            margin: 0,
            fontFamily: "var(--font-sans)",
          }}
        >
          Workspaces
        </h1>
        <CreateWorkflowDialog variant="page" />
      </div>

      {/* Empty state */}
      {workflows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 0" }}>
          <div
            style={{
              width: "3.5rem", height: "3.5rem", borderRadius: "50%",
              background: "var(--muted)", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <FolderOpen className="h-6 w-6" style={{ color: "var(--muted-fg)" }} />
          </div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.4rem" }}>
            No workspaces yet
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.5rem" }}>
            Create your first workspace to start extracting intelligence from documents.
          </p>
          <CreateWorkflowDialog variant="page" />
        </div>
      ) : (
        /* Card grid — Nexs pattern: 3 columns, minimal cards */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {workflows.map((w) => (
            <button
              key={w.id}
              onClick={() => router.push(`/workflows/${w.id}`)}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                textAlign: "left",
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
                minHeight: "7.5rem",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 16px rgba(26,35,50,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Icon + name */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                <div
                  style={{
                    width: "2rem", height: "2rem", borderRadius: "7px",
                    background: "var(--muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: "0.1rem",
                  }}
                >
                  <FolderOpen
                    style={{ width: "1rem", height: "1rem", color: "var(--muted-fg)" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "var(--foreground)",
                      lineHeight: 1.3,
                    }}
                  >
                    {w.name}
                  </div>
                  {w.description && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted-fg)",
                        marginTop: "0.25rem",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {w.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Date — bottom left, muted */}
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted-fg)",
                  marginTop: "auto",
                }}
              >
                {formatDate(w.updated_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
