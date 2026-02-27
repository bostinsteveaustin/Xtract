// CTX configuration handler - select CTX schema
// STUB: Minimal implementation to allow build to proceed
// TODO: Wire to actual Supabase operations in WP4 to WP5

import type { CTXConfigurationResult } from '@/types/workflow';

export async function handleCTXConfiguration(
  ctxConfigurationId: string,
  workspaceId: string
): Promise<CTXConfigurationResult> {
  if (!ctxConfigurationId) {
    throw new Error('CTX configuration ID required');
  }

  // STUB: Return mock result
  return {
    ctxConfigurationId,
    ctxName: 'Pay.UK Vendor Management Contracts',
  };
}

export async function getAvailableCTXConfigs(workspaceId: string) {
  // Phase 1: Return hardcoded config option
  return [
    {
      id: 'pay-uk-vendor-contracts',
      name: 'Pay.UK Vendor Management Contracts',
      version: '0.3.0',
      status: 'active' as const,
    },
  ];
}

export async function createDefaultCTXConfig(workspaceId: string) {
  // STUB: Return hardcoded config ID
  return 'pay-uk-vendor-contracts';
}
