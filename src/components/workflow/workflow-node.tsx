"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Upload, Settings, Play, Download, Loader2, Check, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NodeType, NodeStatus } from "@/types/workflow";

interface WorkflowNodeProps {
  data: {
    nodeType: NodeType;
    label: string;
    status: NodeStatus;
    error?: string;
    progress?: number;
  };
  selected?: boolean;
}

const nodeIcons: Record<NodeType, React.ReactNode> = {
  "document-ingest": <Upload className="h-5 w-5" />,
  "ctx-configuration": <Settings className="h-5 w-5" />,
  "control-extraction": <Play className="h-5 w-5" />,
  "workbook-export": <Download className="h-5 w-5" />,
};

const nodeColors: Record<NodeType, string> = {
  "document-ingest": "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60",
  "ctx-configuration": "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60",
  "control-extraction": "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60",
  "workbook-export": "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60",
};

const iconColors: Record<NodeType, string> = {
  "document-ingest": "text-blue-500",
  "ctx-configuration": "text-purple-500",
  "control-extraction": "text-amber-500",
  "workbook-export": "text-emerald-500",
};

const statusBadge: Record<NodeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "Ready", variant: "outline" },
  running: { label: "Running", variant: "default" },
  completed: { label: "Done", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
};

function WorkflowNodeComponent({ data, selected }: WorkflowNodeProps) {
  const { nodeType, label, status } = data;
  const badge = statusBadge[status];

  return (
    <div className="relative">
      {/* Source handle (left) — hidden for first node */}
      {nodeType !== "document-ingest" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
        />
      )}

      <Card
        className={`w-[180px] cursor-pointer transition-all duration-200 ${nodeColors[nodeType]} ${
          selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex-shrink-0 ${iconColors[nodeType]}`}>
              {status === "running" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "completed" ? (
                <Check className="h-5 w-5 text-emerald-500" />
              ) : status === "error" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                nodeIcons[nodeType]
              )}
            </div>
            <span className="text-sm font-medium leading-tight">{label}</span>
          </div>

          <Badge variant={badge.variant} className="text-[10px] px-2 py-0">
            {badge.label}
          </Badge>
        </CardContent>
      </Card>

      {/* Target handle (right) — hidden for last node */}
      {nodeType !== "workbook-export" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
        />
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
