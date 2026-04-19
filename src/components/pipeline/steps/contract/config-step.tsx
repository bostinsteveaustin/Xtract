"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropZone, formatSize } from "../../interactions/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CTXConfig {
  id: string;
  name: string;
  version: string;
  status: string;
  content: unknown;
}

interface CortxContext {
  id: string;
  title: string;
  description: string;
  contextType: string;
}

/** Unified item in the CTX dropdown */
interface CTXOption {
  id: string;       // prefixed: "local:{uuid}" or "cortx:{uuid}"
  label: string;
  source: "local" | "cortx";
  content?: unknown; // pre-loaded for local configs
}

export default function ContractConfigStep({
  stepState,
  onUpdateData,
  onComplete,
}: StepBodyProps) {
  const [contractFiles, setContractFiles] = useState<FileItem[]>(
    (stepState.data.contractFiles as FileItem[] | undefined) ?? []
  );
  // Legacy: keep ctxFiles for backwards compat with manual upload
  const [ctxFiles, setCtxFiles] = useState<FileItem[]>(
    (stepState.data.ctxFiles as FileItem[] | undefined) ?? []
  );
  const [engagementRef, setEngagementRef] = useState<string>(
    (stepState.data.engagementRef as string | undefined) ?? ""
  );
  const [clientName, setClientName] = useState<string>(
    (stepState.data.clientName as string | undefined) ?? ""
  );
  const [outputName, setOutputName] = useState<string>(
    (stepState.data.outputName as string | undefined) ?? ""
  );

  // ─── CTX selector state ─────────────────────────────────────────────
  const [ctxOptions, setCtxOptions] = useState<CTXOption[]>([]);
  const [localConfigs, setLocalConfigs] = useState<CTXConfig[]>([]);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [selectedCtxId, setSelectedCtxId] = useState<string>(
    (stepState.data.selectedCtxId as string | undefined) ?? "__none__"
  );
  const [ctxMode, setCtxMode] = useState<"select" | "upload">(
    (stepState.data.ctxFiles as FileItem[] | undefined)?.length ? "upload" : "select"
  );

  // Load workspace CTX configs + Cortx account contexts on mount
  useEffect(() => {
    async function loadAll() {
      const options: CTXOption[] = [];

      // 1. Local workspace configs
      try {
        const res = await fetch("/api/ctx");
        if (res.ok) {
          const data = await res.json();
          const configs: CTXConfig[] = data.configs ?? [];
          setLocalConfigs(configs);
          for (const cfg of configs) {
            options.push({
              id: `local:${cfg.id}`,
              label: `${cfg.name} (v${cfg.version})`,
              source: "local",
              content: cfg.content,
            });
          }
        }
      } catch {
        // silent
      }

      // 2. Cortx account contexts
      try {
        const res = await fetch("/api/cortx/contexts");
        if (res.ok) {
          const data = await res.json();
          const contexts: CortxContext[] = data.contexts ?? [];
          for (const ctx of contexts) {
            options.push({
              id: `cortx:${ctx.id}`,
              label: ctx.title,
              source: "cortx",
            });
          }
        }
      } catch {
        // silent — Cortx may be unavailable
      }

      setCtxOptions(options);
      setCtxLoading(false);
    }
    loadAll();
  }, []);

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
      setSelectedCtxId("__none__");
      onUpdateData({ ctxFiles: items, selectedCtxId: "__none__" });
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

        // Resolve CTX content from dropdown selection or manual upload
        let ctxContent: string | undefined;
        if (ctxMode === "select" && selectedCtxId && selectedCtxId !== "__none__") {
          if (selectedCtxId.startsWith("local:")) {
            // Local workspace config — content already loaded
            const option = ctxOptions.find((o) => o.id === selectedCtxId);
            if (option?.content) {
              ctxContent = JSON.stringify(option.content);
            }
          } else if (selectedCtxId.startsWith("cortx:")) {
            // Cortx context — fetch full content on the fly
            const cortxId = selectedCtxId.replace("cortx:", "");
            const res = await fetch(`/api/cortx/${cortxId}`);
            if (res.ok) {
              const data = await res.json();
              ctxContent = JSON.stringify(data.context);
            }
          }
        } else if (ctxMode === "upload" && ctxFiles[0]) {
          ctxContent = await readCtxFile(ctxFiles[0].file);
        }

        onComplete({
          contractFiles,
          ctxFiles,
          storagePath,
          fileName: f.name,
          mimeType,
          engagementRef: refTrimmed,
          clientName: clientName.trim(),
          outputName: outputName.trim() || refTrimmed,
          ctxContent,
          selectedCtxId: ctxMode === "select" ? selectedCtxId : undefined,
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

      {/* CTX selection — dropdown from workspace or manual upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Extraction Context (CTX) — Optional
          </Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCtxMode(ctxMode === "select" ? "upload" : "select");
                if (ctxMode === "upload") {
                  setCtxFiles([]);
                  onUpdateData({ ctxFiles: [] });
                }
              }}
              className="text-xs text-[var(--pipeline-navy)] hover:underline"
            >
              {ctxMode === "select" ? "Upload file instead" : "Select from library"}
            </button>
            <button
              type="button"
              onClick={handleDownloadStarterCtx}
              className="flex items-center gap-1.5 text-xs text-[var(--pipeline-navy)] hover:underline"
            >
              <Download className="h-3 w-3" />
              Starter CTX
            </button>
          </div>
        </div>

        {ctxMode === "select" ? (
          <div className="space-y-1.5">
            <Select
              value={selectedCtxId}
              onValueChange={(val) => {
                setSelectedCtxId(val);
                onUpdateData({ selectedCtxId: val });
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={ctxLoading ? "Loading..." : "Select a CTX file"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  No CTX — use built-in standard rules
                </SelectItem>
                {/* Cortx account contexts */}
                {ctxOptions.filter((o) => o.source === "cortx").length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-t mt-1 pt-2">
                      Cortx
                    </div>
                    {ctxOptions
                      .filter((o) => o.source === "cortx")
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                  </>
                )}
                {/* Local workspace configs */}
                {ctxOptions.filter((o) => o.source === "local").length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-t mt-1 pt-2">
                      Workspace Library
                    </div>
                    {ctxOptions
                      .filter((o) => o.source === "local")
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {selectedCtxId === "__none__" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3 shrink-0" />
                No CTX selected — extraction will use built-in standard rules.
              </p>
            )}
          </div>
        ) : (
          <>
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
                No CTX uploaded — extraction will use built-in standard rules.
              </p>
            )}
          </>
        )}
      </div>

      {/* Engagement details + output name */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="output-name" className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Output File Name
          </Label>
          <Input
            id="output-name"
            value={outputName}
            onChange={(e) => {
              setOutputName(e.target.value);
              onUpdateData({ outputName: e.target.value });
            }}
            placeholder={engagementRef.trim() || "e.g. Acme-MSA-Review"}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Used for exported file names. Defaults to engagement reference.
          </p>
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
