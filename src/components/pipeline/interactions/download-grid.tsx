"use client";

import { Download, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DownloadFile } from "@/types/pipeline";

interface DownloadGridProps {
  files: DownloadFile[];
  onDownload: (file: DownloadFile) => void;
}

const formatIcon: Record<string, typeof FileText> = {
  ttl: FileText,
  csv: FileSpreadsheet,
  json: FileJson,
  xlsx: FileSpreadsheet,
};

export function DownloadGrid({ files, onDownload }: DownloadGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {files.map((file) => {
        const Icon = formatIcon[file.format] ?? FileText;
        return (
          <Button
            key={file.name}
            variant="outline"
            className="h-auto flex-col items-start gap-1 p-3 text-left"
            onClick={() => onDownload(file)}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate flex-1">
                {file.name}
              </span>
              <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </div>
            {file.size && (
              <span className="text-[11px] text-muted-foreground pl-6">
                {file.size}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
