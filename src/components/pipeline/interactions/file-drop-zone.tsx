"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileItem {
  file: File;
  name: string;
  size: string;
}

interface FileDropZoneProps {
  id: string;
  label: string;
  accept?: string;
  required?: boolean;
  files: FileItem[];
  onFilesSelected: (files: File[]) => void;
  onRemove?: (index: number) => void;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropZone({
  id,
  label,
  accept,
  required,
  files,
  onFilesSelected,
  onRemove,
  error,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onFilesSelected(dropped);
    },
    [onFilesSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) onFilesSelected(selected);
      e.target.value = "";
    },
    [onFilesSelected]
  );

  const hasFiles = files.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      {!hasFiles ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed px-4 py-8 cursor-pointer transition-colors",
            isDragOver
              ? "border-[var(--pipeline-pink)] bg-[var(--pipeline-pink)]/5"
              : "border-muted-foreground/30 hover:border-muted-foreground/50"
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop or click to upload
          </p>
          {accept && (
            <p className="text-xs text-muted-foreground/60">
              Accepts: {accept}
            </p>
          )}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="rounded-lg border-[1.5px] border-solid border-emerald-500 bg-emerald-50 px-4 py-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <File className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium flex-1 truncate">
                {f.name}
              </span>
              <span className="text-xs text-muted-foreground">{f.size}</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export { formatSize };
