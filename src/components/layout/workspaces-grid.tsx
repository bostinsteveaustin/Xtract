"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { CreateWorkflowDialog } from "./create-workflow-dialog";

interface Workflow {
  id: string;
  name: string;
  template_id: string | null;
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

function templateLabel(templateId: string | null): string {
  if (!templateId) return "Custom pipeline";
  if (templateId === "contract-extraction-v1") return "Contract Extraction";
  if (templateId === "ontology-v1") return "Ontology Generation";
  return templateId;
}

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
            {workflows.length} pipeline {workflows.length === 1 ? "run" : "runs"}
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
            <FolderOpen className="h-6 w-6" style={{ color: "var(--muted-fg)" }} />
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
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}>
          {workflows.map((w) => (
            <button
              key={w.id}
              onClick={() => router.push(`/workflows/${w.id}`)}
              style={{
                background: "var(--paper)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "1.25rem 1.5rem",
                textAlign: "left", cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
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
              {/* Icon + name */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                <div style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "8px",
                  background: "var(--muted)", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>
                  <FolderOpen className="h-4 w-4" style={{ color: "var(--muted-fg)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)",
                    lineHeight: 1.3, marginBottom: "0.25rem",
                  }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-fg)", lineHeight: 1.4 }}>
                    {templateLabel(w.template_id)}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
                  {templateLabel(w.template_id)}
                </span>
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
