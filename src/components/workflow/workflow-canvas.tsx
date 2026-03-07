"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./workflow-node";
import type { WorkflowDefinition, WorkflowNodeState, NodeStatus } from "@/types/workflow";

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  nodeStates: Record<string, { status: NodeStatus }>;
  onNodeClick?: (nodeId: string) => void;
}

export function WorkflowCanvas({ definition, nodeStates, onNodeClick }: WorkflowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      "document-ingest": WorkflowNode,
      "ctx-configuration": WorkflowNode,
      "control-extraction": WorkflowNode,
      "workbook-export": WorkflowNode,
    }),
    []
  );

  const nodes: Node[] = useMemo(
    () =>
      definition.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          nodeType: node.type,
          label: (node.data as { label?: string })?.label ?? node.type,
          status: nodeStates[node.id]?.status ?? "idle",
        },
      })),
    [definition.nodes, nodeStates]
  );

  const edges: Edge[] = useMemo(
    () =>
      definition.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated,
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 2, opacity: 0.4 },
      })),
    [definition.edges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
        <Controls showInteractive={false} className="!bg-background !border-border !shadow-md" />
      </ReactFlow>
    </div>
  );
}
