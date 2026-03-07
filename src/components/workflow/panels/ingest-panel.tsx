"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";

interface IngestPanelProps {
  workflowId: string;
  onComplete: (documentSetId: string) => void;
  isCompleted: boolean;
}

interface FileEntry {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
}

export function IngestPanel({ workflowId, onComplete, isCompleted }: IngestPanelProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [documentSetId, setDocumentSetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: FileEntry[] = Array.from(selected).map((file) => ({
      file,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();
      for (const entry of files) {
        formData.append("files", entry.file);
      }

      setProgress(30);

      const res = await fetch(`/api/workflows/${workflowId}/upload`, {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setDocumentSetId(data.documentSetId);
      setFiles((prev) => prev.map((f) => ({ ...f, status: "done" as const })));
      setProgress(100);

      onComplete(data.documentSetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })));
    } finally {
      setUploading(false);
    }
  };

  if (isCompleted && documentSetId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="font-medium">Documents uploaded</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""} processed successfully.
        </div>
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{f.file.name}</span>
              <span className="text-muted-foreground">({formatSize(f.file.size)})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Upload contract documents for extraction. Supports PDF, DOCX, and TXT files.
      </div>

      {/* File selector */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Click to select files</p>
        <p className="text-xs text-muted-foreground mt-1">.pdf, .docx, .txt</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Selected files ({files.length})
          </div>
          {files.map((entry, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 text-sm p-2 rounded bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{entry.file.name}</span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {formatSize(entry.file.size)}
                </Badge>
              </div>
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-destructive text-xs flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Processing documents...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full"
      >
        {uploading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
