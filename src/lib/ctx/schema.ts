// CTX Zod schemas — built from CTX Specification v0.3
// These validate the structured content of each of the 11 sections

import { z } from "zod";

// ─── Section 1: @definitions ────────────────────────────────────────

export const definitionSchema = z.object({
  term: z.string().min(1),
  inThisContext: z
    .string()
    .min(1)
    .describe("What this term means in THIS domain (not dictionary)"),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  test: z
    .string()
    .min(1)
    .describe("How to verify correct usage — the question an expert would ask"),
  commonMisuse: z.string().min(1).describe("How people get this wrong"),
  examples: z
    .object({
      correct: z.array(z.string()),
      incorrect: z.array(z.string()),
    })
    .optional(),
  aiGuidance: z.string().optional(),
});

export const definitionsSectionSchema = z.object({
  definitions: z.array(definitionSchema).min(1),
});

// ─── Section 2: @methodology ────────────────────────────────────────

export const methodologyPhaseSchema = z.object({
  phaseNumber: z.number().int().positive(),
  name: z.string().min(1),
  purpose: z.string().min(1).describe("Why this phase exists, not just what it does"),
  activities: z.array(z.string().min(1)).min(1),
  outputs: z.array(z.string().min(1)).min(1),
  realityCheck: z
    .string()
    .min(1)
    .describe("What actually happens vs. what's planned"),
  dependencies: z.string().optional(),
  aiGuidance: z.string().optional(),
});

export const methodologySectionSchema = z.object({
  phases: z.array(methodologyPhaseSchema).min(1),
});

// ─── Section 3: @assessment_criteria ────────────────────────────────

export const rubricLevelSchema = z.object({
  score: z.number().int(),
  level: z.string().min(1),
  criteria: z.string().min(1).describe("What this level looks like"),
  evidenceRequired: z.string().min(1).describe("What you'd see as evidence"),
});

export const assessmentRubricSchema = z.object({
  name: z.string().min(1),
  appliesTo: z.string().min(1).describe("What is being assessed"),
  scale: z.string().min(1).describe("Scale description, e.g. '1-5'"),
  minimumThreshold: z
    .number()
    .int()
    .describe("Score below which action is required"),
  levels: z
    .array(rubricLevelSchema)
    .min(2)
    .describe("At least 2 distinguishable levels"),
  aiGuidance: z.string().optional(),
});

export const assessmentCriteriaSectionSchema = z.object({
  rubrics: z.array(assessmentRubricSchema).min(1),
});

// ─── Section 4: @reference_data ─────────────────────────────────────

export const referenceDataSetSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1).describe("Where this data comes from"),
  currency: z.string().min(1).describe("Date of last update / update frequency"),
  applicability: z.string().min(1).describe("When and where this data is relevant"),
  limitations: z.string().min(1).describe("Known gaps, biases, or caveats"),
  dataPoints: z.array(z.record(z.string(), z.unknown())),
  aiGuidance: z.string().optional(),
});

export const referenceDataSectionSchema = z.object({
  datasets: z.array(referenceDataSetSchema).min(1),
});

// ─── Section 5: @decision_logic ─────────────────────────────────────

export const decisionRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.string().min(1).describe("When this decision is needed"),
  frequency: z.string().min(1).describe("How often this decision arises"),
  inputsRequired: z.array(z.string().min(1)).min(1),
  logic: z
    .array(z.string().min(1))
    .min(1)
    .describe("IF-THEN rules including DEFAULT"),
  escalation: z.string().min(1).describe("When to escalate rather than decide"),
  aiGuidance: z.string().optional(),
});

export const decisionLogicSectionSchema = z.object({
  decisions: z.array(decisionRuleSchema).min(1),
});

// ─── Section 6: @examples ───────────────────────────────────────────

export const exampleSchema = z.object({
  name: z.string().min(1),
  relevance: z.string().min(1).describe("Why this case matters"),
  situation: z.string().min(1),
  whatWasDone: z.string().min(1),
  outcome: z.string().min(1).describe("Including what didn't work"),
  keyLearning: z.string().min(1).describe("The transferable insight"),
  caution: z
    .string()
    .min(1)
    .describe("What doesn't transfer or requires adaptation"),
  aiGuidance: z.string().optional(),
});

export const examplesSectionSchema = z.object({
  examples: z
    .array(exampleSchema)
    .min(1)
    .describe("At least 2 recommended (success and failure)"),
});

// ─── Section 7: @pitfalls ───────────────────────────────────────────

