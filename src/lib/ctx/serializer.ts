// CTX serialization — convert between structured JSON and CTX file format
// CTX files are Markdown + YAML front matter (CTX Spec v0.3)

import type { CTXFile, StandardSectionKey } from "@/types/ctx";
import { CTX_SECTIONS } from "./sections";

/** Serialize a CTX file object to the .ctx markdown+YAML format */
export function serializeCTX(ctx: CTXFile): string {
  const parts: string[] = [];

  // Layer 1: Front Matter (system-managed)
  parts.push("---");
  parts.push(`cortx_version: "${ctx.frontMatter.cortx_version}"`);
  parts.push(`context_type: ${ctx.frontMatter.context_type}`);
  parts.push(`context_id: "${ctx.frontMatter.context_id}"`);
  parts.push(`version: "${ctx.frontMatter.version}"`);
  parts.push(`status: ${ctx.frontMatter.status}`);
  parts.push("");
  parts.push(`title: "${ctx.frontMatter.title}"`);
  parts.push(`description: "${ctx.frontMatter.description}"`);
  parts.push("");
  parts.push("deployment:");
  parts.push(
    `  target_platforms: [${ctx.frontMatter.deployment.target_platforms.map((p) => `"${p}"`).join(", ")}]`
  );
  if (ctx.frontMatter.checksum) {
    parts.push("");
    parts.push(`checksum: "${ctx.frontMatter.checksum}"`);
  }
  parts.push("---");
  parts.push("");

  // Layer 2: Organisational Metadata (user-managed)
  parts.push(`domain: "${ctx.organisationalMetadata.domain}"`);
  if (ctx.organisationalMetadata.industry?.length) {
    parts.push(
      `industry: [${ctx.organisationalMetadata.industry.map((i) => `"${i}"`).join(", ")}]`
    );
  }
  parts.push(`author: "${ctx.organisationalMetadata.author}"`);
  if (ctx.organisationalMetadata.team) {
    parts.push(`team: "${ctx.organisationalMetadata.team}"`);
  }
  parts.push(`classification: ${ctx.organisationalMetadata.classification}`);
  parts.push("");

  // Visibility
  parts.push("visibility:");
  for (const [key, val] of Object.entries(ctx.organisationalMetadata.visibility)) {
    parts.push(`  ${key}: ${val}`);
  }
  parts.push("");

  // Content sections inventory
  parts.push("content_sections:");
  for (const [key, val] of Object.entries(
    ctx.organisationalMetadata.content_sections
  )) {
    parts.push(`  ${key}: ${val}`);
  }
  parts.push("");

  parts.push(
    `data_sensitivity: ${ctx.organisationalMetadata.data_sensitivity}`
  );
  parts.push("");
  parts.push("---");
  parts.push("");

  // Layer 3: Content Sections
  for (const sectionMeta of CTX_SECTIONS) {
    const content =
      ctx.sections[sectionMeta.key as keyof typeof ctx.sections];
    if (!content) continue;

    parts.push(`## ${sectionMeta.markdownHeader}`);
    parts.push("");
    // For now, serialize as JSON in a code block
    // Future: render proper markdown per section type
    parts.push(
      serializeSectionToMarkdown(sectionMeta.key, content)
    );
    parts.push("");
  }

  // Version History
  if (ctx.versionHistory.length > 0) {
    parts.push("## @version_history");
    parts.push("");
    parts.push("| Version | Date | Changes |");
    parts.push("|---------|------|---------|");
    for (const entry of ctx.versionHistory) {
      parts.push(`| ${entry.version} | ${entry.date} | ${entry.changes} |`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

/** Serialize a section's structured content to markdown */
function serializeSectionToMarkdown(
  sectionKey: string,
  content: unknown
): string {
  // Type-specific markdown rendering
  // This is a simplified version — can be enhanced per section type
  const c = content as Record<string, unknown>;

  switch (sectionKey) {
    case "definitions":
      return serializeDefinitions(c);
    case "pitfalls":
      return serializePitfalls(c);
    case "tacit":
      return serializeTacit(c);
    default:
      // Fallback: JSON in code block
      return "```json\n" + JSON.stringify(content, null, 2) + "\n```";
  }
}

function serializeDefinitions(content: Record<string, unknown>): string {
  const defs = (content as { definitions: Array<Record<string, unknown>> })
    .definitions;
  const parts: string[] = [];

  for (const def of defs) {
    parts.push(`### ${def.term}`);
    parts.push("");
    parts.push(`**In this context**: ${def.inThisContext}`);
    parts.push("");
    if (def.includes) parts.push(`**Includes**: ${def.includes}`);
    if (def.excludes) parts.push(`**Excludes**: ${def.excludes}`);
    parts.push("");
    parts.push(`**Test**: ${def.test}`);
    parts.push("");
    parts.push(`**Common Misuse**: ${def.commonMisuse}`);
    if (def.aiGuidance) {
      parts.push("");
      parts.push("<!-- @ai-guidance");
      parts.push(String(def.aiGuidance));
      parts.push("-->");
    }
    parts.push("");
  }

  return parts.join("\n");
}

function serializePitfalls(content: Record<string, unknown>): string {
  const pitfalls = (
    content as { pitfalls: Array<Record<string, unknown>> }
  ).pitfalls;
  const parts: string[] = [];

  for (const p of pitfalls) {
    parts.push(`### Pitfall: ${p.name}`);
    parts.push("");
    parts.push(`**What happens**: ${p.whatHappens}`);
    parts.push(`**Frequency**: ${p.frequency}`);
    parts.push(
      `**Early warning signs**: ${(p.earlyWarningSigns as string[]).join("; ")}`
    );
    parts.push(`**Root cause**: ${p.rootCause}`);
    parts.push(`**Prevention**: ${p.prevention}`);
    parts.push(`**Recovery**: ${p.recovery}`);
    if (p.aiGuidance) {
      parts.push("");
      parts.push("<!-- @ai-guidance");
      parts.push(String(p.aiGuidance));
      parts.push("-->");
    }
    parts.push("");
  }

  return parts.join("\n");
}

function serializeTacit(content: Record<string, unknown>): string {
  const tacit = content as {
    realisticExpectations?: Array<Record<string, string>>;
    practitionerQuestions?: string[];
    politicalDynamics?: string;
    validationTechniques?: string;
  };
  const parts: string[] = [];

  if (tacit.realisticExpectations?.length) {
    parts.push("### Realistic Expectations");
    parts.push("");
    parts.push("| What's Stated | What Actually Happens | Why |");
    parts.push("|---------------|----------------------|-----|");
    for (const gap of tacit.realisticExpectations) {
      parts.push(
        `| ${gap.whatIsStated} | ${gap.whatActuallyHappens} | ${gap.why} |`
      );
    }
    parts.push("");
  }

  if (tacit.practitionerQuestions?.length) {
    parts.push("### Questions Experienced Practitioners Ask");
    parts.push("");
    for (let i = 0; i < tacit.practitionerQuestions.length; i++) {
      parts.push(`${i + 1}. ${tacit.practitionerQuestions[i]}`);
    }
    parts.push("");
  }

  if (tacit.politicalDynamics) {
    parts.push("### Political Dynamics");
    parts.push("");
    parts.push(tacit.politicalDynamics);
    parts.push("");
  }

  if (tacit.validationTechniques) {
    parts.push("### Validation Techniques");
    parts.push("");
    parts.push(tacit.validationTechniques);
    parts.push("");
  }

  return parts.join("\n");
}

/** Export a CTX file as JSON */
export function serializeCTXToJSON(ctx: CTXFile): string {
  return JSON.stringify(ctx, null, 2);
}
