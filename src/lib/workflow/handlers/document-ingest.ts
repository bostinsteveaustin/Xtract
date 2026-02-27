// Document ingest handler - file upload and document set creation
// STUB: Minimal implementation to allow build to proceed
// TODO: Wire to actual Supabase operations in WP4

import type { DocumentIngestResult } from '@/types/workflow';

export async function handleDocumentIngest(
  files: File[],
  workspaceId: string
): Promise<DocumentIngestResult> {
  // Validate files
  if (files.length === 0) {
    throw new Error('No files selected');
  }

  if (files.some(f => !isSupportedFileType(f))) {
    throw new Error('One or more files have unsupported format (PDF, DOCX, TXT only)');
  }

  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSize = 100 * 1024 * 1024; // 100MB total
  if (totalFileSize > maxSize) {
    throw new Error('Total file size exceeds 100MB limit');
  }

  // STUB: Return mock result
  return {
    documentSetId: `docset_${Math.random().toString(36).slice(2)}`,
    uploadedFileCount: files.length,
    totalFileSize,
  };
}

function isSupportedFileType(file: File): boolean {
  const supportedExtensions = ['.pdf', '.docx', '.txt'];
  return supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}
