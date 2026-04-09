"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { ContextCard } from "./context-card";
import { ContextPreviewDialog } from "./context-preview-dialog";

interface ContextSummary {
  id: string;
  title: string;
  description: string;
  contextType: string;
}

export function MarketplaceBrowser() {
  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchContexts = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/cortx/marketplace?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContexts(data.contexts ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContexts();
  }, [fetchContexts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContexts(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchContexts]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search marketplace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      ) : contexts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {search
              ? `No contexts found for "${search}"`
              : "No contexts available in the marketplace"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contexts.map((ctx) => (
            <ContextCard
              key={ctx.id}
              id={ctx.id}
              title={ctx.title}
              description={ctx.description}
              contextType={ctx.contextType}
              onClick={() => setPreviewId(ctx.id)}
            />
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <ContextPreviewDialog
        contextId={previewId}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
}
