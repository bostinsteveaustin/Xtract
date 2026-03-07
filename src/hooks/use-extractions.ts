"use client";

import { useState, useEffect, useCallback } from "react";

interface ExtractionListItem {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  status: string;
  ctxFileId: string | null;
  xqsScore: number | null;
  createdAt: string;
  updatedAt: string;
  sourceCount: number;
}

interface ExtractionDetail {
  extraction: ExtractionListItem & { errorMessage: string | null };
  sources: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    blobUrl: string;
  }>;
  pipelineRuns: Array<{
    id: string;
    stage: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    tokensUsed: number | null;
    errorMessage: string | null;
  }>;
  domainObjects: Array<{
    id: string;
    objectIcmlId: string | null;
    objectType: string;
    objectData: Record<string, unknown>;
    confidence: number | null;
    rubricScore: number | null;
    rubricLevel: string | null;
    scoringRationale: string | null;
    sourceRef: string | null;
    provenance: Record<string, unknown> | null;
    validationStatus: string;
  }>;
  entities: {
    documentTitle?: string;
    documentDate?: string;
    governingLaw?: string;
    entities?: Array<{
      name: string;
      definedTerm?: string;
      entityType: string;
      roles: string[];
    }>;
  } | null;
  relationships: Array<{
    id: string;
    extractionId: string;
    fromObjectIcmlId: string;
    toObjectIcmlId: string;
    relationshipType: string;
    direction: string;
    confidence: number;
    source: string;
    description: string | null;
    createdAt: string;
  }>;
  summary: {
    totalObjects: number;
    averageScore: number;
    averageConfidence: number;
    entitiesFound: number;
  };
}

export function useExtractions() {
  const [extractions, setExtractions] = useState<ExtractionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extractions");
      if (!res.ok) throw new Error("Failed to fetch extractions");
      const data = await res.json();
      setExtractions(data.extractions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { extractions, loading, error, refresh };
}

export function useExtraction(id: string | null) {
  const [data, setData] = useState<ExtractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/extractions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch extraction");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useCreateExtraction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: {
      name: string;
      mode?: string;
      ctxFileId: string;
      files: Array<{
        fileName: string;
        fileType: string;
        fileSize: number;
        blobUrl: string;
      }>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/extractions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to create extraction");
        }
        const data = await res.json();
        return data.extraction;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { create, loading, error };
}
