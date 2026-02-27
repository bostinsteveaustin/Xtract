// Hardcoded Pay.UK workflow template
// Phase 1 MVP uses this single template for all users

import type {
  WorkflowDefinition,
  DocumentIngestNodeData,
  CTXConfigurationNodeData,
  ControlExtractionNodeData,
  WorkbookExportNodeData,
} from '@/types/workflow';

export const PAY_UK_TEMPLATE: WorkflowDefinition = {
  templateId: 'pay-uk-v1',
  version: '1.0.0',
  nodes: [
    {
      id: 'node-ingest',
      type: 'document-ingest',
      position: { x: 100, y: 200 },
      data: {
        label: 'Document Ingest',
        supportedTypes: ['pdf', 'docx', 'txt'],
      } satisfies DocumentIngestNodeData,
    },
    {
      id: 'node-ctx',
      type: 'ctx-configuration',
      position: { x: 400, y: 200 },
      data: {
        label: 'CTX Configuration',
        defaultCtxId: 'pay-uk-vendor-contracts',
      } satisfies CTXConfigurationNodeData,
    },
    {
      id: 'node-extract',
      type: 'control-extraction',
      position: { x: 700, y: 200 },
      data: {
        label: 'Control Extraction',
        totalPasses: 5,
      } satisfies ControlExtractionNodeData,
    },
    {
      id: 'node-export',
      type: 'workbook-export',
      position: { x: 1000, y: 200 },
      data: {
        label: 'Workbook Export',
        defaultFormat: 'xlsx',
        formats: ['xlsx', 'icml'],
      } satisfies WorkbookExportNodeData,
    },
  ],
  edges: [
    { id: 'edge-1', source: 'node-ingest', target: 'node-ctx', animated: true },
    { id: 'edge-2', source: 'node-ctx', target: 'node-extract', animated: true },
    { id: 'edge-3', source: 'node-extract', target: 'node-export', animated: true },
  ],
  executionOrder: ['node-ingest', 'node-ctx', 'node-extract', 'node-export'],
};

// Export as the default/only template for Phase 1
export const AVAILABLE_TEMPLATES = [PAY_UK_TEMPLATE];

export function getTemplateById(templateId: string): WorkflowDefinition | null {
  return AVAILABLE_TEMPLATES.find(t => t.templateId === templateId) ?? null;
}

export function getDefaultTemplate(): WorkflowDefinition {
  return PAY_UK_TEMPLATE;
}
