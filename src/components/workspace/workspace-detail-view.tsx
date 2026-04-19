"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LastRunPanel } from "./last-run-panel";
import {
  FileText, Shield, Brain, Layers, Play, Upload, X,
  Clock, CheckCircle2, AlertCircle, Loader2, Cpu,
  Settings2, FileUp, FlaskConical, ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkflows } from "@/hooks/use-workflows";
import {
  WORKSPACE_TYPE_REGISTRY,
  PIPELINE_REGISTRY,
  getPipelinesForType,
  type WorkspaceType,
  type WorkspaceTypeDefinition,
} from "@/lib/pipeline/workspace-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowRun {
  id: string;
  status: string;
  pipeline_type: string | null;
  tokens_used: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface SourceDocument {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface WorkflowDetail {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  workspace_ctx_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  contract:   "var(--coral)",
  regulatory: "var(--tier-authoritative)",
  knowhow:    "var(--tier-working)",
  custom:     "var(--muted-fg)",
};

function TypeIcon({ icon, size = 16 }: { icon: WorkspaceTypeDefinition["icon"]; size?: number }) {
  const p = { width: size, height: size };
  switch (icon) {
    case "file-text":  return <FileText {...p} />;
    case "shield":     return <Shield {...p} />;
    case "brain":      return <Brain {...p} />;
    default:           return <Layers {...p} />;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusChip({ status }: { status: string }) {
  const cfg = {
    completed: { icon: CheckCircle2, color: "var(--tier-working)", bg: "var(--tier-working-soft)", label: "Completed" },
    running:   { icon: Loader2,      color: "var(--coral)",        bg: "var(--coral-soft)",        label: "Running"   },
    failed:    { icon: AlertCircle,  color: "var(--destructive)",  bg: "rgba(var(--destructive-rgb,220,38,38),0.08)", label: "Failed" },
    pending:   { icon: Clock,        color: "var(--muted-fg)",     bg: "var(--muted)",             label: "Pending"   },
  }[status] ?? { icon: Clock, color: "var(--muted-fg)", bg: "var(--muted)", label: status };

  const Icon = cfg.icon;

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        padding: "0.2rem 0.6rem", borderRadius: "999px",
        background: cfg.bg, color: cfg.color,
        fontSize: "0.72rem", fontWeight: 500,
      }}
    >
      <Icon style={{ width: "0.7rem", height: "0.7rem" }} className={status === "running" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

// ─── New Run Dialog ───────────────────────────────────────────────────────────

function NewRunDialog({
  workflowId,
  workspaceType,
  open,
  onClose,
}: {
  workflowId: string;
  workspaceType: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { defaults, all } = getPipelinesForType(workspaceType);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(defaults[0]?.key ?? all[0]?.key ?? "ontology-v1");
  const pipelines = showAll ? all : defaults.length > 0 ? defaults : all;

  function handleStart() {
    onClose();
    router.push(`/workflows/${workflowId}/run?template=${selected}`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: "480px" }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: "1.05rem" }}>New Pipeline Run</DialogTitle>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
            Choose a pipeline to run against this workspace&apos;s documents.
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Pipeline list */}
          <div className="space-y-2">
            {pipelines.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelected(p.key)}
                style={{
                  width: "100%", textAlign: "left", padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: `1.5px solid ${selected === p.key ? "var(--coral)" : "var(--border)"}`,
                  background: selected === p.key ? "var(--coral-soft)" : "var(--paper)",
                  cursor: "pointer", transition: "border-color 0.12s",
                  display: "flex", alignItems: "flex-start", gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "1.75rem", height: "1.75rem", borderRadius: "6px",
                    background: selected === p.key ? "var(--coral)" : "var(--muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: "0.1rem",
                  }}
                >
                  <FlaskConical style={{ width: "0.875rem", height: "0.875rem", color: selected === p.key ? "#fff" : "var(--muted-fg)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-fg)", marginTop: "0.15rem" }}>
                    {p.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Show all toggle */}
          {!showAll && defaults.length < PIPELINE_REGISTRY.length && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted-fg)", fontSize: "0.78rem",
                display: "flex", alignItems: "center", gap: "0.3rem",
                padding: "0.1rem 0",
              }}
            >
              <Layers style={{ width: "0.75rem", height: "0.75rem" }} />
              Show all pipelines
            </button>
          )}

          <Button
            onClick={handleStart}
            disabled={!selected}
            className="w-full"
            style={{ background: "var(--coral)", color: "#fff", border: "none", fontWeight: 500 }}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start Run
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pipeline Runs Tab ────────────────────────────────────────────────────────

