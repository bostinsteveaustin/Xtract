"use client";

import { useState, useEffect, useCallback } from "react";

interface CTXFileListItem {
  id: string;
  name: string;
  domain: string | null;
  contextType: string | null;
  contextId: string | null;
  version: number;
  status: string;
  classification: string | null;
  xqsKScore: number | null;
  createdAt: string;
  sectionCount: number;
}

interface CTXSection {
  id: string;
  sectionKey: string;
  sectionNumber: number;
  title: string;
  content: Record<string, unknown> | null;
  status: string;
}

interface CTXFileDetail {
  ctxFile: CTXFileListItem & {
    dataSensitivity: string | null;
    visibility: Record<string, string> | null;
    contentSections: Record<string, string> | null;
  };
  sections: CTXSection[];
}

export function useCtxLibrary() {
  const [ctxFiles, setCtxFiles] = useState<CTXFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ctx");
      if (!res.ok) throw new Error("Failed to fetch CTX files");
      const data = await res.json();
      setCtxFiles(data.ctxFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ctxFiles, loading, error, refresh };
}

export function useCtxFile(id: string | null) {
  const [data, setData] = useState<CTXFileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ctx/${id}`);
      if (!res.ok) throw new Error("Failed to fetch CTX file");
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
