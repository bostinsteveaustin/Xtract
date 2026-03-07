// Mode 2 extraction prompts — schema-driven domain object extraction
// Uses CTX Sections 1, 3, 7, 10, 11 to build context-rich prompts

import type {
  ObjectTypeSpec,
  DefinitionsSection,
  PitfallsSection,
  TacitSection,
  AssessmentRubric,
} from "@/types/ctx";

/**
 * Build the system prompt for Mode 2 extraction.
 * Embeds the full object specification, definitions, pitfalls, and tacit knowledge.
 */
export function buildMode2SystemPrompt(
  objectSpec: ObjectTypeSpec,
  definitions?: DefinitionsSection,
  pitfalls?: PitfallsSection,
  tacit?: TacitSection
): string {
  const parts: string[] = [];

  parts.push(`You are Xtract's Mode 2 extraction engine — a schema-driven domain object extractor.

Your task is to extract structured ${objectSpec.typeName} objects from source documents according to a precise schema specification.

## Object Specification

Type: ${objectSpec.typeName}
Description: ${objectSpec.description}
iCML Primary Mapping: ${objectSpec.iCMLPrimaryMapping}
${objectSpec.iCMLRelatedMappings ? `Related Mappings: ${objectSpec.iCMLRelatedMappings.join(", ")}` : ""}

### Attributes to Extract

${objectSpec.attributes
  .map(
    (attr) =>
      `- **${attr.name}** (${attr.type}${attr.required ? ", REQUIRED" : ", optional"}): ${attr.description}${attr.enumValues ? `\n  Allowed values: ${attr.enumValues.join(", ")}` : ""}`
  )
  .join("\n")}

### Provenance Requirements
- sourceClause: ${objectSpec.provenanceRequirements.sourceClause}
- confidenceLevel: ${objectSpec.provenanceRequirements.confidenceLevel}
- extractionNotes: ${objectSpec.provenanceRequirements.extractionNotes}

### Extraction Guidance
${objectSpec.extractionGuidance}`);

  // Embed definitions from Section 1
  if (definitions && definitions.definitions.length > 0) {
    parts.push(`\n## Domain Definitions (from CTX Section 1)

These definitions specify how terms should be interpreted in this domain:

${definitions.definitions
  .map(
    (d) =>
      `### ${d.term}
**In this context:** ${d.inThisContext}
**Test:** ${d.test}
**Common misuse:** ${d.commonMisuse}${d.aiGuidance ? `\n**AI guidance:** ${d.aiGuidance}` : ""}`
  )
  .join("\n\n")}`);
  }

  // Embed pitfalls from Section 7
  if (pitfalls && pitfalls.pitfalls.length > 0) {
    parts.push(`\n## Extraction Anti-Patterns (from CTX Section 7)

AVOID these common extraction errors:

${pitfalls.pitfalls
  .map(
    (p) =>
      `### ${p.name} (Frequency: ${p.frequency})
${p.whatHappens}
**Prevention:** ${p.prevention}${p.aiGuidance ? `\n**AI guidance:** ${p.aiGuidance}` : ""}`
  )
  .join("\n\n")}`);
  }

  // Embed tacit knowledge from Section 10
  if (tacit) {
    parts.push(`\n## Practitioner Knowledge (from CTX Section 10)

${tacit.whyThingsWorkThisWay || ""}

### Key Questions to Consider
${tacit.practitionerQuestions.map((q) => `- ${q}`).join("\n")}

${tacit.aiGuidance ? `**AI Guidance:** ${tacit.aiGuidance}` : ""}`);
  }

  // Include worked examples as few-shot guidance
  if (objectSpec.workedExamples.length > 0) {
    parts.push(`\n## Worked Examples

${objectSpec.workedExamples
  .map(
    (ex) =>
      `### Example: ${ex.name}
Source: ${ex.source}
Score: ${ex.rubricScore}/${ex.rubricMax} (${ex.rubricLevel})

Extracted attributes:
${ex.attributes
  .map(
    (a) =>
      `- ${a.attribute}: "${a.extractedValue}" [${a.confidence}] (from ${a.sourceReference})`
  )
  .join("\n")}

Scoring rationale: ${ex.scoringRationale}${ex.extractionNotes ? `\nNotes: ${ex.extractionNotes}` : ""}`
  )
  .join("\n\n")}`);
  }

  parts.push(`\n## Output Rules

1. Extract EVERY relevant object from the source text — do not skip any.
2. Populate ALL required attributes. Leave optional attributes as null only if the information genuinely cannot be determined from the source.
3. Use EXACT text from the source document for fullText attributes — do not paraphrase.
4. Assign confidence levels honestly: "high" only when the value is explicitly stated, "medium" when inferred from context, "low" when uncertain.
5. Generate unique objectIDs in the format "icml:OBJ-CT-NNN" where NNN is a sequential 3-digit number.
6. For entity attributes, use the defined terms from the contract (e.g., "the Supplier") rather than actual company names, but note both where possible.`);

  return parts.join("\n");
}

