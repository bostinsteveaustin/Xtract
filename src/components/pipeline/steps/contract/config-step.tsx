"use client";

import { useState, useCallback } from "react";
import { FileDropZone, formatSize } from "../../interactions/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";

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
  const [engagementRef, setEngagementRef] = useState<string>(
    (stepState.data.engagementRef as string | undefined) ?? ""
  );
  const [clientName, setClientName] = useState<string>(
    (stepState.data.clientName as string | undefined) ?? ""
  );

  const handleFileSelect = useCallback(
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

  const canRun = contractFiles.length > 0;

  const handleRun = () => {
    if (!contractFiles[0]) return;
    const f = contractFiles[0].file;

    const reader = new FileReader();
    reader.onload = () => {
      // Send as base64 regardless of type — server handles parsing
      const raw = reader.result;
      let base64Content: string;
      let mimeType: string;

      if (typeof raw === "string" && raw.startsWith("data:")) {
        // readAsDataURL result
        const commaIdx = raw.indexOf(",");
        base64Content = raw.slice(commaIdx + 1);
        mimeType = raw.slice(5, raw.indexOf(";"));
      } else {
        // Fallback — shouldn't happen
        base64Content = btoa(raw as string);
        mimeType = "text/plain";
      }

      onComplete({
        contractFiles,
        fileContent: base64Content,
        fileName: f.name,
        mimeType,
        engagementRef: engagementRef.trim() || "ENG",
        clientName: clientName.trim(),
      });
    };

    // Always read as DataURL so we get base64 for binary files (PDF)
    reader.readAsDataURL(f);
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
        onFilesSelected={handleFileSelect}
        onRemove={() => {
          setContractFiles([]);
          onUpdateData({ contractFiles: [] });
        }}
      />

      {/* Engagement details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="engagement-ref" className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Engagement Reference
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

      <Button
        onClick={handleRun}
        disabled={!canRun}
        className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
      >
        <Play className="h-4 w-4 mr-2" />
        {canRun ? "Start Extraction" : "Upload a contract to continue"}
      </Button>
    </div>
  );
}
