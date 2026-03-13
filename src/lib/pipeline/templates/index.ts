import type { PipelineTemplate } from "@/types/pipeline";
import { ONTOLOGY_PIPELINE } from "./ontology-pipeline";

const TEMPLATES: PipelineTemplate[] = [ONTOLOGY_PIPELINE];

export function getTemplate(templateId: string): PipelineTemplate | null {
  return TEMPLATES.find((t) => t.templateId === templateId) ?? null;
}

export function getAllTemplates(): PipelineTemplate[] {
  return TEMPLATES;
}

export function getDefaultTemplate(): PipelineTemplate {
  return ONTOLOGY_PIPELINE;
}
