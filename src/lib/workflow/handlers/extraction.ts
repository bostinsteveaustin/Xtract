// Control extraction handler - trigger Mode 2 pipeline
// STUB: Minimal implementation to allow build to proceed
// TODO: Wire to actual extraction API in WP5

import type { ExtractionResult } from '@/types/workflow';

export async function handleControlExtraction(
  documentSetId: string,
  ctxConfigurationId: string,
  workflowId: string,
  userId: string
): Promise<ExtractionResult> {
  if (!documentSetId || !ctxConfigurationId) {
    throw new Error('documentSetId and ctxConfigurationId required');
  }

  // STUB: Return mock result
  return {
    extractionRunId: `run_${Math.random().toString(36).slice(2)}`,
    documentSetId,
    ctxConfigurationId,
  };
}

export async function getExtractionStatus(extractionRunId: string) {
  return {
    extractionRunId,
    status: 'pending',
    nodeStates: {},
    errorMessage: null,
    startedAt: null,
    completedAt: null,
  };
}

export async function cancelExtraction(extractionRunId: string) {
  // STUB: Do nothing for now
}
