// Workflow validation schemas using Zod

import { z } from 'zod';
import type {
  DocumentIngestNodeData,
  CTXConfigurationNodeData,
  ControlExtractionNodeData,
  WorkbookExportNodeData,
  WorkflowDefinition,
  WorkflowExecutionState,
  WorkflowNodeState,
} from '@/types/workflow';

// ─── Node Data Schemas ───────────────────────────────────

export const documentIngestNodeDataSchema = z.object({
  documentSetId: z.string().optional(),
  uploadedFileCount: z.number().default(0),
  totalFileSize: z.number().default(0),
  fileNames: z.array(z.string()).default([]),
  supportedTypes: z.array(z.string()).default(['pdf', 'docx', 'txt']),
}) satisfies z.ZodType<DocumentIngestNodeData>;

export const ctxConfigurationNodeDataSchema = z.object({
  selectedCtxId: z.string().optional(),
  selectedCtxName: z.string().optional(),
  availableCtxConfigs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'active', 'deprecated']),
  })).default([]),
}) satisfies z.ZodType<CTXConfigurationNodeData>;

export const controlExtractionNodeDataSchema = z.object({
  extractionRunId: z.string().optional(),
  documentSetId: z.string().optional(),
  ctxConfigurationId: z.string().optional(),
  passNumber: z.number().optional(),
  totalPasses: z.number().default(5),
  progress: z.number().min(0).max(100).optional(),
}) satisfies z.ZodType<ControlExtractionNodeData>;

export const workbookExportNodeDataSchema = z.object({
  exportFormat: z.enum(['xlsx', 'icml']).default('xlsx'),
  extractionRunId: z.string().optional(),
  downloadUrl: z.string().optional(),
  exportedFileName: z.string().optional(),
}) satisfies z.ZodType<WorkbookExportNodeData>;

// ─── Node State Schema ───────────────────────────────────

export const workflowNodeStateSchema = z.object({
  nodeId: z.string(),
  nodeType: z.enum(['document-ingest', 'ctx-configuration', 'control-extraction', 'workbook-export']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()),
  outputIds: z.object({
    documentSetId: z.string().optional(),
    ctxConfigurationId: z.string().optional(),
    extractionRunId: z.string().optional(),
    exportedFileUrl: z.string().optional(),
  }),
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }).optional(),
}) satisfies z.ZodType<WorkflowNodeState>;

// ─── Workflow Definition Schema ──────────────────────────

export const workflowDefinitionSchema = z.object({
  templateId: z.string(),
  version: z.literal('1.0.0'),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['document-ingest', 'ctx-configuration', 'control-extraction', 'workbook-export']),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    data: z.record(z.string(), z.unknown()),
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    animated: z.boolean(),
  })),
  executionOrder: z.array(z.string()),
}) satisfies z.ZodType<WorkflowDefinition>;

// ─── Workflow Execution State Schema ─────────────────────

export const workflowExecutionStateSchema = z.object({
  workflowRunId: z.string(),
  workflowId: z.string(),
  nodeStates: z.record(z.string(), workflowNodeStateSchema),
  currentNodeId: z.string(),
  executionOrder: z.array(z.string()),
  metadata: z.object({
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    initiatedBy: z.string(),
  }),
}) satisfies z.ZodType<WorkflowExecutionState>;

// ─── Validation Functions ────────────────────────────────

export function validateNodeData(
  nodeType: string,
  data: unknown
) {
  switch (nodeType) {
    case 'document-ingest':
      return documentIngestNodeDataSchema.parse(data);
    case 'ctx-configuration':
      return ctxConfigurationNodeDataSchema.parse(data);
    case 'control-extraction':
      return controlExtractionNodeDataSchema.parse(data);
    case 'workbook-export':
      return workbookExportNodeDataSchema.parse(data);
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

export function validateWorkflowDefinition(data: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(data);
}

export function validateExecutionState(data: unknown): WorkflowExecutionState {
  return workflowExecutionStateSchema.parse(data);
}