function RunsTab({ workflowId, onNewRun }: { workflowId: string; onNewRun: () => void }) {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/runs`)
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId]);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted-fg)", fontSize: "0.85rem" }}>
        Loading runs…
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div style={{ padding: "3.5rem", textAlign: "center" }}>
        <div style={{
          width: "3rem", height: "3rem", borderRadius: "50%", background: "var(--muted)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem",
        }}>
          <Cpu style={{ width: "1.25rem", height: "1.25rem", color: "var(--muted-fg)" }} />
        </div>
        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.4rem" }}>
          No runs yet
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--muted-fg)", marginBottom: "1.25rem" }}>
          Start a pipeline run to extract intelligence from your documents.
        </p>
        <button
          onClick={onNewRun}
          style={{
            background: "var(--coral)", color: "#fff", border: "none", borderRadius: "8px",
            padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.84rem", fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
          }}
        >
          <Play style={{ width: "0.875rem", height: "0.875rem" }} />
          New Pipeline Run
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 120px 100px 140px 80px",
          padding: "0.625rem 1rem", borderBottom: "1px solid var(--border)",
          fontSize: "0.72rem", fontWeight: 600, color: "var(--muted-fg)",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}
      >
        <span>Pipeline</span>
        <span>Status</span>
        <span>Tokens</span>
        <span>Date</span>
        <span />
      </div>

      {runs.map((run) => {
        const pipelineDef = PIPELINE_REGISTRY.find((p) => p.key === run.pipeline_type);
        const label = pipelineDef?.label ?? run.pipeline_type ?? "Pipeline Run";

        return (
          <div
            key={run.id}
            style={{
              display: "grid", gridTemplateColumns: "1fr 120px 100px 140px 80px",
              padding: "0.875rem 1rem", borderBottom: "1px solid var(--border)",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>
                {label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "0.1rem" }}>
                Started {formatDateTime(run.started_at ?? run.created_at)}
              </div>
            </div>
            <StatusChip status={run.status} />
            <span style={{ fontSize: "0.82rem", color: "var(--muted-fg)" }}>
              {run.tokens_used != null ? run.tokens_used.toLocaleString() : "—"}
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted-fg)" }}>
              {formatDate(run.completed_at ?? run.created_at)}
            </span>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {run.status === "completed" && (
                <button
                  onClick={() => router.push(`/workflows/${workflowId}/results`)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--coral)", fontSize: "0.78rem", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: "0.2rem",
                  }}
                >
                  View <ChevronRight style={{ width: "0.8rem", height: "0.8rem" }} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Source Documents Tab ─────────────────────────────────────────────────────

function DocumentsTab({ workflowId }: { workflowId: string }) {
  const [docs, setDocs] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(() => {
    fetch(`/api/workflows/${workflowId}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      await fetch(`/api/workflows/${workflowId}/documents`, { method: "POST", body: fd });
      await fetchDocs();
    } catch {
      // show toast in future
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/workflows/${workflowId}/documents/${docId}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(Array.from(e.dataTransfer.files));
        }}
        style={{
          border: `2px dashed ${dragOver ? "var(--coral)" : "var(--border)"}`,
          borderRadius: "10px", padding: "1.5rem",
          textAlign: "center", transition: "border-color 0.15s",
          background: dragOver ? "var(--coral-soft)" : "transparent",
          margin: "1rem",
          cursor: "pointer",
        }}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp style={{ width: "1.5rem", height: "1.5rem", color: "var(--muted-fg)", margin: "0 auto 0.5rem" }} />
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", fontWeight: 500, marginBottom: "0.25rem" }}>
          {uploading ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
          PDF, DOCX, TXT, XLSX — these become the workspace document pool
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.xlsx,.csv"
          style={{ display: "none" }}
          onChange={(e) => uploadFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* Document list */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-fg)", fontSize: "0.85rem" }}>
          Loading…
        </div>
      ) : docs.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted-fg)", fontSize: "0.82rem", padding: "1rem" }}>
          No documents yet. Upload files above.
        </p>
      ) : (
        <div style={{ margin: "0 1rem" }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem 0", borderBottom: "1px solid var(--border)",
              }}
            >
              <FileText style={{ width: "1rem", height: "1rem", color: "var(--muted-fg)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {doc.filename}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
                  {formatBytes(doc.file_size)} · {formatDate(doc.uploaded_at)}
                </div>
              </div>
              <button
                onClick={() => deleteDoc(doc.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted-fg)", padding: "0.25rem",
                  borderRadius: "4px", display: "flex",
                }}
                title="Remove"
              >
                <X style={{ width: "0.875rem", height: "0.875rem" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Context Tab ──────────────────────────────────────────────────────────────

function ContextTab({ workflowId, hasCtx }: { workflowId: string; hasCtx: boolean }) {
  void workflowId; // will be used when CTX management is wired up
  return (
    <div style={{ padding: "2rem 1rem" }}>
      <div
        style={{
          border: "1px solid var(--border)", borderRadius: "10px",
          padding: "1.5rem", background: "var(--paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "8px",
            background: hasCtx ? "var(--tier-working-soft)" : "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Brain style={{ width: "1rem", height: "1rem", color: hasCtx ? "var(--tier-working)" : "var(--muted-fg)" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
              Workspace CTX
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted-fg)", lineHeight: 1.5 }}>
              {hasCtx
                ? "A workspace-level CTX is attached. Pipeline runs inherit this CTX by default; you can override per-run."
                : "No workspace CTX attached. Pipelines will prompt you to select or upload a CTX at run time."}
            </div>
          </div>
        </div>
        <button
          style={{
            background: "var(--muted)", border: "1px solid var(--border)",
            borderRadius: "7px", padding: "0.4rem 0.875rem",
            fontSize: "0.8rem", fontWeight: 500, color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          {hasCtx ? "Replace CTX" : "Attach CTX"}
        </button>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "1rem", lineHeight: 1.6 }}>
        Pipeline-level technical CTX overrides the workspace CTX for that specific run.
        Manage per-run CTX from the Pipeline Runs tab.
      </p>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  workflow,
  onUpdated,
}: {
  workflow: WorkflowDetail;
  onUpdated: (updates: { name?: string; description?: string }) => void;
}) {
  const router = useRouter();
  const { updateWorkflow, deleteWorkflow } = useWorkflows();
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateWorkflow(workflow.id, { name, description: description || undefined });
    onUpdated({ name, description });
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteWorkflow(workflow.id);
    router.push("/workflows");
  }

  const typeDef = WORKSPACE_TYPE_REGISTRY.find((t) => t.type === workflow.type) ?? WORKSPACE_TYPE_REGISTRY[3];
  const typeColor = TYPE_COLOR[workflow.type ?? "custom"] ?? TYPE_COLOR.custom;

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: "480px" }}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label style={{ fontSize: "0.82rem" }}>Workspace name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label style={{ fontSize: "0.82rem" }}>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ resize: "none", fontSize: "0.875rem" }}
            placeholder="What is this engagement about?"
          />
        </div>

        <div className="space-y-1.5">
          <Label style={{ fontSize: "0.82rem" }}>Type</Label>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              padding: "0.3rem 0.75rem", borderRadius: "8px",
              border: "1px solid var(--border)", background: `${typeColor}08`,
              color: typeColor, fontSize: "0.82rem", fontWeight: 500,
            }}
          >
            <TypeIcon icon={typeDef.icon} size={13} />
            {typeDef.label}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
            Workspace type is locked after creation (v1).
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{ background: "var(--coral)", color: "#fff", border: "none", fontWeight: 500 }}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : "Save Changes"}
        </Button>
      </div>

      {/* Danger zone */}
      <div
        style={{
          marginTop: "2.5rem", paddingTop: "1.5rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--destructive)", marginBottom: "0.75rem" }}>
          Danger zone
        </h3>
        {confirmDelete ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted-fg)" }}>
              Delete this workspace and all its runs?
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "var(--destructive)", color: "#fff", border: "none",
                borderRadius: "7px", padding: "0.35rem 0.875rem",
                fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
              }}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: "7px",
                padding: "0.35rem 0.75rem", fontSize: "0.8rem", cursor: "pointer",
                color: "var(--muted-fg)",
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: "none", border: "1px solid var(--destructive)",
              borderRadius: "7px", padding: "0.4rem 0.875rem",
              fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
              color: "var(--destructive)",
            }}
          >
            Delete workspace
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WorkspaceDetailViewProps {
  workflow: WorkflowDetail;
}

