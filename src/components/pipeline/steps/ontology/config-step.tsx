"use client";

import { useState, useCallback } from "react";
import { FileDropZone, formatSize } from "../../interactions/file-drop-zone";
import { PipelineConfig } from "../../interactions/pipeline-config";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { ConfigField } from "@/types/pipeline";

interface FileItem {
  file: File;
  name: string;
  size: string;
}

const CONFIG_FIELDS: ConfigField[] = [
  {
    key: "upperOntology",
    label: "Upper Ontology",
    type: "select",
    options: [
      { value: "gist-core", label: "GIST Core (default)" },
      { value: "bfo", label: "BFO" },
      { value: "dolce", label: "DOLCE" },
    ],
    defaultValue: "gist-core",
  },
  {
    key: "namespace",
    label: "Namespace IRI",
    type: "text",
    placeholder: "https://ontology.nationalhighways.co.uk/ctrack#",
  },
  {
    key: "ontologyTitle",
    label: "Ontology Title",
    type: "text",
    placeholder: "C-Track Fleet Management Ontology",
  },
];

export default function ConfigStep({
  stepState,
  onUpdateData,
  onComplete,
}: StepBodyProps) {
  const [structuredFiles, setStructuredFiles] = useState<FileItem[]>(
    (stepState.data.structuredFiles as FileItem[] | undefined) ?? []
  );
  const [transcriptFiles, setTranscriptFiles] = useState<FileItem[]>(
    (stepState.data.transcriptFiles as FileItem[] | undefined) ?? []
  );
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    (stepState.data.config as Record<string, string> | undefined) ?? {
      upperOntology: "gist-core",
    }
  );

  const handleStructuredSelect = useCallback(
    (files: File[]) => {
      const items = files.map((f) => ({
        file: f,
        name: f.name,
        size: formatSize(f.size),
      }));
      setStructuredFiles(items);
      onUpdateData({ structuredFiles: items });
    },
    [onUpdateData]
  );

  const handleTranscriptSelect = useCallback(
    (files: File[]) => {
      const items = files.map((f) => ({
        file: f,
        name: f.name,
        size: formatSize(f.size),
      }));
      setTranscriptFiles(items);
      onUpdateData({ transcriptFiles: items });
    },
    [onUpdateData]
  );

  const handleConfigChange = useCallback(
    (key: string, value: string) => {
      const updated = { ...configValues, [key]: value };
      setConfigValues(updated);
      onUpdateData({ config: updated });
    },
    [configValues, onUpdateData]
  );

  const canRun = structuredFiles.length > 0 && transcriptFiles.length > 0;

  const handleRun = () => {
    // Read file contents and pass to next steps
    const readFile = (f: File): Promise<string> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(f);
      });

    Promise.all([
      readFile(structuredFiles[0].file),
      readFile(transcriptFiles[0].file),
    ]).then(([structuredContent, transcriptContent]) => {
      onComplete({
        structuredFiles,
        transcriptFiles,
        structuredContent,
        transcriptContent,
        config: configValues,
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* File drop zones — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileDropZone
          id="structured-input"
          label="Structured Input (OpenAPI JSON)"
          accept=".json"
          required
          files={structuredFiles}
          onFilesSelected={handleStructuredSelect}
          onRemove={() => setStructuredFiles([])}
        />
        <FileDropZone
          id="sme-transcript"
          label="SME Transcript"
          accept=".txt,.md"
          required
          files={transcriptFiles}
          onFilesSelected={handleTranscriptSelect}
          onRemove={() => setTranscriptFiles([])}
        />
      </div>

      {/* Configuration form */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-3">
          Pipeline Configuration
        </p>
        <PipelineConfig
          fields={CONFIG_FIELDS}
          values={configValues}
          onChange={handleConfigChange}
        />
      </div>

      {/* Run button */}
      <Button
        onClick={handleRun}
        disabled={!canRun}
        className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
      >
        <Play className="h-4 w-4 mr-2" />
        {canRun ? "Run Pipeline" : "Upload both files to continue"}
      </Button>
    </div>
  );
}
