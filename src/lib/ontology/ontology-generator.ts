import { generateText } from "ai";
import { extractionModel } from "@/lib/ai/client";
import type { LogEntry, PipelineFlag } from "@/types/pipeline";

interface GenerateInput {
  ctxContent: string;
  candidates: unknown;
  config: {
    upperOntology: string;
    namespace: string;
    ontologyTitle: string;
  };
}

export interface MappingResult {
  mappingText: string;
  logEntries: LogEntry[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface TurtleResult {
  turtle: string;
  flags: PipelineFlag[];
  metrics: {
    classes: number;
    objectProperties: number;
    dataProperties: number;
    triples: number;
  };
  logEntries: LogEntry[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Step 1 of 2: Map candidates to upper ontology classes with SKOS annotations.
 * Designed to complete within a single 60s serverless function invocation.
 */
export async function generateMapping(input: GenerateInput): Promise<MappingResult> {
  const log: LogEntry[] = [];
  const namespace = input.config.namespace || "https://ontology.example.org/domain#";

  log.push({ timestamp: ts(), level: "info", message: "Starting ontology generation...", icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Upper ontology: ${input.config.upperOntology}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Namespace: ${namespace}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: "Step 1/2: Mapping candidates to upper ontology...", icon: "check" });

  const mappingResult = await generateText({
    model: extractionModel,
    system: `You are an ontology architect. Map the candidate classes to their most appropriate parent class in ${input.config.upperOntology}. For each class, provide SKOS annotations (prefLabel, definition, scopeNote).

Output as JSON with format:
{
  "mappings": [
    {
      "className": "...",
      "parentIRI": "gist:Category or similar",
      "prefLabel": "...",
      "definition": "...",
      "scopeNote": "...",
      "altLabels": []
    }
  ]
}`,
    prompt: `Candidates:
${JSON.stringify(input.candidates, null, 2).slice(0, 12000)}

CTX context:
${input.ctxContent.slice(0, 8000)}

Map each candidate class to ${input.config.upperOntology} parent classes with full SKOS annotations enriched by the CTX tacit knowledge.`,
    maxOutputTokens: 6000,
  });

  const inTok = mappingResult.usage?.inputTokens ?? 0;
  const outTok = mappingResult.usage?.outputTokens ?? 0;

  log.push({ timestamp: ts(), level: "info", message: `Mapping complete — ${inTok.toLocaleString()} in / ${outTok.toLocaleString()} out`, icon: "check" });

  return {
    mappingText: mappingResult.text,
    logEntries: log,
    tokenUsage: { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok },
  };
}

/**
 * Step 2 of 2: Generate Turtle (.ttl) from mapping result + candidates + CTX.
 * Designed to complete within a single 60s serverless function invocation.
 */
export async function generateTurtle(input: GenerateInput & { mappingText: string }): Promise<TurtleResult> {
  const log: LogEntry[] = [];
  const namespace = input.config.namespace || "https://ontology.example.org/domain#";

  log.push({ timestamp: ts(), level: "info", message: "Step 2/2: Generating Turtle (.ttl)...", icon: "check" });

  const turtleResult = await generateText({
    model: extractionModel,
    system: `You are an OWL ontology generator. Generate a valid, comprehensive Turtle (.ttl) file from the provided mapping and candidate data.

Requirements:
- Include proper @prefix declarations (owl, rdf, rdfs, skos, xsd, gist, and the domain namespace)
- Generate owl:Ontology declaration with owl:versionInfo and rdfs:comment
- All classes with rdfs:subClassOf, skos:prefLabel, skos:definition, skos:scopeNote, rdfs:isDefinedBy
- All object properties with rdfs:domain, rdfs:range, skos:prefLabel, skos:definition, owl:inverseOf where applicable
- All data properties with rdfs:domain, rdfs:range (XSD types), skos:prefLabel, skos:definition
- Use the provided namespace for all domain entities

After the Turtle, add "---FLAGS---" followed by a JSON array of ambiguity flags:
Each flag: { "id": "FLAG-NNN", "type": "missing_taxonomy|contested_classification|absent_field|inferred_class|data_quality", "entity": "...", "description": "...", "source": "...", "suggestedResolution": "...", "requiresHumanInput": true/false }

Output format:
[Turtle content]
---FLAGS---
[JSON array of flags]`,
    prompt: `Upper ontology mappings:
${input.mappingText.slice(0, 8000)}

Full candidates:
${JSON.stringify(input.candidates, null, 2).slice(0, 8000)}

CTX context:
${input.ctxContent.slice(0, 6000)}

Namespace: ${namespace}
Ontology title: ${input.config.ontologyTitle || "Domain Ontology"}

Generate a complete, valid Turtle file with full SKOS annotations. Then list ambiguity flags for anything requiring human review.`,
    maxOutputTokens: 12000,
  });

  const inTok = turtleResult.usage?.inputTokens ?? 0;
  const outTok = turtleResult.usage?.outputTokens ?? 0;

  // Parse turtle and flags
  const fullText = turtleResult.text;
  const flagsSeparator = fullText.indexOf("---FLAGS---");
  const turtle = flagsSeparator > -1 ? fullText.slice(0, flagsSeparator).trim() : fullText.trim();
  const flagsJson = flagsSeparator > -1 ? fullText.slice(flagsSeparator + 11).trim() : "[]";

  let flags: PipelineFlag[] = [];
  try {
    const rawFlags = JSON.parse(flagsJson);
    flags = (rawFlags as Record<string, unknown>[]).map((f) => ({
      id: (f.id as string) ?? `FLAG-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      type: (f.type as PipelineFlag["type"]) ?? "data_quality",
      entity: (f.entity as string) ?? "",
      description: (f.description as string) ?? "",
      source: (f.source as string) ?? "",
      suggestedResolution: (f.suggestedResolution as string) ?? "",
      resolution: "pending" as const,
      requiresHumanInput: (f.requiresHumanInput as boolean) ?? false,
    }));
  } catch {
    log.push({ timestamp: ts(), level: "warning", message: "Could not parse flags from generation output", icon: "flag" });
  }

  // Count metrics from turtle
  const classCount = (turtle.match(/a\s+owl:Class/g) ?? []).length;
  const objPropCount = (turtle.match(/a\s+owl:ObjectProperty/g) ?? []).length;
  const dataPropCount = (turtle.match(/a\s+owl:DatatypeProperty/g) ?? []).length;
  const tripleCount = turtle.split(".\n").length;

  log.push({ timestamp: ts(), level: "info", message: `Generated: ${classCount} classes, ${objPropCount} object properties, ${dataPropCount} data properties`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Estimated triples: ${tripleCount}`, icon: "check" });

  if (flags.length > 0) {
    log.push({ timestamp: ts(), level: "warning", message: `${flags.length} ambiguity flags raised — review required`, icon: "flag" });
    for (const flag of flags) {
      log.push({ timestamp: ts(), level: "warning", message: `${flag.id}: ${flag.description}`, icon: "flag" });
    }
  }

  const tokenUsage = { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok };
  log.push({ timestamp: ts(), level: "info", message: `Turtle tokens: ${inTok.toLocaleString()} in / ${outTok.toLocaleString()} out`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: "Ontology generation complete", icon: "check" });

  return {
    turtle,
    flags,
    metrics: {
      classes: classCount,
      objectProperties: objPropCount,
      dataProperties: dataPropCount,
      triples: tripleCount,
    },
    logEntries: log,
    tokenUsage,
  };
}

/**
 * @deprecated Use generateMapping() + generateTurtle() separately for better timeout resilience.
 * Kept for backward compatibility.
 */
export async function generateOntology(input: GenerateInput) {
  const mapping = await generateMapping(input);
  const turtle = await generateTurtle({ ...input, mappingText: mapping.mappingText });
  return {
    turtle: turtle.turtle,
    flags: turtle.flags,
    metrics: turtle.metrics,
    logEntries: [...mapping.logEntries, ...turtle.logEntries],
    tokenUsage: {
      promptTokens: mapping.tokenUsage.promptTokens + turtle.tokenUsage.promptTokens,
      completionTokens: mapping.tokenUsage.completionTokens + turtle.tokenUsage.completionTokens,
      totalTokens: mapping.tokenUsage.totalTokens + turtle.tokenUsage.totalTokens,
    },
  };
}
