"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Settings, Loader2 } from "lucide-react";

interface CTXConfig {
  id: string;
  name: string;
  version: string;
  status: string;
  description?: string;
  content?: {
    sections?: {
      objects?: {
        objectTypes?: Array<{
          typeName: string;
          attributes: Array<{ name: string }>;
        }>;
      };
    };
  };
}

interface CTXPanelProps {
  onComplete: (ctxConfigurationId: string) => void;
  isCompleted: boolean;
}

export function CTXPanel({ onComplete, isCompleted }: CTXPanelProps) {
  const [configs, setConfigs] = useState<CTXConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/ctx");
      if (!res.ok) throw new Error("Failed to load CTX configurations");
      const data = await res.json();
      const list = data.configs ?? [];
      setConfigs(list);
      // Auto-select first
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configs");
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = configs.find((c) => c.id === selectedId);
  const objectSpec = selectedConfig?.content?.sections?.objects?.objectTypes?.[0];

  const handleConfirm = () => {
    if (!selectedId) return;
    setConfirmed(true);
    onComplete(selectedId);
  };

  if (isCompleted && confirmed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <Check className="h-5 w-5" />
          <span className="font-medium">CTX configured</span>
        </div>
        {selectedConfig && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{selectedConfig.name}</div>
            <div className="text-xs text-muted-foreground">
              v{selectedConfig.version}
            </div>
            {objectSpec && (
              <div className="text-xs text-muted-foreground">
                Object: {objectSpec.typeName} · {objectSpec.attributes.length} attributes
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select a Context Specification (CTX) file that defines the extraction schema and domain knowledge.
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Context Specification</label>
        <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a CTX file" />
          </SelectTrigger>
          <SelectContent>
            {configs.map((config) => (
              <SelectItem key={config.id} value={config.id}>
                {config.name} (v{config.version})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CTX summary */}
      {selectedConfig && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{selectedConfig.name}</span>
            <Badge variant="outline" className="text-[10px]">
              v{selectedConfig.version}
            </Badge>
          </div>

          {selectedConfig.description && (
            <p className="text-xs text-muted-foreground">
              {selectedConfig.description}
            </p>
          )}

          {objectSpec && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Object Type: {objectSpec.typeName}
              </div>
              <div className="text-xs text-muted-foreground">
                {objectSpec.attributes.length} attributes defined
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {objectSpec.attributes.slice(0, 6).map((attr) => (
                  <Badge
                    key={attr.name}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {attr.name}
                  </Badge>
                ))}
                {objectSpec.attributes.length > 6 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{objectSpec.attributes.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={!selectedId}
        className="w-full"
      >
        Confirm CTX Configuration
      </Button>
    </div>
  );
}