export function WorkspaceDetailView({ workflow: initialWorkflow }: WorkspaceDetailViewProps) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sidebar bottom links send ?tab=documents|context|settings
  const activeTab = (searchParams.get("tab") ?? "documents") as "documents" | "context" | "settings";

  const typeDef = WORKSPACE_TYPE_REGISTRY.find((t) => t.type === workflow.type) ?? WORKSPACE_TYPE_REGISTRY[3];
  const typeColor = TYPE_COLOR[workflow.type ?? "custom"] ?? TYPE_COLOR.custom;

  return (
    <div className="flex-1 flex flex-row overflow-hidden">
      {/* ── Left: header + tabs ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* ── Workspace header ── */}
      <div
        style={{
          padding: "1.5rem 2rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--paper)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            {/* Type chip */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.2rem 0.6rem", borderRadius: "999px",
                background: `${typeColor}12`, color: typeColor,
                fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.02em",
                marginBottom: "0.5rem",
              }}
            >
              <TypeIcon icon={typeDef.icon} size={11} />
              {typeDef.label}
            </div>

            {/* Name */}
            <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
              {workflow.name}
            </h1>

            {/* Description */}
            {workflow.description && (
              <p style={{ fontSize: "0.84rem", color: "var(--muted-fg)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                {workflow.description}
              </p>
            )}
          </div>

          {/* New Run CTA */}
          <button
            onClick={() => setNewRunOpen(true)}
            style={{
              background: "var(--coral)", color: "#fff", border: "none",
              borderRadius: "8px", padding: "0.55rem 1.1rem",
              cursor: "pointer", fontSize: "0.84rem", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "0.4rem",
              flexShrink: 0, marginLeft: "1.5rem",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral)"; }}
          >
            <Play style={{ width: "0.875rem", height: "0.875rem" }} />
            New Pipeline Run
          </button>
        </div>
      </div>

      {/* ── Tabs — fills remaining height (runs are in sidebar) ── */}
      <Tabs
        value={activeTab}
        onValueChange={(tab) => router.push(`/workflows/${workflow.id}?tab=${tab}`)}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", gap: 0 }}
      >
        {/* Tab nav bar */}
        <div
          style={{
            background: "var(--paper)", borderBottom: "1px solid var(--border)",
            padding: "0 2rem", flexShrink: 0,
          }}
        >
          <TabsList variant="line" style={{ paddingBottom: 0 }}>
            <TabsTrigger value="documents" style={{ fontSize: "0.84rem" }}>
              <Upload style={{ width: "0.875rem", height: "0.875rem" }} />
              Source Documents
            </TabsTrigger>
            <TabsTrigger value="context" style={{ fontSize: "0.84rem" }}>
              <Brain style={{ width: "0.875rem", height: "0.875rem" }} />
              Context
            </TabsTrigger>
            <TabsTrigger value="settings" style={{ fontSize: "0.84rem" }}>
              <Settings2 style={{ width: "0.875rem", height: "0.875rem" }} />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable tab body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <TabsContent value="documents">
            <DocumentsTab workflowId={workflow.id} />
          </TabsContent>
          <TabsContent value="context">
            <ContextTab workflowId={workflow.id} hasCtx={workflow.workspace_ctx_id != null} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab
              workflow={workflow}
              onUpdated={(updates) =>
                setWorkflow((prev) => ({ ...prev, ...updates }))
              }
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* New Run dialog */}
      <NewRunDialog
        workflowId={workflow.id}
        workspaceType={workflow.type}
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
      />
      </div>{/* end left column */}

      {/* ── Right: last run panel ── */}
      <LastRunPanel workflowId={workflow.id} />
    </div>
  );
}
