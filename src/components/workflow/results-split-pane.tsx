"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { ResultsTable } from "./results-table";
import { PreviewTabs } from "./preview-tabs";
import { GripVertical } from "lucide-react";

interface ObjectAttribute {
  name: string;
  type: string;
}

interface ExtractedObject {
  id: string;
  object_icml_id?: string | null;
  object_type: string;
  attributes: Record<string, unknown>;
  confidence?: number | null;
  rubric_score?: number | null;
  rubric_level?: string | null;
  scoring_rationale?: string | null;
  source_clause_text?: string | null;
}

interface Relationship {
  id: string;
  from_object_icml_id: string;
  to_object_icml_id: string;
  relationship_type: string;
  direction: string;
  confidence: number;
  source: string;
  description?: string | null;
}

interface ResultsSplitPaneProps {
  objects: ExtractedObject[];
  relationships: Relationship[];
  summary: {
    totalObjects: number;
    totalRelationships: number;
    averageRubricScore: number;
    averageConfidence: number;
    scoreDistribution: Record<number, number>;
    scoredCount: number;
  };
  attributeSpec: ObjectAttribute[];
  metadata?: {
    extractionId?: string;
    startedAt?: string;
  };
}

export function ResultsSplitPane({
  objects,
  relationships,
  summary,
  attributeSpec,
  metadata,
}: ResultsSplitPaneProps) {
  return (
    <Group orientation="horizontal" className="h-[calc(100vh-12rem)]">
      {/* Left panel: Results table */}
      <Panel defaultSize={50} minSize={30}>
        <div className="h-full overflow-auto pr-2">
          <ResultsTable
            objects={objects}
            relationships={relationships}
            summary={summary}
          />
        </div>
      </Panel>

      {/* Resize handle */}
      <Separator className="w-2 flex items-center justify-center hover:bg-muted/50 transition-colors group">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </Separator>

      {/* Right panel: XLSX preview */}
      <Panel defaultSize={50} minSize={25}>
        <div className="h-full border rounded-md overflow-hidden">
          <PreviewTabs
            objects={objects}
            relationships={relationships}
            attributeSpec={attributeSpec}
            summary={summary}
            metadata={metadata}
          />
        </div>
      </Panel>
    </Group>
  );
}
