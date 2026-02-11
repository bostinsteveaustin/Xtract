// Per-section extraction prompts for Mode 1
// Each section has a tailored extraction prompt based on CTX Spec v0.3

import { XTRACT_SYSTEM_PROMPT } from "./system";
import type { SectionKey } from "@/lib/ctx/schema";
import type { SectionMeta } from "@/lib/ctx/sections";

export function buildSystemPrompt(): string {
  return XTRACT_SYSTEM_PROMPT;
}

export function buildSectionExtractionPrompt(
  sectionKey: SectionKey,
  sourceText: string,
  sectionMeta: SectionMeta
): string {
  const sectionInstructions = SECTION_EXTRACTION_INSTRUCTIONS[sectionKey];

  return `## Source Material

${sourceText}

## Extraction Task

Extract all content relevant to "${sectionMeta.title}" (Section ${sectionMeta.number}: ${sectionMeta.markdownHeader}) from the source material above.

## Key Question
${sectionMeta.extractionQuestion}

## Section-Specific Instructions
${sectionInstructions}

## Quality Requirements
- Completeness: Capture ALL relevant information from the source material
- Accuracy: Do NOT fabricate or hallucinate content not present in sources
- Structure: Follow the exact schema provided
- Specificity: Content must be domain-specific, not generic
- Attribution: Note which source document(s) each item comes from where possible

Output valid JSON conforming to the schema.`;
}

