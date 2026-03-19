"use client";

import { useState, useCallback } from "react";
import { FileDropZone, formatSize } from "../../interactions/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Download, FileText, Loader2 } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import {
  STARTER_CTX_FILENAME,
  STARTER_CTX_CONTENT,
} from "@/lib/contract/starter-ctx";
// Supabase browser client — imported lazily inside handleRun to avoid SSR issues
// (createBrowserClient accesses document.cookie which doesn't exist server-side)
let _supabaseClient: ReturnType<typeof import("@/lib/supabase/client").createClient> | null = null;
async function getSupabaseClient() {
  if (!_supabaseClient) {
    const { createClient } = await import("@/lib/supabase/client");
    _supabaseClient = createClient();
  }
  return _supabaseClient;
}

interface FileItem {
  file: File;
  name: string;
  size: string;
}

export default function ContractConfigStep({
  stepState,
  onUpdateData,
  onComplete,
}: StepBodyProps) {
  const [contractFiles, setContractFiles] = useState<FileItem[]>(
    (stepState.data.contractFiles as FileItem[] | undefined) ?? []
  );
  const [ctxFiles, setCtxFiles] = useState<FileItem[]>(
    (stepState.data.ctxFiles as FileItem[] | undefined) ?? []
  );
  const [engagementRef, setEngagementRef] = useState<string>(
    (stepState.data.engagementRef as string | undefined) ?? ""
  );
  const [clientName, setClientName] = useState<string>(
    (stepState.data.clientName as string | undefined) ?? ""
  );

  const handleContractSelect = useCallback(
    (files: File[]) => {
      const items = files.map((f) => ({
        file: f,
        name: f.name,
        size: formatSize(f.size),
      }));
      setContractFiles(items);
      onUpdateData({ contractFiles: items });
    },
    [onUpdateData]
  );

  const handleCtxSelect = useCallback(
    (files: File[]) => {
      const items = files.map((f) => ({
        file: f,
        name: f.name,
        size: formatSize(f.size),
      }));
      setCtxFiles(items);
      onUpdateData({ ctxFiles: items });
    },
    [onUpdateData]
  );

  const handleDownloadStarterCtx = () => {
    const blob = new Blob([STARTER_CTX_CONTENT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = STARTER_CTX_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refTrimmed = engagementRef.trim();
  const canRun = contractFiles.length > 0 && refTrimmed.length > 0 && !uploading;

  const handleRun = () => {
    if (!contractFiles[0] || !refTrimmed) return;
    const f = contractFiles[0].file;

    const readCtxFile = (ctxFile: File) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(ctxFile, "utf-8");
      });

    const getMimeType = (file: File): string => {
      if (file.type) return file.type;
      if (file.name.endsWith(".pdf")) return "application/pdf";
      if (file.name.endsWith(".md")) return "text/markdown";
      return "text/plain";
    };

    const run = async () => {
      setUploading(true);
      setUploadError(null);

      try {
        // Upload contract file to Supabase Storage to avoid Vercel's 4.5MB
        // function payload limit. The ingest route will download it server-side.
        const supabase = await getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? "anon";
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${userId}/${Date.now()}-${safeName}`;
        const mimeType = getMimeType(f);

        const { error: uploadError } = await supabase.storage
          .from("contract-uploads")
          .upload(storagePath, f, { contentType: mimeType, upsert: false });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        let ctxContent: string | undefined;
        if (ctxFiles[0]) {
          ctxContent = await readCtxFile(ctxFiles[0].file);
        }

        onComplete({
          contractFiles,
          ctxFiles,
          storagePath,      // storage path — ingest route downloads from here
          fileName: f.name,
          mimeType,
          engagementRef: refTrimmed,
          clientName: clientName.trim(),
          ctxContent,
        });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : String(e));
        setUploading(false);
      }
    };

    run();
  };

  return (
    <div className="space-y-6">
      {/* Contract document upload */}
      <FileDropZone
        id="contract-document"
        label="Contract Document"
        accept=".txt,.md,.pdf"
        required
        files={contractFiles}
        onFilesSelected={handleContractSelect}
        onRemove={() => {
          setContractFiles([]);
          onUpdateData({ contractFiles: [] });
        }}
      />

      {/* CTX file upload — optional */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Extraction Context (CTX) — Optional
          </Label>
          <button
            type="button"
            onClick={handleDownloadStarterCtx}
            className="flex items-center gap-1.5 text-xs text-[var(--pipeline-navy)] hover:underline"
          >
            <Download className="h-3 w-3" />
            Download starter CTX
          </button>
        </div>
        <FileDropZone
          id="ctx-file"
          label="CTX File"
          accept=".ctx,.txt,.md"
          files={ctxFiles}
          onFilesSelected={handleCtxSelect}
          onRemove={() => {
            setCtxFiles([]);
            onUpdateData({ ctxFiles: [] });
          }}
        />
        {ctxFiles.length === 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <FileText className="h-3 w-3 shrink-0" />
            No CTX uploaded — extraction will use built-in standard rules. Download the starter CTX above to customise per client or sector.
          </p>
        )}
      </div>

      {/* Engagement details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="engagement-ref" className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Engagement Reference <span className="text-destructive">*</span>
          </Label>
          <Input
            id="engagement-ref"
            value={engagementRef}
            onChange={(e) => {
              setEngagementRef(e.target.value);
              onUpdateData({ engagementRef: e.target.value });
            }}
            placeholder="e.g. ACME-MSA-2026"
            className="text-sm"
          />
          {engagementRef.trim().length === 0 && (
            <p className="text-xs text-destructive">Required before extraction can run</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-name" className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Client / Matter Name
          </Label>
          <Input
            id="client-name"
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              onUpdateData({ clientName: e.target.value });
            }}
            placeholder="e.g. Acme Corp"
            className="text-sm"
          />
        </div>
      </div>

      {uploadError && (
        <p className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded px-3 py-2">
          {uploadError}
        </p>
      )}

      <Button
        onClick={handleRun}
        disabled={!canRun}
        className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            {!contractFiles.length
              ? "Upload a contract to continue"
              : !refTrimmed
              ? "Enter an engagement reference to continue"
              : "Start Extraction"}
          </>
        )}
      </Button>
    </div>
  );
}
