// CTX structural and content validation
// Based on CTX Specification v0.3 Part 6: Validation Rules

import { SECTION_SCHEMAS, type SectionKey } from "./schema";
import { CTX_SECTIONS, getSectionByKey } from "./sections";
import type { CTXFile, SectionContent, StandardSectionKey } from "@/types/ctx";

export type ValidationSeverity = "error" | "warning";

export interface ValidationResult {
  rule: string;
  severity: ValidationSeverity;
  message: string;
  section?: string;
}

/** Run all validation rules against a CTX file and return results */
export function validateCTX(ctx: CTXFile): ValidationResult[] {
  const results: ValidationResult[] = [];

  // ─── 6.1 Structural Validation ────────────────────────────────────

  // Front matter present and valid
  if (ctx.frontMatter.cortx_version !== "0.3") {
    results.push({
      rule: "frontmatter_version",
      severity: "error",
      message: `cortx_version must be "0.3", got "${ctx.frontMatter.cortx_version}"`,
    });
  }

  // Version is valid semver
  if (!/^\d+\.\d+\.\d+$/.test(ctx.frontMatter.version)) {
    results.push({
      rule: "frontmatter_semver",
      severity: "error",
      message: `version must be valid semver, got "${ctx.frontMatter.version}"`,
    });
  }

  // context_id format
  if (!/^[a-z0-9-]+$/.test(ctx.frontMatter.context_id)) {
    results.push({
      rule: "frontmatter_context_id",
      severity: "error",
      message: "context_id must be lowercase alphanumeric with hyphens",
    });
  }

  // content_sections matches actual sections
  const actualSections = Object.keys(ctx.sections).filter(
    (k) => ctx.sections[k as keyof typeof ctx.sections] !== undefined
  );
  for (const [key, completeness] of Object.entries(
    ctx.organisationalMetadata.content_sections
  )) {
    if (
      (completeness === "complete" || completeness === "partial") &&
      !actualSections.includes(key)
    ) {
      results.push({
        rule: "content_sections_mismatch",
        severity: "warning",
        message: `Section "${key}" listed as "${completeness}" but not present in content`,
        section: key,
      });
    }
  }

  // Visibility covers all present sections
  for (const key of actualSections) {
    if (!ctx.organisationalMetadata.visibility[key]) {
      results.push({
        rule: "visibility_missing",
        severity: "warning",
        message: `Section "${key}" has no visibility setting`,
        section: key,
      });
    }
  }

  // Version history present
  if (!ctx.versionHistory || ctx.versionHistory.length === 0) {
    results.push({
      rule: "version_history_missing",
      severity: "warning",
      message: "Version history section should exist",
    });
  }

  // ─── 6.2 Content Quality Validation ───────────────────────────────

  // Definitions have tests and common misuse
  if (ctx.sections.definitions) {
    for (const def of ctx.sections.definitions.definitions) {
      if (!def.test) {
        results.push({
          rule: "definition_missing_test",
          severity: "warning",
          message: `Definition "${def.term}" should include a test`,
          section: "definitions",
        });
      }
      if (!def.commonMisuse) {
        results.push({
          rule: "definition_missing_misuse",
          severity: "warning",
          message: `Definition "${def.term}" should include common misuse`,
          section: "definitions",
        });
      }
    }
  }

  // Methodology has reality checks
  if (ctx.sections.methodology) {
    for (const phase of ctx.sections.methodology.phases) {
      if (!phase.realityCheck) {
        results.push({
          rule: "methodology_missing_reality_check",
          severity: "warning",
          message: `Phase "${phase.name}" should include a reality check`,
          section: "methodology",
        });
      }
    }
  }

  // Tacit has at least 3 practitioner questions
  if (ctx.sections.tacit) {
    if (ctx.sections.tacit.practitionerQuestions.length < 3) {
      results.push({
        rule: "tacit_insufficient_questions",
        severity: "warning",
        message: `Tacit section should have at least 3 practitioner questions (has ${ctx.sections.tacit.practitionerQuestions.length})`,
        section: "tacit",
      });
    }
  }

  // ─── 6.3 Section 11 Validation ────────────────────────────────────

  if (ctx.sections.objects) {
    for (const objType of ctx.sections.objects.objectTypes) {
      // All attributes have types
      for (const attr of objType.attributes) {
        if (!attr.type) {
          results.push({
            rule: "objects_attr_missing_type",
            severity: "error",
            message: `Attribute "${attr.name}" on "${objType.typeName}" must specify a type`,
            section: "objects",
          });
        }
      }

      // At least one required attribute
      if (!objType.attributes.some((a) => a.required)) {
        results.push({
          rule: "objects_no_required_attr",
          severity: "error",
          message: `Object type "${objType.typeName}" must have at least one required attribute`,
          section: "objects",
        });
      }

      // iCML primitive mapping present
      if (!objType.iCMLPrimaryMapping) {
        results.push({
          rule: "objects_missing_icml_mapping",
          severity: "error",
          message: `Object type "${objType.typeName}" must specify primary iCML primitive`,
          section: "objects",
        });
      }

      // At least one worked example
      if (!objType.workedExamples || objType.workedExamples.length === 0) {
        results.push({
          rule: "objects_no_worked_example",
          severity: "error",
          message: `Object type "${objType.typeName}" must include at least one worked example`,
          section: "objects",
        });
      }

      // Extraction guidance present
      if (!objType.extractionGuidance) {
        results.push({
          rule: "objects_no_extraction_guidance",
          severity: "error",
          message: `Object type "${objType.typeName}" must include extraction guidance`,
          section: "objects",
        });
      }

      // Rubric reference should point to existing rubric in Section 3
      if (objType.scoring.rubricReference && ctx.sections.assessment_criteria) {
        const rubricName = objType.scoring.rubricReference
          .replace("@assessment_criteria.", "");
        const rubricExists = ctx.sections.assessment_criteria.rubrics.some(
          (r) =>
            r.name.toLowerCase().replace(/\s+/g, "_") ===
            rubricName.toLowerCase().replace(/\s+/g, "_")
        );
        if (!rubricExists) {
          results.push({
            rule: "objects_invalid_rubric_ref",
            severity: "error",
            message: `Object type "${objType.typeName}" references rubric "${objType.scoring.rubricReference}" which doesn't exist in Section 3`,
            section: "objects",
          });
        }
      }

      // Definition references should point to existing definitions
      for (const attr of objType.attributes) {
        if (
          attr.definitionReference &&
          ctx.sections.definitions
        ) {
          const termName = attr.definitionReference
            .replace("@definitions.", "");
          const defExists = ctx.sections.definitions.definitions.some(
            (d) =>
              d.term.toLowerCase().replace(/\s+/g, "_") ===
              termName.toLowerCase().replace(/\s+/g, "_")
          );
          if (!defExists) {
            results.push({
              rule: "objects_invalid_def_ref",
              severity: "warning",
              message: `Attribute "${attr.name}" references definition "${attr.definitionReference}" which doesn't exist in Section 1`,
              section: "objects",
            });
          }
        }
      }
    }
  }

  return results;
}

/** Validate a single section's content against its Zod schema */
export function validateSectionContent(
  sectionKey: string,
  content: unknown
): { valid: boolean; errors: string[] } {
  const schema = SECTION_SCHEMAS[sectionKey as SectionKey];
  if (!schema) {
    return { valid: false, errors: [`Unknown section key: ${sectionKey}`] };
  }

  const result = schema.safeParse(content);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { valid: false, errors };
}

/** Check if a CTX has the minimum sections required for Mode 2 */
export function validateMode2Readiness(ctx: CTXFile): {
  ready: boolean;
  missing: string[];
} {
  const requiredKeys: StandardSectionKey[] = [
    "definitions",
    "assessment_criteria",
    "pitfalls",
    "tacit",
    "objects",
  ];

  const missing = requiredKeys.filter(
    (key) => !ctx.sections[key as keyof typeof ctx.sections]
  );

  return { ready: missing.length === 0, missing };
}

/** Get validation summary counts */
export function getValidationSummary(results: ValidationResult[]): {
  errors: number;
  warnings: number;
  total: number;
} {
  const errors = results.filter((r) => r.severity === "error").length;
  const warnings = results.filter((r) => r.severity === "warning").length;
  return { errors, warnings, total: results.length };
}
