// Parse Turtle string and generate CSV exports

interface CSVExportResult {
  files: {
    name: string;
    size: string;
    format: string;
    content: string;
  }[];
}

interface TurtleEntity {
  iri: string;
  localName: string;
  prefLabel?: string;
  definition?: string;
  scopeNote?: string;
  altLabel?: string;
  parentClass?: string;
  domain?: string;
  range?: string;
  inverseOf?: string;
  characteristics?: string;
}

function extractEntities(turtle: string, typePattern: string): TurtleEntity[] {
  const entities: TurtleEntity[] = [];
  // Split on blank-line-separated blocks
  const blocks = turtle.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.includes(typePattern)) continue;

    const iriMatch = block.match(/^(\S+)\s/m);
    if (!iriMatch) continue;

    const iri = iriMatch[1];
    const localName = iri.includes(":") ? iri.split(":").pop() ?? iri : iri;

    const get = (pred: string): string | undefined => {
      const match = block.match(new RegExp(`${pred}\\s+"([^"]*)"`, "m"));
      return match?.[1];
    };
    const getIRI = (pred: string): string | undefined => {
      const match = block.match(new RegExp(`${pred}\\s+(\\S+)`, "m"));
      return match?.[1]?.replace(/\s*[;.]\s*$/, "");
    };

    entities.push({
      iri,
      localName,
      prefLabel: get("skos:prefLabel"),
      definition: get("skos:definition"),
      scopeNote: get("skos:scopeNote"),
      altLabel: get("skos:altLabel"),
      parentClass: getIRI("rdfs:subClassOf"),
      domain: getIRI("rdfs:domain"),
      range: getIRI("rdfs:range"),
      inverseOf: getIRI("owl:inverseOf"),
    });
  }

  return entities;
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => escape(v ?? "")).join(","));
  }
  return lines.join("\n");
}

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function generateCSVExports(turtle: string): CSVExportResult {
  const classes = extractEntities(turtle, "owl:Class");
  const objProps = extractEntities(turtle, "owl:ObjectProperty");
  const dataProps = extractEntities(turtle, "owl:DatatypeProperty");
  const allEntities = [...classes, ...objProps, ...dataProps];

  // Glossary
  const glossaryCSV = toCSV(
    ["IRI", "prefLabel", "definition", "scopeNote", "altLabel"],
    allEntities.map((e) => [
      e.iri,
      e.prefLabel ?? "",
      e.definition ?? "",
      e.scopeNote ?? "",
      e.altLabel ?? "",
    ])
  );

  // Classes
  const classesCSV = toCSV(
    ["IRI", "localName", "prefLabel", "definition", "parentClass"],
    classes.map((e) => [
      e.iri,
      e.localName,
      e.prefLabel ?? "",
      e.definition ?? "",
      e.parentClass ?? "",
    ])
  );

  // Object properties
  const objPropsCSV = toCSV(
    ["IRI", "localName", "prefLabel", "definition", "domain", "range", "inverseOf"],
    objProps.map((e) => [
      e.iri,
      e.localName,
      e.prefLabel ?? "",
      e.definition ?? "",
      e.domain ?? "",
      e.range ?? "",
      e.inverseOf ?? "",
    ])
  );

  // Data properties
  const dataPropsCSV = toCSV(
    ["IRI", "localName", "prefLabel", "definition", "domain", "range", "characteristics"],
    dataProps.map((e) => [
      e.iri,
      e.localName,
      e.prefLabel ?? "",
      e.definition ?? "",
      e.domain ?? "",
      e.range ?? "",
      e.characteristics ?? "",
    ])
  );

  return {
    files: [
      { name: "glossary.csv", size: formatSize(glossaryCSV), format: "csv", content: glossaryCSV },
      { name: "classes.csv", size: formatSize(classesCSV), format: "csv", content: classesCSV },
      { name: "object_properties.csv", size: formatSize(objPropsCSV), format: "csv", content: objPropsCSV },
      { name: "data_properties.csv", size: formatSize(dataPropsCSV), format: "csv", content: dataPropsCSV },
    ],
  };
}