export const pitfallSchema = z.object({
  name: z.string().min(1),
  whatHappens: z.string().min(1).describe("Description of the failure mode"),
  frequency: z.enum(["rare", "occasional", "frequent"]),
  earlyWarningSigns: z
    .array(z.string().min(1))
    .min(1)
    .describe("Observable signals that this is developing"),
  rootCause: z.string().min(1).describe("Why this happens (not just what)"),
  prevention: z.string().min(1),
  recovery: z.string().min(1).describe("What to do if already in this situation"),
  aiGuidance: z.string().optional(),
});

export const pitfallsSectionSchema = z.object({
  pitfalls: z.array(pitfallSchema).min(1),
});

// ─── Section 8: @stakeholders ───────────────────────────────────────

export const stakeholderSchema = z.object({
  roleOrGroup: z.string().min(1),
  whatTheyCareAbout: z.string().min(1).describe("Primary concerns and priorities"),
  whatTheySee: z.string().min(1).describe("Their perception"),
  whatTheyDontSee: z.string().min(1).describe("Blind spots or missing context"),
  howToCommunicate: z
    .string()
    .min(1)
    .describe("Framing, language, level of detail"),
  resistanceTriggers: z
    .string()
    .min(1)
    .describe("Topics or approaches that create pushback"),
  trustBuilders: z
    .string()
    .min(1)
    .describe("Approaches that increase confidence"),
  aiGuidance: z.string().optional(),
});

export const stakeholdersSectionSchema = z.object({
  stakeholders: z.array(stakeholderSchema).min(1),
});

// ─── Section 9: @output_standards ───────────────────────────────────

export const outputStandardSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  audience: z.string().min(1),
  format: z.string().min(1).describe("Structure, length, style requirements"),
  tone: z.string().min(1).describe("Professional register, level of formality"),
  mustInclude: z.array(z.string().min(1)).min(1),
  mustAvoid: z.array(z.string().min(1)).min(1),
  qualityThreshold: z
    .string()
    .min(1)
    .describe("What 'good enough' looks like vs. 'excellent'"),
  aiGuidance: z.string().optional(),
});

export const outputStandardsSectionSchema = z.object({
  standards: z.array(outputStandardSchema).min(1),
});

// ─── Section 10: @tacit ─────────────────────────────────────────────

export const tacitGapSchema = z.object({
  whatIsStated: z.string().min(1),
  whatActuallyHappens: z.string().min(1),
  why: z.string().min(1),
});

export const tacitSectionSchema = z.object({
  whyThingsWorkThisWay: z.string().optional(),
  realisticExpectations: z
    .array(tacitGapSchema)
    .min(1)
    .describe("Stated vs. actual expectations"),
  practitionerQuestions: z
    .array(z.string().min(1))
    .min(3)
    .describe("At least 3 diagnostic questions experienced practitioners ask"),
  politicalDynamics: z.string().optional(),
  validationTechniques: z.string().optional(),
  aiGuidance: z.string().optional(),
});

// ─── Section 11: @objects ───────────────────────────────────────────

/** Attribute types from CTX Spec Section 11 */
export const objectAttributeTypeEnum = z.enum([
  "text",
  "entity",
  "date",
  "enum",
  "numeric",
  "boolean",
  "reference",
  "list",
]);

export const objectAttributeSchema = z.object({
  name: z.string().min(1),
  type: objectAttributeTypeEnum,
  required: z.boolean(),
  definitionReference: z
    .string()
    .optional()
    .describe("e.g. '@definitions.territory'"),
  description: z.string().min(1).describe("What this attribute captures"),
  enumValues: z
    .array(z.string())
    .optional()
    .describe("Allowed values when type is 'enum'"),
});

export const iCMLPrimitiveEnum = z.enum([
  "Entity",
  "Artefact",
  "Obligation",
  "Event",
  "BridgeObject",
  "Transaction",
]);

export const objectRelationshipSchema = z.object({
  fromObject: z.string().min(1),
  relationship: z.enum([
    "depends_on",
    "conflicts_with",
    "references",
    "one-to-one",
    "one-to-many",
    "many-to-many",
  ]),
  toObject: z.string().min(1),
  description: z.string().min(1),
});

export const workedExampleAttributeSchema = z.object({
  attribute: z.string().min(1),
  extractedValue: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  sourceReference: z.string().min(1),
});

export const workedExampleSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1).describe("Document name, clause/section reference"),
  attributes: z.array(workedExampleAttributeSchema).min(1),
  rubricScore: z.number().int(),
  rubricMax: z.number().int(),
  rubricLevel: z.string().min(1),
  scoringRationale: z.string().min(1),
  extractionNotes: z.string().optional(),
});

