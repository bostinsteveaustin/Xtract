/**
 * Maps Cortx API context format → Xtract CTXFile format.
 *
 * Cortx sections use keys like "common_pitfalls" and "tacit_knowledge",
 * while Xtract uses "pitfalls" and "tacit". This mapper normalises them.
 *
 * For v1, imported sections are stored as simplified wrappers with raw
 * markdown content rather than fully-parsed structured JSON (e.g., each
 * definition parsed into CTXDefinition objects). The extraction pipeline
 * can still consume the markdown via its prompt-building functions.
 */

import type { CTXFile, StandardSectionKey } from "@/types/ctx";
import type { CortxContextFull } from "./client";

/** Map Cortx section type keys → Xtract StandardSectionKey */
const SECTION_KEY_MAP: Record<string, StandardSectionKey> = {
  definitions: "definitions",
  methodology: "methodology",
  assessment_criteria: "assessment_criteria",
  reference_data: "reference_data",
  decision_logic: "decision_logic",
  examples: "examples",
  common_pitfalls: "pitfalls",
  pitfalls: "pitfalls",
  stakeholder_context: "stakeholders",
  stakeholders: "stakeholders",
  output_standards: "output_standards",
  tacit_knowledge: "tacit",
  tacit: "tacit",
  objects: "objects",
};

/**
 * Wrap raw markdown content into a lightweight section object.
 * The extraction pipeline prompts read markdown directly, so a simple
 * `{ _raw: markdownString }` wrapper is sufficient for v1.
 *
 * Specific sections that the pipeline parses as structured JSON
 * (e.g., objects) should be imported via a deeper parser in future.
 */
function wrapSection(sectionKey: StandardSectionKey, markdown: string): unknown {
  // For sections the pipeline expects as arrays, wrap in a minimal structure
  switch (sectionKey) {
    case "definitions":
      return { definitions: [], _raw: markdown };
    case "methodology":
      return { phases: [], _raw: markdown };
    case "assessment_criteria":
      return { rubrics: [], _raw: markdown };
    case "reference_data":
      return { datasets: [], _raw: markdown };
    case "decision_logic":
      return { decisions: [], _raw: markdown };
    case "examples":
      return { examples: [], _raw: markdown };
    case "pitfalls":
      return { pitfalls: [], _raw: markdown };
    case "stakeholders":
      return { stakeholders: [], _raw: markdown };
    case "output_standards":
      return { standards: [], _raw: markdown };
    case "tacit":
      return { realisticExpectations: [], practitionerQuestions: [], _raw: markdown };
    case "objects":
      return { objectTypes: [], _raw: markdown };
    default:
      return { _raw: markdown };
  }
}

/**
 * Convert a Cortx context response into Xtract's CTXFile shape.
 */
export function mapCortxToCTX(cortx: CortxContextFull): CTXFile {
  const sections: CTXFile["sections"] = {};

  for (const section of cortx.sections ?? []) {
    const xtractKey = SECTION_KEY_MAP[section.type];
    if (!xtractKey) continue; // skip unknown section types

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sections as any)[xtractKey] = wrapSection(xtractKey, section.content);
  }

  return {
    frontMatter: {
      cortx_version: "0.3",
      context_type: mapContextType(cortx.contextType),
      context_id: cortx.id,
      version: "1.0.0",
      status: "active",
      title: cortx.title,
      description: cortx.description ?? "",
      deployment: { target_platforms: ["xtract"] },
    },
    organisationalMetadata: {
      domain: "",
      author: cortx.author ?? "Cortx Marketplace",
      classification: "internal",
      visibility: {},
      content_sections: {},
      data_sensitivity: "none",
    },
    sections,
    versionHistory: [
      {
        version: "1.0.0",
        date: new Date().toISOString().slice(0, 10),
        changes: `Imported from Cortx marketplace (${cortx.id})`,
      },
    ],
  };
}

function mapContextType(
  cortxType: string
): CTXFile["frontMatter"]["context_type"] {
  const map: Record<string, CTXFile["frontMatter"]["context_type"]> = {
    method: "methodology",
    skill: "methodology",
    policy: "framework",
    reference: "reference",
    package: "playbook",
  };
  return map[cortxType] ?? "methodology";
}
