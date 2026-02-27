// Workflow utility functions

import type { WorkflowNode, WorkflowDefinition, WorkflowNodeState } from '@/types/workflow';
import { nanoid } from 'nanoid';

/**
 * Generate a unique workflow run ID
 */
export function generateWorkflowRunId(): string {
  return `run_${nanoid(12)}`;
}

/**
 * Generate a unique workflow ID
 */
export function generateWorkflowId(): string {
  return `workflow_${nanoid(12)}`;
}

/**
 * Convert WorkflowDefinition to React Flow nodes
 */
export function definitionToFlowNodes(
  definition: WorkflowDefinition,
  executionState?: Record<string, WorkflowNodeState>
): WorkflowNode[] {
  return definition.nodes.map((node) => {
    const nodeState = executionState?.[node.id];

    return {
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        nodeType: node.type,
        label: (node.data as any)?.label || node.type,
        status: (nodeState?.status === 'completed' || nodeState?.status === 'failed' || nodeState?.status === 'running')
          ? nodeState.status === 'failed'
            ? 'error'
            : nodeState.status === 'completed'
              ? 'completed'
              : 'running'
          : 'idle',
        error: nodeState?.error?.message,
        progress: (node.data as any)?.progress || 0,
        configData: nodeState?.data || node.data,
      },
    };
  });
}

/**
 * Initialize empty node states for a workflow
 */
export function initializeNodeStates(definition: WorkflowDefinition): Record<string, WorkflowNodeState> {
  const states: Record<string, WorkflowNodeState> = {};

  for (const node of definition.nodes) {
    states[node.id] = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'pending',
      data: node.data,
      outputIds: {},
    };
  }

  return states;
}

/**
 * Get next node in execution order
 */
export function getNextNode(
  executionOrder: string[],
  currentNodeId: string
): string | null {
  const currentIndex = executionOrder.indexOf(currentNodeId);
  if (currentIndex === -1 || currentIndex === executionOrder.length - 1) {
    return null;
  }
  return executionOrder[currentIndex + 1];
}

/**
 * Get previous node in execution order
 */
export function getPreviousNode(
  executionOrder: string[],
  currentNodeId: string
): string | null {
  const currentIndex = executionOrder.indexOf(currentNodeId);
  if (currentIndex <= 0) {
    return null;
  }
  return executionOrder[currentIndex - 1];
}

/**
 * Check if a node can transition to a new status
 */
export function canTransitionNode(
  nodeId: string,
  toStatus: 'running' | 'completed' | 'failed' | 'skipped',
  nodeStates: Record<string, WorkflowNodeState>,
  executionOrder: string[]
): boolean {
  const nodeState = nodeStates[nodeId];

  if (!nodeState) {
    return false;
  }

  // Can only start running if all predecessors completed
  if (toStatus === 'running') {
    const nodeIndex = executionOrder.indexOf(nodeId);
    const allPredecessorsCompleted = executionOrder
      .slice(0, nodeIndex)
      .every(id => nodeStates[id]?.status === 'completed');
    return (nodeState.status === 'pending') && allPredecessorsCompleted;
  }

  // Can complete if currently running
  if (toStatus === 'completed') {
    return nodeState.status === 'running';
  }

  // Can fail if running or pending
  if (toStatus === 'failed') {
    return ['pending', 'running'].includes(nodeState.status);
  }

  // Can skip if pending
  if (toStatus === 'skipped') {
    return nodeState.status === 'pending';
  }

  return false;
}

/**
 * Get execution statistics
 */
export function getExecutionStats(nodeStates: Record<string, WorkflowNodeState>) {
  const states = Object.values(nodeStates);
  const totalNodes = states.length;
  const completedNodes = states.filter(s => s.status === 'completed').length;
  const failedNodes = states.filter(s => s.status === 'failed').length;
  const runningNodes = states.filter(s => s.status === 'running').length;
  const pendingNodes = states.filter(s => s.status === 'pending').length;

  return {
    total: totalNodes,
    completed: completedNodes,
    failed: failedNodes,
    running: runningNodes,
    pending: pendingNodes,
    progress: totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0,
    isComplete: completedNodes === totalNodes && failedNodes === 0,
    hasFailed: failedNodes > 0,
  };
}

/**
 * Serialize node states to JSON (for DB storage)
 */
export function serializeNodeStates(nodeStates: Record<string, WorkflowNodeState>): string {
  return JSON.stringify(nodeStates);
}

/**
 * Deserialize node states from JSON (from DB)
 */
export function deserializeNodeStates(json: string): Record<string, WorkflowNodeState> {
  try {
    return JSON.parse(json) as Record<string, WorkflowNodeState>;
  } catch {
    return {};
  }
}

/**
 * Format node ID for display
 */
export function formatNodeId(nodeId: string): string {
  return nodeId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Categorize error for user display
 */
export function categorizeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (error.message.includes('storage') || error.message.includes('upload')) {
      return 'STORAGE_ERROR';
    }
    if (error.message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    if (error.message.includes('api')) {
      return 'API_ERROR';
    }
  }
  return 'UNKNOWN';
}

/**
 * Check if an error is recoverable (can user retry?)
 */
export function isErrorRecoverable(error: unknown): boolean {
  const category = categorizeError(error);
  return ['NETWORK_ERROR', 'STORAGE_ERROR', 'API_ERROR'].includes(category);
}
