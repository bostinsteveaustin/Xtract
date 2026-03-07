"use client";

import { useRouter, useParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkflows } from "@/hooks/use-workflows";

interface DeleteWorkflowDialogProps {
  workflowId: string;
  workflowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteWorkflowDialog({
  workflowId,
  workflowName,
  open,
  onOpenChange,
}: DeleteWorkflowDialogProps) {
  const { deleteWorkflow } = useWorkflows();
  const router = useRouter();
  const params = useParams();

  const handleDelete = async () => {
    await deleteWorkflow(workflowId);
    onOpenChange(false);
    // If we deleted the currently-viewed workflow, navigate away
    if (params.id === workflowId) {
      router.push("/workflows");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{workflowName}&rdquo; and all
            associated extraction runs, results, and exports. This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
