// Workflow type definitions for React Flow canvas system

export type NodeType = 'document-ingest' | 'ctx-configuration' | 'control-extraction' | 'workbook-export';
export type NodeStatus = 'idle' | 'running' | 'completed' | 'error';

// ─── Node-Specific Config Data ───────────────────────────

export interface DocumentIngestNodeData {
  documentSetId?: string;
  uploadedFileCount: number;
  totalFileSize: number;
  fileNames: string[];
  supportedTypes: string[];
}

export interface CTXConfigurationNodeData {
  selectedCtxId?: string;
  selectedCtxName?: string;
  availableCtxConfigs: Array<{
    id: string;
    name: string;
    version: string;
    status: 'draft' | 'active' | 'deprecated';
  }>;
}

export interface ControlExtractionNodeData {
  extractionRunId?: string;
  documentSetId?: string;
  ctxConfigurationId?: string;
  passNumber?: number;
  totalPasses: number;
  progress?: number;
}

export interface WorkbookExportNodeData {
  exportFormat: 'xlsx' | 'icml';
  extractionRunId?: string;
  downloadUrl?: string;
  exportedFileName?: string;
}

// ─── Unified Node State (stored in DB) ───────────────────

export interface WorkflowNodeState {
  nodeId: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  data: Record<string, unknown>;
  outputIds: {
    documentSetId?: string;
    ctxConfigurationId?: string;
    extractionRunId?: string;
    exportedFileUrl?: string;
  };
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

// ─── Workflow Execution State (full state per run) ───────

export interface WorkflowExecutionState {
  workflowRunId: string;
  workflowId: string;
  nodeStates: Record<string, WorkflowNodeState>;
  currentNodeId: string;
  executionOrder: string[];
  metadata: {
    startedAt: string;
    completedAt?: string;
    initiatedBy: string;
  };
}

// ─── Workflow Definition (template stored in DB) ────────

export interface WorkflowDefinition {
  templateId: string;
  version: '1.0.0';
  nodes: Array<{
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    animated: boolean;
  }>;
  executionOrder: string[];
}

// ─── React Flow Node Type ───────────────────────────────

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    nodeType: NodeType;
    label: string;
    status: NodeStatus;
    error?: string;
    progress?: number;
    configData: DocumentIngestNodeData | CTXConfigurationNodeData | ControlExtractionNodeData | WorkbookExportNodeData;
    onStatusChange?: (status: NodeStatus, data: Partial<Record<string, unknown>>) => void;
  };
}

// ─── Error Types ────────────────────────────────────────

export interface NodeError {
  nodeId: string;
  code: 'VALIDATION_ERROR' | 'API_ERROR' | 'STORAGE_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  timestamp: string;
  recoverable: boolean;
}

// ─── Handler Response Types ─────────────────────────────

export interface DocumentIngestResult {
  documentSetId: string;
  uploadedFileCount: number;
  totalFileSize: number;
}

export interface CTXConfigurationResult {
  ctxConfigurationId: string;
  ctxName: string;
}

export interface ExtractionResult {
  extractionRunId: string;
  documentSetId: string;
  ctxConfigurationId: string;
}

export interface ExportResult {
  downloadUrl: string;
  fileName: string;
  format: 'xlsx' | 'icml';
}
