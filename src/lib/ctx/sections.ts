// CTX Section metadata — maps section keys to numbers, titles, and requirements
// Based on CTX Specification v0.3

import type { StandardSectionKey } from "@/types/ctx";

export interface SectionMeta {
  key: StandardSectionKey;
  number: number;
  title: string;
  markdownHeader: string; // e.g. "@definitions"
  /** Whether this section is recommended for all CTX files */
  recommended: boolean;
  /** Whether this section is required for Mode 2 extraction */
  requiredForMode2: boolean;
  /** Brief description of what this section contains */
  description: string;
  /** Key extraction question from CTX spec Section 3.1.2 */
  extractionQuestion: string;
}

export const CTX_SECTIONS: readonly SectionMeta[] = [
  {
    key: "definitions",
    number: 1,
    title: "Definitions & Terminology",
    markdownHeader: "@definitions",
    recommended: true,
    requiredForMode2: true,
    description:
      "Shared language — what terms mean in this specific domain context. Not dictionary definitions.",
    extractionQuestion:
      "How is this term used differently here than its common meaning?",
  },
  {
    key: "methodology",
    number: 2,
    title: "Methodology",
    markdownHeader: "@methodology",
    recommended: false,
    requiredForMode2: false,
    description:
      "How to approach problems — phased processes, workflows, step-by-step approaches.",
    extractionQuestion: "What actually happens vs. what's planned?",
  },
  {
    key: "assessment_criteria",
    number: 3,
    title: "Assessment Criteria",
    markdownHeader: "@assessment_criteria",
    recommended: false,
    requiredForMode2: true,
    description:
      "How to evaluate and score — rating scales, thresholds, quality benchmarks.",
    extractionQuestion:
      "How do practitioners distinguish good from bad?",
  },
  {
    key: "reference_data",
    number: 4,
    title: "Reference Data",
    markdownHeader: "@reference_data",
    recommended: false,
    requiredForMode2: false,
    description:
      "Facts, figures, standards, indicators — the data that informs decisions.",
    extractionQuestion:
      "What data does this domain rely on, and how current is it?",
  },
  {
    key: "decision_logic",
    number: 5,
    title: "Decision Logic",
    markdownHeader: "@decision_logic",
    recommended: false,
    requiredForMode2: false,
    description:
      "If-then reasoning — decision trees, escalation paths, conditional workflows.",
    extractionQuestion:
      "What decisions do practitioners make instinctively?",
  },
  {
    key: "examples",
    number: 6,
    title: "Examples & Precedents",
    markdownHeader: "@examples",
    recommended: false,
    requiredForMode2: false,
    description:
      "Case studies, worked examples, before/after comparisons.",
    extractionQuestion:
      "What happened, what was learned, what doesn't transfer?",
  },
  {
    key: "pitfalls",
    number: 7,
    title: "Common Pitfalls",
    markdownHeader: "@pitfalls",
    recommended: true,
    requiredForMode2: true,
    description:
      "What goes wrong and how to avoid it — anti-patterns and failure modes.",
    extractionQuestion:
      "What goes wrong and how would you spot it early?",
  },
  {
    key: "stakeholders",
    number: 8,
    title: "Stakeholder Context",
    markdownHeader: "@stakeholders",
    recommended: false,
    requiredForMode2: false,
    description:
      "Who the audience is, what they care about, communication calibration.",
    extractionQuestion:
      "Who cares about what, and how do you communicate with them?",
  },
  {
    key: "output_standards",
    number: 9,
    title: "Output Standards",
    markdownHeader: "@output_standards",
    recommended: false,
    requiredForMode2: false,
    description:
      "What deliverables should look like — format, tone, structure, quality thresholds.",
    extractionQuestion:
      "What does a good one look like vs. a bad one?",
  },
  {
    key: "tacit",
    number: 10,
    title: "Tacit Knowledge",
    markdownHeader: "@tacit",
    recommended: true,
    requiredForMode2: true,
    description:
      "Institutional wisdom not written down elsewhere — instincts, rules of thumb, pattern recognition.",
    extractionQuestion:
      "What do seniors know that juniors don't?",
  },
  {
    key: "objects",
    number: 11,
    title: "Object Specification",
    markdownHeader: "@objects",
    recommended: false,
    requiredForMode2: true,
    description:
      "Defines structured domain objects that can be extracted from source documents using Mode 2.",
    extractionQuestion:
      "What structured things exist in this domain that we'd want to pull from documents?",
  },
] as const;

/** Get section metadata by key */
export function getSectionByKey(key: string): SectionMeta | undefined {
  return CTX_SECTIONS.find((s) => s.key === key);
}

/** Get section metadata by number */
export function getSectionByNumber(num: number): SectionMeta | undefined {
  return CTX_SECTIONS.find((s) => s.number === num);
}

/** Get all sections required for Mode 2 extraction */
export function getMode2RequiredSections(): SectionMeta[] {
  return CTX_SECTIONS.filter((s) => s.requiredForMode2);
}

/** Section dependency matrix from CTX Spec Appendix A */
export const SECTION_DEPENDENCIES: Record<
  StandardSectionKey,
  StandardSectionKey[]
> = {
  definitions: [],
  methodology: ["definitions"],
  assessment_criteria: ["definitions"],
  reference_data: ["definitions"],
  decision_logic: ["definitions", "reference_data"],
  examples: ["methodology"],
  pitfalls: ["examples", "tacit"],
  stakeholders: [],
  output_standards: ["stakeholders"],
  tacit: ["examples", "pitfalls"],
  objects: [
    "definitions",
    "assessment_criteria",
    "pitfalls",
    "tacit",
  ],
};

/** Source type to section mapping from CTX Spec Section 3.1.1 */
export const SOURCE_TYPE_SECTION_MAP: Record<string, StandardSectionKey[]> = {
  "expert-interview": [
    "definitions",
    "pitfalls",
    "stakeholders",
    "tacit",
  ],
  "meeting-transcript": [
    "decision_logic",
    "pitfalls",
    "stakeholders",
    "tacit",
  ],
  "methodology-document": [
    "methodology",
    "assessment_criteria",
    "output_standards",
  ],
  "proposal-document": [
    "methodology",
    "reference_data",
    "stakeholders",
    "output_standards",
  ],
  "regulatory-document": [
    "definitions",
    "reference_data",
    "decision_logic",
  ],
  "contract-or-standard": [
    "definitions",
    "reference_data",
    "objects",
  ],
  "training-material": [
    "definitions",
    "methodology",
    "examples",
    "pitfalls",
  ],
  retrospective: ["examples", "pitfalls", "tacit"],
};
