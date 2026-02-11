// CTX file types — mirrors the CTX Specification v0.3

// ─── Front Matter (Layer 1: System-Managed) ─────────────────────────

export type ContextType = "methodology" | "reference" | "playbook" | "framework";
export type CTXStatus = "draft" | "active" | "deprecated";

export interface CTXFrontMatter {
  cortx_version: "0.3";
  context_type: ContextType;
  context_id: string;
  version: string; // semver
  status: CTXStatus;
  title: string;
  description: string;
  deployment: {
    target_platforms: string[];
  };
  checksum?: string; // SHA-256, system-computed
}

// ─── Organisational Metadata (Layer 2: User-Managed) ────────────────

export type Classification = "public" | "internal" | "restricted";
export type SectionVisibility = "public" | "internal" | "restricted";
export type SectionCompleteness = "complete" | "partial" | "none";
export type DataSensitivity = "none" | "pii" | "commercial" | "regulated";

export interface CTXOrganisationalMetadata {
  domain: string;
  industry?: string[];
  author: string;
  team?: string;
  classification: Classification;
  visibility: Record<string, SectionVisibility>;
  content_sections: Record<string, SectionCompleteness>;
  data_sensitivity: DataSensitivity;
}

// ─── Section Keys ───────────────────────────────────────────────────

export type StandardSectionKey =
  | "definitions"
  | "methodology"
  | "assessment_criteria"
  | "reference_data"
  | "decision_logic"
  | "examples"
  | "pitfalls"
  | "stakeholders"
  | "output_standards"
  | "tacit"
  | "objects";

// ─── Section 1: Definitions ─────────────────────────────────────────

export interface CTXDefinition {
  term: string;
  inThisContext: string;
  includes?: string;
  excludes?: string;
  test: string;
  commonMisuse: string;
  examples?: {
    correct: string[];
    incorrect: string[];
  };
  aiGuidance?: string;
}

export interface DefinitionsSection {
  definitions: CTXDefinition[];
}

// ─── Section 2: Methodology ─────────────────────────────────────────

export interface MethodologyPhase {
  phaseNumber: number;
  name: string;
  purpose: string;
  activities: string[];
  outputs: string[];
  realityCheck: string;
  dependencies?: string;
  aiGuidance?: string;
}

export interface MethodologySection {
  phases: MethodologyPhase[];
}

// ─── Section 3: Assessment Criteria ─────────────────────────────────

export interface RubricLevel {
  score: number;
  level: string;
  criteria: string;
  evidenceRequired: string;
}

export interface AssessmentRubric {
  name: string;
  appliesTo: string;
  scale: string;
  minimumThreshold: number;
  levels: RubricLevel[];
  aiGuidance?: string;
}

export interface AssessmentCriteriaSection {
  rubrics: AssessmentRubric[];
}

// ─── Section 4: Reference Data ──────────────────────────────────────

export interface ReferenceDataSet {
  name: string;
  source: string;
  currency: string;
  applicability: string;
  limitations: string;
  dataPoints: Record<string, unknown>[];
  aiGuidance?: string;
}

export interface ReferenceDataSection {
  datasets: ReferenceDataSet[];
}

// ─── Section 5: Decision Logic ──────────────────────────────────────

export interface DecisionRule {
  name: string;
  trigger: string;
  frequency: string;
  inputsRequired: string[];
  logic: string[];
  escalation: string;
  aiGuidance?: string;
}

export interface DecisionLogicSection {
  decisions: DecisionRule[];
}

// ─── Section 6: Examples ────────────────────────────────────────────

export interface CTXExample {
  name: string;
  relevance: string;
  situation: string;
  whatWasDone: string;
  outcome: string;
  keyLearning: string;
  caution: string;
  aiGuidance?: string;
}

export interface ExamplesSection {
  examples: CTXExample[];
}

// ─── Section 7: Pitfalls ────────────────────────────────────────────

export interface CTXPitfall {
  name: string;
  whatHappens: string;
  frequency: "rare" | "occasional" | "frequent";
  earlyWarningSigns: string[];
  rootCause: string;
  prevention: string;
  recovery: string;
  aiGuidance?: string;
}

export interface PitfallsSection {
  pitfalls: CTXPitfall[];
}

// ─── Section 8: Stakeholders ────────────────────────────────────────

export interface CTXStakeholder {
  roleOrGroup: string;
  whatTheyCareAbout: string;
  whatTheySee: string;
  whatTheyDontSee: string;
  howToCommunicate: string;
  resistanceTriggers: string;
  trustBuilders: string;
  aiGuidance?: string;
}

