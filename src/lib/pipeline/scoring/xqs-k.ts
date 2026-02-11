// XQS-K: Knowledge Quality Score calculator
// Based on CTX Specification v0.3 Section 3.1.2 Step 8
//
// Dimensions:
//   Completeness (25%) — Relevant sections present, required fields populated
//   Specificity (25%)  — Content is domain-specific, definitions have tests
//   Actionability (20%) — AI guidance has specific triggers and actions
//   Provenance (15%)   — Elements traced to source material
//   Depth (15%)        — Tacit richness: pitfalls, questions, expectations

import { XQS_K_WEIGHTS } from "@/lib/utils/constants";
import { CTX_SECTIONS } from "@/lib/ctx/sections";
import type { CTXSectionRecord } from "@/lib/db/schema";

/** Compute XQS-K score from extracted sections */
export function computeXQSK(sections: CTXSectionRecord[]): number {
  const completeness = computeCompleteness(sections);
  const specificity = computeSpecificity(sections);
  const actionability = computeActionability(sections);
  const provenance = computeProvenance(sections);
  const depth = computeDepth(sections);

  const score = Math.round(
    completeness * XQS_K_WEIGHTS.completeness +
    specificity * XQS_K_WEIGHTS.specificity +
    actionability * XQS_K_WEIGHTS.actionability +
    provenance * XQS_K_WEIGHTS.provenance +
    depth * XQS_K_WEIGHTS.depth
  );

  return Math.min(100, Math.max(0, score));
}

/** Completeness: Relevant sections present with content */
function computeCompleteness(sections: CTXSectionRecord[]): number {
  const recommendedSections = CTX_SECTIONS.filter((s) => s.recommended);
  const presentAndPopulated = sections.filter(
    (s) => s.content !== null && s.status !== "pending"
  );

  // Score based on recommended sections present
  const recommendedPresent = recommendedSections.filter((rs) =>
    presentAndPopulated.some((ps) => ps.sectionKey === rs.key)
  );

  const baseScore = (recommendedPresent.length / recommendedSections.length) * 70;

  // Bonus for additional sections
  const bonusSections = presentAndPopulated.filter(
    (ps) => !recommendedSections.some((rs) => rs.key === ps.sectionKey)
  );
  const bonus = Math.min(30, bonusSections.length * 10);

  return Math.min(100, baseScore + bonus);
}

/** Specificity: Content is domain-specific, not generic */
function computeSpecificity(sections: CTXSectionRecord[]): number {
  let score = 0;
  let checks = 0;

  // Check definitions have tests and common misuse
  const defSection = sections.find((s) => s.sectionKey === "definitions");
  if (defSection?.content) {
    checks++;
    const defs = (defSection.content as { definitions?: Array<{ test?: string; commonMisuse?: string }> }).definitions;
    if (defs) {
      const withTests = defs.filter((d) => d.test && d.test.length > 10);
      const withMisuse = defs.filter(
        (d) => d.commonMisuse && d.commonMisuse.length > 10
      );
      score +=
        ((withTests.length + withMisuse.length) / (defs.length * 2)) * 100;
    }
  }

  // Check methodology has reality checks
  const methSection = sections.find((s) => s.sectionKey === "methodology");
  if (methSection?.content) {
    checks++;
    const phases = (methSection.content as { phases?: Array<{ realityCheck?: string }> }).phases;
    if (phases) {
      const withReality = phases.filter(
        (p) => p.realityCheck && p.realityCheck.length > 10
      );
      score += (withReality.length / phases.length) * 100;
    }
  }

  // Check pitfalls have early warning signs
  const pitSection = sections.find((s) => s.sectionKey === "pitfalls");
  if (pitSection?.content) {
    checks++;
    const pitfalls = (pitSection.content as { pitfalls?: Array<{ earlyWarningSigns?: string[] }> }).pitfalls;
    if (pitfalls) {
      const withSigns = pitfalls.filter(
        (p) => p.earlyWarningSigns && p.earlyWarningSigns.length > 0
      );
      score += (withSigns.length / pitfalls.length) * 100;
    }
  }

  return checks > 0 ? score / checks : 50;
}

/** Actionability: AI guidance blocks with specific triggers */
function computeActionability(sections: CTXSectionRecord[]): number {
  const sectionsWithContent = sections.filter((s) => s.content !== null);
  if (sectionsWithContent.length === 0) return 0;

  let withGuidance = 0;

  for (const section of sectionsWithContent) {
    const content = JSON.stringify(section.content);
    // Check if AI guidance exists in the content
    if (
      content.includes("aiGuidance") &&
      content.includes("When")
    ) {
      withGuidance++;
    }
  }

  return (withGuidance / sectionsWithContent.length) * 100;
}

/** Provenance: Elements traced to source material */
function computeProvenance(sections: CTXSectionRecord[]): number {
  // For Mode 1, provenance is about traceability to source docs
  // Simplified: check if sections have content that references sources
  const sectionsWithContent = sections.filter((s) => s.content !== null);
  if (sectionsWithContent.length === 0) return 0;

  // Base score: all extracted sections have some content
  return (sectionsWithContent.length / sections.length) * 100;
}

/** Depth: Tacit richness — pitfalls, questions, expectations */
function computeDepth(sections: CTXSectionRecord[]): number {
  let score = 0;
  let maxScore = 0;

  // Tacit section depth
  const tacitSection = sections.find((s) => s.sectionKey === "tacit");
  if (tacitSection?.content) {
    maxScore += 40;
    const tacit = tacitSection.content as {
      practitionerQuestions?: string[];
      realisticExpectations?: unknown[];
    };
    if (tacit.practitionerQuestions && tacit.practitionerQuestions.length >= 3) {
      score += 20;
    } else if (tacit.practitionerQuestions && tacit.practitionerQuestions.length > 0) {
      score += 10;
    }
    if (tacit.realisticExpectations && tacit.realisticExpectations.length >= 3) {
      score += 20;
    } else if (tacit.realisticExpectations && tacit.realisticExpectations.length > 0) {
      score += 10;
    }
  }

  // Pitfalls depth
  const pitfallSection = sections.find((s) => s.sectionKey === "pitfalls");
  if (pitfallSection?.content) {
    maxScore += 30;
    const pitfalls = (pitfallSection.content as { pitfalls?: unknown[] }).pitfalls;
    if (pitfalls && pitfalls.length >= 3) {
      score += 30;
    } else if (pitfalls && pitfalls.length > 0) {
      score += 15;
    }
  }

  // Examples depth
  const examplesSection = sections.find((s) => s.sectionKey === "examples");
  if (examplesSection?.content) {
    maxScore += 30;
    const examples = (examplesSection.content as { examples?: unknown[] }).examples;
    if (examples && examples.length >= 2) {
      score += 30;
    } else if (examples && examples.length > 0) {
      score += 15;
    }
  }

  return maxScore > 0 ? (score / maxScore) * 100 : 50;
}

/** Get a breakdown of XQS-K score components */
export function getXQSKBreakdown(
  sections: CTXSectionRecord[]
): Record<string, number> {
  return {
    completeness: Math.round(computeCompleteness(sections)),
    specificity: Math.round(computeSpecificity(sections)),
    actionability: Math.round(computeActionability(sections)),
    provenance: Math.round(computeProvenance(sections)),
    depth: Math.round(computeDepth(sections)),
  };
}
