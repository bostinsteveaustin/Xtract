"use client";

import { useState, useCallback } from "react";
import { WorkflowCanvas } from "./workflow-canvas";
import { IngestPanel } from "./panels/ingest-panel";
import { CTXPanel } from "./panels/ctx-panel";
import { ExtractionPanel } from "./panels/extraction-panel";
import { ExportPanel } from "./panels/export-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WorkflowDefinition, NodeStatus, NodeType } from "@/types/workflow";

interface NodeState {
  status: NodeStatus;
  documentSetId?: string;
  ctxConfigurationId?: string;
  workflowRunId?: string;
}

interface WorkflowPageClientProps {
  workflowId: string;
  definition: WorkflowDefinition;
}

const panelTitles: Record<string, string> = {
  "node-ingest": "Document Ingest",
  "node-ctx": "CTX Configuration",
  "node-extract": "Control Extraction",
  "node-export": "Workbook Export",
};

export function WorkflowPageClient({ workflowId, definition }: WorkflowPageClientProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(() => {
    const initial: Record<string, NodeState> = {};
    for (const node of definition.nodes) {
      initial[node.id] = { status: "idle" };
    }
    return initial;
  });

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeState = useCallback((nodeId: string, updates: Partial<NodeState>) => {
    setNodeStates((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...updates },
    }));
  }, []);

  // Get data flowing between nodes
  const documentSetId = nodeStates["node-ingest"]?.documentSetId;
  const ctxConfigurationId = nodeStates["node-ctx"]?.ctxConfigurationId;
  const workflowRunId = nodeStates["node-extract"]?.workflowRunId;

  const renderPanel = () => {
    if (!selectedNodeId) return null;

    const selectedNode = definition.nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return null;

    switch (selectedNode.type as NodeType) {
      case "document-ingest":
        return (
          <IngestPanel
            workflowId={workflowId}
            onComplete={(docSetId) => {
              updateNodeState("node-ingest", {
                status: "completed",
                documentSetId: docSetId,
              });
            }}
            isCompleted={nodeStates["node-ingest"]?.status === "completed"}
          />
        );

      case "ctx-configuration":
        return (
          <CTXPanel
            onComplete={(ctxId) => {
              updateNodeState("node-ctx", {
                status: "completed",
                ctxConfigurationId: ctxId,
              });
            }}
            isCompleted={nodeStates["node-ctx"]?.status === "completed"}
          />
        );

      case "control-extraction":
        return (
          <ExtractionPanel
            workflowId={workflowId}
            documentSetId={documentSetId}
            ctxConfigurationId={ctxConfigurationId}
            onComplete={(runId) => {
              updateNodeState("node-extract", {
                status: "completed",
                workflowRunId: runId,
              });
            }}
            onRunning={() => {
              updateNodeState("node-extract", { status: "running" });
            }}
            isCompleted={nodeStates["node-extract"]?.status === "completed"}
          />
        );

      case "workbook-export":
        return (
          <ExportPanel
            workflowId={workflowId}
            workflowRunId={workflowRunId}
            isReady={nodeStates["node-extract"]?.status === "completed"}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Canvas area */}
      <div className="flex-1 relative">
        <WorkflowCanvas
          definition={definition}
          nodeStates={nodeStates}
          onNodeClick={handleNodeClick}
        />

        {/* Instruction overlay when nothing clicked */}
        {!selectedNodeId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm border rounded-lg px-4 py-2 text-sm text-muted-foreground">
            Click a node to begin
          </div>
        )}
      </div>

      {/* Side panel */}
      <Sheet open={!!selectedNodeId} onOpenChange={(open) => !open && handleClosePanel()}>
        <SheetContent className="w-[420px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedNodeId ? panelTitles[selectedNodeId] ?? "Node" : "Node"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{renderPanel()}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
