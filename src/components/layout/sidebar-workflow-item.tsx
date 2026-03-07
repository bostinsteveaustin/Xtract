"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Pencil, Trash2, GitBranch } from "lucide-react";
import { RenameWorkflowDialog } from "./rename-workflow-dialog";
import { DeleteWorkflowDialog } from "./delete-workflow-dialog";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

interface SidebarWorkflowItemProps {
  id: string;
  name: string;
  status: string;
}

export function SidebarWorkflowItem({ id, name, status }: SidebarWorkflowItemProps) {
  const params = useParams();
  const router = useRouter();
  const { isCollapsed } = useSidebar();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isActive = params.id === id;

  const handleClick = () => {
    router.push(`/workflows/${id}`);
  };

  const statusColor = status === "active" ? "bg-emerald-500" : "bg-muted-foreground/40";

  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className={cn(
                "w-10 h-10 mx-auto flex items-center justify-center rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", statusColor)} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{name}</TooltipContent>
        </Tooltip>
        <RenameWorkflowDialog workflowId={id} currentName={name} open={renameOpen} onOpenChange={setRenameOpen} />
        <DeleteWorkflowDialog workflowId={id} workflowName={name} open={deleteOpen} onOpenChange={setDeleteOpen} />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={handleClick}
      >
        <GitBranch className="h-4 w-4 flex-shrink-0" />
        <span className="truncate flex-1">{name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted-foreground/10 transition-opacity"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RenameWorkflowDialog workflowId={id} currentName={name} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteWorkflowDialog workflowId={id} workflowName={name} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
