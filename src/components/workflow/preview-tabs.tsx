"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XlsxPreview } from "./xlsx-preview";
import { RelationshipsPreview } from "./relationships-preview";
import { SummaryPreview } from "./summary-preview";

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

interface PreviewTabsProps {
  objects: ExtractedObject[];
  relationships: Relationship[];
  attributeSpec: ObjectAttribute[];
  summary: {
    totalObjects: number;
    totalRelationships: number;
    averageRubricScore: number;
    averageConfidence: number;
    scoreDistribution: Record<number, number>;
    scoredCount: number;
  };
  metadata?: {
    extractionId?: string;
    startedAt?: string;
  };
}

export function PreviewTabs({
  objects,
  relationships,
  attributeSpec,
  summary,
  metadata,
}: PreviewTabsProps) {
  return (
    <Tabs defaultValue="spreadsheet" className="h-full flex flex-col">
      <TabsList className="mx-2 mt-2 flex-shrink-0">
        <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
        <TabsTrigger value="relationships">
          Relationships ({relationships.length})
        </TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
      </TabsList>
      <TabsContent value="spreadsheet" className="flex-1 overflow-hidden mt-0">
        <XlsxPreview objects={objects} attributeSpec={attributeSpec} />
      </TabsContent>
      <TabsContent
        value="relationships"
        className="flex-1 overflow-hidden mt-0"
      >
        <RelationshipsPreview relationships={relationships} />
      </TabsContent>
      <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
        <SummaryPreview summary={summary} metadata={metadata} />
      </TabsContent>
    </Tabs>
  );
}