export interface StakeholdersSection {
  stakeholders: CTXStakeholder[];
}

// ─── Section 9: Output Standards ────────────────────────────────────

export interface CTXOutputStandard {
  name: string;
  purpose: string;
  audience: string;
  format: string;
  tone: string;
  mustInclude: string[];
  mustAvoid: string[];
  qualityThreshold: string;
  aiGuidance?: string;
}

export interface OutputStandardsSection {
  standards: CTXOutputStandard[];
}

// ─── Section 10: Tacit Knowledge ────────────────────────────────────

export interface TacitGap {
  whatIsStated: string;
  whatActuallyHappens: string;
  why: string;
}

export interface TacitSection {
  whyThingsWorkThisWay?: string;
  realisticExpectations: TacitGap[];
  practitionerQuestions: string[];
  politicalDynamics?: string;
  validationTechniques?: string;
  aiGuidance?: string;
}

// ─── Section 11: Object Specification (@objects) ────────────────────

/** Attribute types as defined in CTX spec */
export type ObjectAttributeType =
  | "text"
  | "entity"
  | "date"
  | "enum"
  | "numeric"
  | "boolean"
  | "reference"
  | "list";

export interface ObjectAttribute {
  name: string;
  type: ObjectAttributeType;
  required: boolean;
  definitionReference?: string; // e.g. "@definitions.territory"
  description: string;
  enumValues?: string[];
}

export type ICMLPrimitive =
  | "Entity"
  | "Artefact"
  | "Obligation"
  | "Event"
  | "BridgeObject"
  | "Transaction";

export type ObjectRelationshipType =
  | "depends_on"
  | "conflicts_with"
  | "references"
  | "one-to-one"
  | "one-to-many"
  | "many-to-many";

export interface ObjectRelationship {
  fromObject: string;
  relationship: ObjectRelationshipType;
  toObject: string;
  description: string;
}

export interface WorkedExampleAttribute {
  attribute: string;
  extractedValue: string;
  confidence: "high" | "medium" | "low";
  sourceReference: string;
}

export interface WorkedExample {
  name: string;
  source: string;
  attributes: WorkedExampleAttribute[];
  rubricScore: number;
  rubricMax: number;
  rubricLevel: string;
  scoringRationale: string;
  extractionNotes?: string;
}

export interface ObjectTypeSpec {
  typeName: string;
  description: string;
  iCMLPrimaryMapping: ICMLPrimitive;
  iCMLRelatedMappings?: ICMLPrimitive[];
  sourceDocumentTypes: string[];
  attributes: ObjectAttribute[];
  scoring: {
    rubricReference: string; // e.g. "@assessment_criteria.vendor_risk"
    scoringAttributes: string;
    minimumThreshold: number;
  };
  relationships?: ObjectRelationship[];
  extractionGuidance: string; // @ai-guidance content
  provenanceRequirements: {
    sourceClause: "required" | "optional";
    confidenceLevel: "required" | "optional";
    extractionNotes: "required" | "optional";
  };
  workedExamples: WorkedExample[];
}

export interface ObjectsSection {
  objectTypes: ObjectTypeSpec[];
}

// ─── Version History ────────────────────────────────────────────────

export interface VersionHistoryEntry {
  version: string;
  date: string;
  changes: string;
}

// ─── Full CTX File (Combined) ───────────────────────────────────────

export interface CTXFile {
  frontMatter: CTXFrontMatter;
  organisationalMetadata: CTXOrganisationalMetadata;
  sections: {
    definitions?: DefinitionsSection;
    methodology?: MethodologySection;
    assessment_criteria?: AssessmentCriteriaSection;
    reference_data?: ReferenceDataSection;
    decision_logic?: DecisionLogicSection;
    examples?: ExamplesSection;
    pitfalls?: PitfallsSection;
    stakeholders?: StakeholdersSection;
    output_standards?: OutputStandardsSection;
    tacit?: TacitSection;
    objects?: ObjectsSection;
  };
  versionHistory: VersionHistoryEntry[];
}

/** Union type for any section content */
export type SectionContent =
  | DefinitionsSection
  | MethodologySection
  | AssessmentCriteriaSection
  | ReferenceDataSection
  | DecisionLogicSection
  | ExamplesSection
  | PitfallsSection
  | StakeholdersSection
  | OutputStandardsSection
  | TacitSection
  | ObjectsSection;
