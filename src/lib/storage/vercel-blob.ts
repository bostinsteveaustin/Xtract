// Vercel Blob storage implementation

import { put, del, list } from "@vercel/blob";
import { StorageError } from "@/lib/utils/errors";

export interface UploadResult {
  url: string;
  pathname: string;
  size: number;
}

/** Upload a file buffer to Vercel Blob */
export async function uploadFile(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  try {
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.length,
    };
  } catch (error) {
    throw new StorageError(
      `Failed to upload file "${fileName}": ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/** Delete a file from Vercel Blob */
export async function deleteFile(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    throw new StorageError(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/** List files in Vercel Blob with optional prefix */
export async function listFiles(prefix?: string) {
  try {
    const result = await list({ prefix });
    return result.blobs;
  } catch (error) {
    throw new StorageError(
      `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
