"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useWorkflows } from "@/hooks/use-workflows";
import { useSidebar } from "@/hooks/use-sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CreateWorkflowDialogProps {
  variant?: "sidebar" | "page";
}

export function CreateWorkflowDialog({ variant = "sidebar" }: CreateWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Untitled Pipeline");
  const [templateId, setTemplateId] = useState("ontology-v1");
  const [creating, setCreating] = useState(false);
  const { createWorkflow } = useWorkflows();
  const { isCollapsed } = useSidebar();
  const router = useRouter();

  const handleCreate = async () => {
    setCreating(true);
    const workflow = await createWorkflow(
      name.trim() || "Untitled Pipeline",
      templateId === "blank" ? undefined : templateId
    );
    setCreating(false);
    if (workflow) {
      setOpen(false);
      setName("Untitled Pipeline");
      router.push(`/workflows/${workflow.id}`);
    }
  };

  // Page variant — coral pill button matching Nexs style
  const pageTrigger = (
    <button
      className="btn-coral flex items-center gap-2"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <Plus className="h-4 w-4" />
      New Workspace
    </button>
  );

  const sidebarTrigger = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          style={{ background: "transparent", color: "var(--sidebar-muted)", padding: "0.4rem", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", margin: "0 auto" }}
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

  const trigger = variant === "page" ? pageTrigger : sidebarTrigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Pipeline Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Pipeline"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ontology-v1">Ontology Pipeline</SelectItem>
                <SelectItem value="contract-extraction-v1">Contract Extraction</SelectItem>
                <SelectItem value="blank">Blank Pipeline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Pipeline"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