/**
 * Build the prompt for Pass 2: Entity extraction
 */
export function buildEntityExtractionPrompt(sourceText: string): string {
  return `Analyse the following document and extract all parties, entities, and key metadata.

## Instructions

1. Identify ALL parties to the agreement and their defined terms (e.g., "Acme Corp" defined as "the Supplier").
2. Identify any third parties mentioned (guarantors, sub-contractors, affiliates).
3. Extract the document title, execution/effective date, and governing law if stated.
4. For each entity, determine their roles in the agreement.

## Source Document

${sourceText}

Extract all entities and document metadata from this document.`;
}

/**
 * Build the prompt for Pass 3: Object extraction (per chunk)
 */
export function buildObjectExtractionPrompt(
  sourceText: string,
  entities: string,
  chunkIndex: number,
  totalChunks: number
): string {
  return `Extract all contract terms from the following section of the document.

## Context

This is chunk ${chunkIndex + 1} of ${totalChunks} from the source document.

### Identified Parties
${entities}

## Instructions

1. Extract EVERY substantive contract term, clause, or provision from this text section.
2. A single clause may contain multiple terms if it addresses different obligations — extract each separately.
3. Use the party names/defined terms listed above for obligatedParty and counterparty.
4. Generate sequential objectIDs continuing from any previously extracted objects.
5. For each term, capture the EXACT clause text in the fullText attribute.
6. Assess risk from the perspective of the party receiving this analysis (typically the buyer/customer).

## Source Document Section

${sourceText}

Extract all contract terms from this section. Be thorough — do not skip any substantive clauses, including those in schedules, appendices, or general/miscellaneous sections.`;
}

/**
 * Build the prompt for Pass 4: Relationship resolution
 */
export function buildRelationshipPrompt(extractedObjects: string): string {
  return `Analyse the following extracted contract terms and identify relationships between them.

## Instructions

1. Identify dependencies: terms that reference or depend on other terms (e.g., SLA penalty depends on SLA definition).
2. Identify conflicts: terms that may contradict each other (e.g., termination for convenience vs. minimum commitment period).
3. Identify cross-references: terms that reference schedules, appendices, or other clauses by number.
4. Identify supersession: terms that replace or update earlier terms (e.g., an amendment superseding an original clause).
5. Identify implementation: terms that implement a higher-level obligation (e.g., a specific SLA implements a general quality requirement).
6. Identify duplicates: terms that cover essentially the same obligation in different wording.

For each relationship:
- **Type**: Choose from: supersedes, superseded_by, related_to, duplicates, categorised_under, implements, depends_on, conflicts_with, references
- **Direction**: "unidirectional" (A affects B but not vice versa) or "bidirectional" (mutual relationship, e.g., two clauses that conflict with each other)
- **Confidence**: Score 0-100. Use 90-100 for explicit cross-references stated in the text, 60-89 for strongly implied relationships, below 60 for inferred connections.
- **Description**: Brief explanation of how the objects are related.

## Extracted Contract Terms

${extractedObjects}

Identify all relationships and cross-references between these contract terms.`;
}

/**
 * Build the prompt for Pass 5: Rubric scoring
 */
export function buildScoringPrompt(
  extractedObjects: string,
  rubric: AssessmentRubric
): string {
  return `Score each of the following extracted contract terms against the rubric below.

## Scoring Rubric: ${rubric.name}

Applies to: ${rubric.appliesTo}
Scale: ${rubric.scale}
Minimum threshold: ${rubric.minimumThreshold}

### Levels

${rubric.levels
  .map(
    (l) =>
      `**Score ${l.score} — ${l.level}**
Criteria: ${l.criteria}
Evidence required: ${l.evidenceRequired}`
  )
  .join("\n\n")}

${rubric.aiGuidance ? `\n### Scoring Guidance\n${rubric.aiGuidance}` : ""}

## Extracted Contract Terms to Score

${extractedObjects}

Score each object against the rubric. Provide specific rationale referencing the rubric criteria. Be honest — do not inflate scores.`;
}