export const objectTypeSpecSchema = z.object({
  typeName: z.string().min(1),
  description: z
    .string()
    .min(1)
    .describe("What this object represents in the domain"),
  iCMLPrimaryMapping: iCMLPrimitiveEnum,
  iCMLRelatedMappings: z.array(iCMLPrimitiveEnum).optional(),
  sourceDocumentTypes: z
    .array(z.string().min(1))
    .min(1)
    .describe("What kinds of documents contain these objects"),
  attributes: z
    .array(objectAttributeSchema)
    .min(1)
    .refine(
      (attrs) => attrs.some((a) => a.required),
      "At least one attribute must be required"
    ),
  scoring: z.object({
    rubricReference: z
      .string()
      .min(1)
      .describe("e.g. '@assessment_criteria.vendor_risk'"),
    scoringAttributes: z.string().min(1),
    minimumThreshold: z.number().int(),
  }),
  relationships: z.array(objectRelationshipSchema).optional(),
  extractionGuidance: z
    .string()
    .min(1)
    .describe("@ai-guidance content for extraction"),
  provenanceRequirements: z.object({
    sourceClause: z.enum(["required", "optional"]),
    confidenceLevel: z.enum(["required", "optional"]),
    extractionNotes: z.enum(["required", "optional"]),
  }),
  workedExamples: z
    .array(workedExampleSchema)
    .min(1)
    .describe("At least one fully populated example"),
});

export const objectsSectionSchema = z.object({
  objectTypes: z
    .array(objectTypeSpecSchema)
    .min(1)
    .describe("At least one object type defined"),
});

// ─── Front Matter Schema ────────────────────────────────────────────

export const frontMatterSchema = z.object({
  cortx_version: z.literal("0.3"),
  context_type: z.enum(["methodology", "reference", "playbook", "framework"]),
  context_id: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9-]+$/,
      "Must be lowercase alphanumeric with hyphens"
    ),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Must be valid semver (e.g. 1.0.0)"),
  status: z.enum(["draft", "active", "deprecated"]),
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  deployment: z.object({
    target_platforms: z.array(z.string().min(1)).min(1),
  }),
  checksum: z.string().optional(),
});

// ─── Organisational Metadata Schema ─────────────────────────────────

export const organisationalMetadataSchema = z.object({
  domain: z.string().min(1),
  industry: z.array(z.string()).optional(),
  author: z.string().min(1),
  team: z.string().optional(),
  classification: z.enum(["public", "internal", "restricted"]),
  visibility: z.record(
    z.string(),
    z.enum(["public", "internal", "restricted"])
  ),
  content_sections: z.record(
    z.string(),
    z.enum(["complete", "partial", "none"])
  ),
  data_sensitivity: z.enum(["none", "pii", "commercial", "regulated"]),
});

// ─── Full CTX File Schema ───────────────────────────────────────────

export const ctxFileSchema = z.object({
  frontMatter: frontMatterSchema,
  organisationalMetadata: organisationalMetadataSchema,
  sections: z.object({
    definitions: definitionsSectionSchema.optional(),
    methodology: methodologySectionSchema.optional(),
    assessment_criteria: assessmentCriteriaSectionSchema.optional(),
    reference_data: referenceDataSectionSchema.optional(),
    decision_logic: decisionLogicSectionSchema.optional(),
    examples: examplesSectionSchema.optional(),
    pitfalls: pitfallsSectionSchema.optional(),
    stakeholders: stakeholdersSectionSchema.optional(),
    output_standards: outputStandardsSectionSchema.optional(),
    tacit: tacitSectionSchema.optional(),
    objects: objectsSectionSchema.optional(),
  }),
  versionHistory: z.array(
    z.object({
      version: z.string(),
      date: z.string(),
      changes: z.string(),
    })
  ),
});

// ─── Section Schema Map ─────────────────────────────────────────────

/** Map from section key to its Zod schema — used by pipeline for validation */
export const SECTION_SCHEMAS = {
  definitions: definitionsSectionSchema,
  methodology: methodologySectionSchema,
  assessment_criteria: assessmentCriteriaSectionSchema,
  reference_data: referenceDataSectionSchema,
  decision_logic: decisionLogicSectionSchema,
  examples: examplesSectionSchema,
  pitfalls: pitfallsSectionSchema,
  stakeholders: stakeholdersSectionSchema,
  output_standards: outputStandardsSectionSchema,
  tacit: tacitSectionSchema,
  objects: objectsSectionSchema,
} as const;

export type SectionSchemaMap = typeof SECTION_SCHEMAS;
export type SectionKey = keyof SectionSchemaMap;
