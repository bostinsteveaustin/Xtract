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

export function CreateWorkflowDialog() {
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

  const trigger = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 mx-auto">
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">New Pipeline</TooltipContent>
    </Tooltip>
  ) : (
    <Button variant="ghost" className="w-full justify-start gap-2 px-3">
      <Plus className="h-4 w-4" />
      New Pipeline
    </Button>
  );

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
