import type { LogEntry } from "@/types/pipeline";

interface CandidateClass {
  name: string;
  source: "explicit" | "inferred";
  sourceSchema?: string;
  properties: string[];
  description?: string;
}

interface CandidateProperty {
  name: string;
  type: "object" | "data";
  domain?: string;
  range?: string;
  sourceField?: string;
}

export interface ParseResult {
  candidates: {
    classes: CandidateClass[];
    objectProperties: CandidateProperty[];
    dataProperties: CandidateProperty[];
    inferred: CandidateClass[];
    gaps: string[];
  };
  metrics: {
    classes: number;
    objectProperties: number;
    dataProperties: number;
    inferred: number;
  };
  logEntries: LogEntry[];
}

// Patterns that suggest an inferred entity (e.g. FleetNumber → Fleet)
const INFERRED_PATTERNS = [
  { suffix: "Number", entity: (base: string) => base },
  { suffix: "Id", entity: (base: string) => base },
  { suffix: "Count", entity: (base: string) => base },
  { suffix: "Type", entity: (base: string) => base },
];

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

export function parseOpenAPI(content: string): ParseResult {
  const log: LogEntry[] = [];
  const classes: CandidateClass[] = [];
  const objectProperties: CandidateProperty[] = [];
  const dataProperties: CandidateProperty[] = [];
  const inferred: CandidateClass[] = [];
  const gaps: string[] = [];
  const inferredNames = new Set<string>();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    log.push({ timestamp: ts(), level: "error", message: "Failed to parse JSON", icon: "cross" });
    return { candidates: { classes, objectProperties, dataProperties, inferred, gaps }, metrics: { classes: 0, objectProperties: 0, dataProperties: 0, inferred: 0 }, logEntries: log };
  }

  log.push({ timestamp: ts(), level: "info", message: "Parsing OpenAPI document...", icon: "check" });

  // Extract schemas
  const schemas =
    (parsed as Record<string, unknown>).components &&
    ((parsed as Record<string, unknown>).components as Record<string, unknown>).schemas
      ? ((parsed as Record<string, unknown>).components as Record<string, unknown>).schemas as Record<string, unknown>
      : (parsed as Record<string, unknown>).definitions as Record<string, unknown> | undefined;

  if (!schemas) {
    log.push({ timestamp: ts(), level: "warning", message: "No schemas/definitions found — checking for top-level properties", icon: "flag" });
    // Try parsing as a flat object
    const keys = Object.keys(parsed);
    if (keys.length > 0) {
      classes.push({
        name: "RootDocument",
        source: "explicit",
        properties: keys,
      });
      for (const key of keys) {
        dataProperties.push({
          name: key,
          type: "data",
          domain: "RootDocument",
          range: "string",
          sourceField: key,
        });
      }
      log.push({ timestamp: ts(), level: "info", message: `Found ${keys.length} top-level properties`, icon: "check" });
    }
  } else {
    const schemaNames = Object.keys(schemas);
    log.push({ timestamp: ts(), level: "info", message: `Found ${schemaNames.length} schemas`, icon: "check" });

    for (const name of schemaNames) {
      const schema = schemas[name] as Record<string, unknown>;
      const props = schema.properties as Record<string, unknown> | undefined;
      const propNames = props ? Object.keys(props) : [];

      classes.push({
        name,
        source: "explicit",
        sourceSchema: name,
        properties: propNames,
        description: schema.description as string | undefined,
      });

      log.push({ timestamp: ts(), level: "info", message: `Schema: ${name} — ${propNames.length} properties`, icon: "check" });

      // Extract properties
      if (props) {
        for (const propName of propNames) {
          const propDef = props[propName] as Record<string, unknown>;
          const ref = propDef.$ref as string | undefined;
          const itemsRef = propDef.items && (propDef.items as Record<string, unknown>).$ref as string | undefined;

          if (ref || itemsRef) {
            // Object property — reference to another schema
            const targetRef = (ref ?? itemsRef) as string;
            const targetName = targetRef.split("/").pop() ?? targetRef;
            objectProperties.push({
              name: propName,
              type: "object",
              domain: name,
              range: targetName,
              sourceField: propName,
            });
          } else {
            // Data property
            dataProperties.push({
              name: propName,
              type: "data",
              domain: name,
              range: (propDef.type as string) ?? "string",
              sourceField: propName,
            });

            // Check for inferred entities
            for (const pattern of INFERRED_PATTERNS) {
              if (propName.endsWith(pattern.suffix) && propName.length > pattern.suffix.length) {
                const entityName = pattern.entity(
                  propName.slice(0, -pattern.suffix.length)
                );
                if (!schemaNames.includes(entityName) && !inferredNames.has(entityName)) {
                  inferredNames.add(entityName);
                  inferred.push({
                    name: entityName,
                    source: "inferred",
                    sourceSchema: name,
                    properties: [],
                    description: `Inferred from field ${propName} on ${name}`,
                  });
                  log.push({
                    timestamp: ts(),
                    level: "warning",
                    message: `Inferred entity: ${entityName} (from ${name}.${propName})`,
                    icon: "flag",
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Parse complete: ${classes.length} classes, ${objectProperties.length} object properties, ${dataProperties.length} data properties, ${inferred.length} inferred`,
    icon: "check",
  });

  return {
    candidates: { classes, objectProperties, dataProperties, inferred, gaps },
    metrics: {
      classes: classes.length,
      objectProperties: objectProperties.length,
      dataProperties: dataProperties.length,
      inferred: inferred.length,
    },
    logEntries: log,
  };
}