const SECTION_EXTRACTION_INSTRUCTIONS: Record<SectionKey, string> = {
  definitions: `Extract terms used with domain-specific meaning. For each term:
- "inThisContext": What this term means in THIS specific domain/context (not a dictionary definition)
- "includes": What falls within the scope of this term
- "excludes": What falls outside the scope
- "test": A concrete question an expert would ask to verify correct usage
- "commonMisuse": How people commonly misunderstand or misuse this term
- "examples": Correct and incorrect usage examples if available
- "aiGuidance": Specific instructions for an AI encountering this term

Do NOT extract terms where the dictionary definition is sufficient. Only extract terms where the domain-specific meaning differs from or adds to the common understanding.`,

  methodology: `Extract structured processes, workflows, or approaches. For each phase:
- "purpose": WHY this phase exists (not just what it does)
- "activities": Specific, concrete activities (not generic steps)
- "outputs": Concrete deliverables with format and audience
- "realityCheck": What ACTUALLY happens vs. what's planned — time overruns, common blockers, political obstacles
- "dependencies": What must be true before this phase can begin
- "aiGuidance": What to watch for, questions to ask before starting, when to recommend pausing

Focus on capturing the gap between the ideal process and reality.`,

  assessment_criteria: `Extract scoring rubrics, rating scales, and evaluation criteria. For each rubric:
- "name": A clear name for what is being assessed
- "appliesTo": What specific thing is being evaluated
- "scale": The scale being used (e.g., "1-5")
- "minimumThreshold": The minimum acceptable score
- "levels": Each level must be clearly distinguishable from adjacent levels. Include specific evidence that would be observed at each level.
- "aiGuidance": How to apply the rubric, common scoring mistakes, what to do with the score

Levels must be distinguishable — an assessor must be able to tell the difference between adjacent scores based on the criteria alone.`,

  reference_data: `Extract factual data, benchmarks, thresholds, and reference values. For each dataset:
- "source": Where this data comes from (be specific: publication, date, standard number)
- "currency": When this data was last valid / update frequency
- "applicability": When and where to use this data
- "limitations": Known gaps, biases, or caveats
- "dataPoints": The actual data in structured form
- "aiGuidance": Staleness warnings, how to present to stakeholders

Always state source and currency. Flag if data may be out of date.`,

  decision_logic: `Extract if-then reasoning, decision trees, and escalation paths. For each decision:
- "trigger": When this decision point arises
- "frequency": How often practitioners face this decision
- "inputsRequired": What information must be gathered before deciding (with sources)
- "logic": IF-THEN rules, including edge cases and DEFAULT fallback
- "escalation": When to escalate rather than decide autonomously
- "aiGuidance": When to verify inputs, flag ambiguity, recommend escalation

Capture the decisions practitioners make instinctively. The escalation path (knowing when NOT to decide) is expert knowledge.`,

  examples: `Extract case studies, worked examples, and precedents. For each example:
- "relevance": Why this case matters for this context
- "situation": Brief scenario description
- "whatWasDone": Actions taken
- "outcome": What happened — including what didn't work
- "keyLearning": The transferable insight
- "caution": What doesn't transfer or requires adaptation
- "aiGuidance": How to surface parallels, note differences, flag the caution

Include both successes and failures when available. The transferable learning must be explicit.`,

  pitfalls: `Extract failure modes, anti-patterns, and common mistakes. For each pitfall:
- "whatHappens": Description of the failure mode
- "frequency": How common (rare / occasional / frequent)
- "earlyWarningSigns": Observable signals that this problem is developing (must be observable NOW, not retrospective)
- "rootCause": WHY this happens (not just what happens)
- "prevention": How to avoid it
- "recovery": What to do if you're already in this situation
- "aiGuidance": Warning signs to watch for, when to flag, specific corrective actions

Early warning signs must be things you can observe BEFORE the failure occurs.`,

  stakeholders: `Extract stakeholder profiles and communication guidance. For each stakeholder:
- "roleOrGroup": Who they are
- "whatTheyCareAbout": Their actual priorities (not what they say they care about)
- "whatTheySee": Their perception of the situation
- "whatTheyDontSee": Blind spots or missing context
- "howToCommunicate": Concrete framing, language, detail level
- "resistanceTriggers": What creates pushback
- "trustBuilders": What increases their confidence
- "aiGuidance": How to frame outputs, what to lead with, what to avoid

Communication framing must be concrete: "Lead with ROI for the CFO" not "Tailor to audience".`,

  output_standards: `Extract deliverable specifications and quality standards. For each output:
- "purpose": What this deliverable achieves
- "audience": Who reads/uses it
- "format": Specific structure, length, style requirements
- "tone": Professional register, formality level
- "mustInclude": Non-negotiable elements
- "mustAvoid": Common mistakes specific to this deliverable
- "qualityThreshold": What "good enough" looks like vs. "excellent"
- "aiGuidance": Structure to follow, required elements, quality criteria

Format and quality thresholds must be concrete (page count, section structure), not vague.`,

  tacit: `Extract institutional wisdom — the knowledge that experienced practitioners have but rarely write down. This is typically the highest-value content.
- "realisticExpectations": Table of "What's Stated" vs "What Actually Happens" vs "Why" — at least 3 entries
- "practitionerQuestions": Diagnostic questions that separate expert from novice — at least 3
- "politicalDynamics": Who wants what, why conflicts arise, how to navigate
- "validationTechniques": How experienced practitioners verify their work is correct
- "aiGuidance": When to surface practitioner questions, flag gaps, apply validation

The tacit section should capture what seniors know that juniors don't. If it's thin, the CTX is incomplete.`,

  objects: `Extract specifications for structured domain objects that could be pulled from documents. For each object type:
- "typeName": Clear name for the object type
- "description": What this object represents in the domain
- "iCMLPrimaryMapping": Which iCML primitive (Entity, Obligation, Event, Transaction, Artefact)
- "sourceDocumentTypes": What kinds of documents contain these objects
- "attributes": Table of attributes with name, type, required/optional, description
- "scoring": Which assessment rubric applies and minimum threshold
- "extractionGuidance": Where to look in source documents, confidence signals, edge cases
- "provenanceRequirements": What provenance metadata is required per extracted object
- "workedExamples": At least one fully populated example with all attributes, confidence levels, and source references

Only include this section if the domain has structured things that could be extracted from documents (controls, contract terms, risk items, obligations, etc.).`,
};
