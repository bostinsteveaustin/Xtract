// Workspace type → pipeline registry
// Single source of truth for the "New Run" picker and type descriptions.
// Add new pipelines here without DB migrations.

export type WorkspaceType = "contract" | "regulatory" | "knowhow" | "custom";

export interface PipelineDefinition {
  /** Matches PipelineTemplate.templateId in src/lib/pipeline/templates */
  key: string;
  label: string;
  description: string;
  /** If set, pipeline is hidden until this feature flag is enabled */
  featureFlag?: string;
}

export interface WorkspaceTypeDefinition {
  type: WorkspaceType;
  label: string;
  description: string;
  /** Pipeline keys that appear in the default "New Run" picker for this type */
  defaultPipelines: string[];
  /** Icon name for UI (mapped in components) */
  icon: "file-text" | "shield" | "brain" | "layers";
}

// ─── Pipeline Catalogue ────────────────────────────────────────────────────────
// All pipelines available in the system. UI reads from here — no DB changes
// needed to add/rename pipelines.

export const PIPELINE_REGISTRY: PipelineDefinition[] = [
  {
    key: "ontology-v1",
    label: "Ontology Generation",
    description: "Extract a structured knowledge ontology from source documents",
  },
  {
    key: "contract-extraction-v1",
    label: "Contract Extraction",
    description: "Extract structured intelligence from commercial agreements",
  },
  // Contract Intelligence — feature-flagged until E-02 (iCML edges) lands
  {
    key: "contract-intelligence-v1",
    label: "Contract Intelligence",
    description: "Build relationship graphs and clause maps from agreements",
    featureFlag: "contract_intelligence_pipeline",
  },
];

// ─── Workspace Type Catalogue ─────────────────────────────────────────────────

export const WORKSPACE_TYPE_REGISTRY: WorkspaceTypeDefinition[] = [
  {
    type: "contract",
    label: "Contract",
    description: "Extract structured intelligence from commercial agreements",
    defaultPipelines: ["contract-extraction-v1"],
    icon: "file-text",
  },
  {
    type: "regulatory",
    label: "Regulatory",
    description: "Extract controls and rules from regulatory documents",
    defaultPipelines: ["ontology-v1"],
    icon: "shield",
  },
  {
    type: "knowhow",
    label: "Knowhow",
    description: "Capture tacit knowledge into structured CTX packages",
    defaultPipelines: ["ontology-v1"],
    icon: "brain",
  },
  {
    type: "custom",
    label: "Custom",
    description: "Start blank — pick any available pipeline",
    defaultPipelines: [],
    icon: "layers",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWorkspaceTypeDefinition(
  type: WorkspaceType | string | null | undefined
): WorkspaceTypeDefinition {
  return (
    WORKSPACE_TYPE_REGISTRY.find((t) => t.type === type) ??
    WORKSPACE_TYPE_REGISTRY[3] // fallback: custom
  );
}

/** Feature flags active in this build (toggle here or via env later) */
const ACTIVE_FLAGS = new Set<string>([
  // "contract_intelligence_pipeline",  // off until E-02 lands
  // "workspace_multi_tenancy",         // off until E-06 lands
]);

export function isFlagEnabled(flag: string): boolean {
  return ACTIVE_FLAGS.has(flag);
}

/** Pipelines visible for a workspace type — defaults first, then all others */
export function getPipelinesForType(type: WorkspaceType | string | null): {
  defaults: PipelineDefinition[];
  all: PipelineDefinition[];
} {
  const typeDef = getWorkspaceTypeDefinition(type);
  const visible = PIPELINE_REGISTRY.filter(
    (p) => !p.featureFlag || isFlagEnabled(p.featureFlag)
  );
  const defaults = visible.filter((p) =>
    typeDef.defaultPipelines.includes(p.key)
  );
  return { defaults, all: visible };
}
