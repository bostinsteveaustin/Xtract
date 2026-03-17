"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowsContextValue {
  workflows: WorkflowSummary[];
  isLoading: boolean;
  createWorkflow: (name: string, templateId?: string) => Promise<WorkflowSummary | null>;
  renameWorkflow: (id: string, name: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WorkflowsContext = createContext<WorkflowsContextValue | null>(null);

export function WorkflowsProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      if (!res.ok) return;
      const data = await res.json();
      setWorkflows(data.workflows ?? []);
    } catch {
      // Silently fail — sidebar shows empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createWorkflow = useCallback(
    async (name: string, templateId?: string): Promise<WorkflowSummary | null> => {
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, templateId }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const newWorkflow = data.workflow as WorkflowSummary;
        setWorkflows((prev) => [newWorkflow, ...prev]);
        return newWorkflow;
      } catch {
        return null;
      }
    },
    []
  );

  const renameWorkflow = useCallback(
    async (id: string, name: string) => {
      try {
        const res = await fetch(`/api/workflows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) return;
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? { ...w, name } : w))
        );
      } catch {
        // ignore
      }
    },
    []
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/workflows/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return;
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
      } catch {
        // ignore
      }
    },
    []
  );

  return (
    <WorkflowsContext value={{ workflows, isLoading, createWorkflow, renameWorkflow, deleteWorkflow, refresh }}>
      {children}
    </WorkflowsContext>
  );
}

export function useWorkflows() {
  const ctx = useContext(WorkflowsContext);
  if (!ctx) {
    throw new Error("useWorkflows must be used within a WorkflowsProvider");
  }
  return ctx;
}
