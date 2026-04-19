"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  FileText,
  Shield,
  Brain,
  Layers,
  ChevronLeft,
  Check,
} from "lucide-react";
import { useWorkflows } from "@/hooks/use-workflows";
import { useSidebar } from "@/hooks/use-sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  WORKSPACE_TYPE_REGISTRY,
  type WorkspaceType,
  type WorkspaceTypeDefinition,
} from "@/lib/pipeline/workspace-registry";

// ─── Icon map ────────────────────────────────────────────────────────────────

function TypeIcon({
  icon,
  size = 20,
}: {
  icon: WorkspaceTypeDefinition["icon"];
  size?: number;
}) {
  const props = { width: size, height: size };
  switch (icon) {
    case "file-text":
      return <FileText {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "brain":
      return <Brain {...props} />;
    case "layers":
    default:
      return <Layers {...props} />;
  }
}

const TYPE_COLORS: Record<WorkspaceType, string> = {
  contract:   "var(--coral)",
  regulatory: "var(--tier-authoritative)",
  knowhow:    "var(--tier-working)",
  custom:     "var(--muted-fg)",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface CreateWorkflowDialogProps {
  variant?: "sidebar" | "page";
}

export function CreateWorkflowDialog({ variant = "sidebar" }: CreateWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [selectedType, setSelectedType] = useState<WorkspaceType>("custom");

  // Step 2 state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const { createWorkflow } = useWorkflows();
  const { isCollapsed } = useSidebar();
  const router = useRouter();

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) {
      // Reset on close
      setStep(1);
      setSelectedType("custom");
      setName("");
      setDescription("");
    }
  }

  function handleTypeSelect(type: WorkspaceType) {
    setSelectedType(type);
    setStep(2);
    // Default name from type
    const def = WORKSPACE_TYPE_REGISTRY.find((t) => t.type === type);
    if (!name) setName(def?.label ? `My ${def.label} Workspace` : "My Workspace");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);

    // Pick default template for type
    const typeTemplates: Record<WorkspaceType, string> = {
      contract:   "contract-extraction-v1",
      regulatory: "ontology-v1",
      knowhow:    "ontology-v1",
      custom:     "ontology-v1",
    };

    const workflow = await createWorkflow(name.trim(), {
      type: selectedType,
      description: description.trim() || undefined,
      templateId: typeTemplates[selectedType],
    });

    setCreating(false);
    if (workflow) {
      handleClose(false);
      router.push(`/workflows/${workflow.id}`);
    }
  }

  // ── Triggers ──────────────────────────────────────────────────────────────

  const pageTrigger = (
    <button className="btn-coral flex items-center gap-2" style={{ fontFamily: "var(--font-sans)" }}>
      <Plus className="h-4 w-4" />
      New Workspace
    </button>
  );

  const sidebarTrigger = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          style={{
            background: "transparent", color: "var(--sidebar-muted)",
            padding: "0.4rem", borderRadius: "6px", border: "none",
            cursor: "pointer", display: "flex", margin: "0 auto",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">New Workspace</TooltipContent>
    </Tooltip>
  ) : (
    <button
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
        background: "var(--coral)", color: "#FFFFFF", border: "none",
        borderRadius: "8px", padding: "0.5rem 0.75rem", cursor: "pointer",
        fontSize: "0.83rem", fontWeight: 500, fontFamily: "var(--font-sans)",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--coral)"; }}
    >
      <Plus className="h-3.5 w-3.5" />
      New Workspace
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {variant === "page" ? pageTrigger : sidebarTrigger}
      </DialogTrigger>

      <DialogContent style={{ maxWidth: "520px" }}>
        {/* ── Step 1: Pick workspace type ── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle style={{ fontSize: "1.05rem" }}>
                Choose workspace type
              </DialogTitle>
              <p style={{ fontSize: "0.82rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
                Type determines which pipelines appear by default.
              </p>
            </DialogHeader>

            <div
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem", paddingTop: "0.5rem",
              }}
            >
              {WORKSPACE_TYPE_REGISTRY.map((typeDef) => {
                const color = TYPE_COLORS[typeDef.type];
                return (
                  <button
                    key={typeDef.type}
                    onClick={() => handleTypeSelect(typeDef.type)}
                    style={{
                      textAlign: "left", padding: "1rem",
                      borderRadius: "10px", border: "1.5px solid var(--border)",
                      background: "var(--paper)", cursor: "pointer",
                      transition: "border-color 0.12s, box-shadow 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = color;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${color}18`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        width: "2rem", height: "2rem", borderRadius: "8px",
                        background: `${color}14`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color, marginBottom: "0.625rem",
                      }}
                    >
                      <TypeIcon icon={typeDef.icon} size={16} />
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                      {typeDef.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)", lineHeight: 1.4 }}>
                      {typeDef.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 2: Name & describe ── */}
        {step === 2 && (
          <>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--muted-fg)", display: "flex", alignItems: "center",
                    padding: "0.125rem",
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <DialogTitle style={{ fontSize: "1.05rem" }}>
                  Name your workspace
                </DialogTitle>
              </div>

              {/* Selected type chip */}
              {(() => {
                const def = WORKSPACE_TYPE_REGISTRY.find((t) => t.type === selectedType)!;
                const color = TYPE_COLORS[selectedType];
                return (
                  <div
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.375rem",
                      padding: "0.2rem 0.6rem", borderRadius: "999px",
                      background: `${color}12`, color, fontSize: "0.75rem", fontWeight: 500,
                      width: "fit-content", marginTop: "0.5rem",
                    }}
                  >
                    <TypeIcon icon={def.icon} size={11} />
                    {def.label}
                    <Check className="h-3 w-3" style={{ marginLeft: "0.1rem" }} />
                  </div>
                );
              })()}
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label style={{ fontSize: "0.82rem" }}>Workspace name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. National Highways C-Track"
                  onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label style={{ fontSize: "0.82rem" }}>
                  Description
                  <span style={{ color: "var(--muted-fg)", fontWeight: 400, marginLeft: "0.3rem" }}>
                    (optional)
                  </span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this engagement about?"
                  rows={2}
                  style={{ resize: "none", fontSize: "0.875rem" }}
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="w-full"
                style={{
                  background: "var(--coral)", color: "#FFFFFF", border: "none",
                  fontWeight: 500,
                }}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
