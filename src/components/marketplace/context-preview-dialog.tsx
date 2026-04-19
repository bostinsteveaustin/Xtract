"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, Check } from "lucide-react";

interface Section {
  type: string;
  title: string;
  content: string;
}

interface ContextDetail {
  id: string;
  title: string;
  description: string;
  contextType: string;
  sections: Section[];
}

interface ContextPreviewDialogProps {
  contextId: string | null;
  onClose: () => void;
}

export function ContextPreviewDialog({
  contextId,
  onClose,
}: ContextPreviewDialogProps) {
  const [context, setContext] = useState<ContextDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!contextId) {
      setContext(null);
      setImported(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/cortx/${contextId}`);
        if (res.ok) {
          const data = await res.json();
          setContext(data.context);
        }
      } catch {
        toast.error("Failed to load context");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contextId]);

  async function handleImport() {
    if (!contextId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/cortx/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cortxContextId: contextId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }

      setImported(true);
      toast.success(`Imported "${data.name}" to your workspace`);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={!!contextId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              context?.title ?? "Context Preview"
            )}
          </DialogTitle>
          <DialogDescription>
            {loading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              context?.description
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : context?.sections ? (
            <div className="space-y-4 py-4">
              {context.sections.map((section, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {section.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-hidden relative">
                    {section.content.slice(0, 500)}
                    {section.content.length > 500 && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
                    )}
                  </div>
                  {i < context.sections.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No sections available
            </p>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || imported || !context}
          >
            {imported ? (
              <>
                <Check className="h-4 w-4 mr-2" /> Imported
              </>
            ) : importing ? (
              "Importing..."
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Import to Workspace
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
