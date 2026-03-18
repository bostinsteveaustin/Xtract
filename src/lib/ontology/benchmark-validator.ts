import type { BenchmarkQuery } from "@/types/pipeline";

/**
 * Run structural validation benchmarks against a generated Turtle ontology.
 * These are domain-agnostic — they check for well-formedness rather than
 * specific entity names.
 */
export function runBenchmarks(turtle: string): BenchmarkQuery[] {
  const results: BenchmarkQuery[] = [];

  // 1. Has @prefix declarations
  const prefixes = turtle.match(/@prefix\s+\w*:\s+<[^>]+>/g) ?? [];
  const hasOwl = prefixes.some((p) => p.includes("owl"));
  const hasRdf = prefixes.some((p) => p.includes("rdf"));
  const hasRdfs = prefixes.some((p) => p.includes("rdfs"));
  const hasSkos = prefixes.some((p) => p.includes("skos"));
  const foundPrefixes = [
    ...(hasOwl ? ["owl"] : []),
    ...(hasRdf ? ["rdf"] : []),
    ...(hasRdfs ? ["rdfs"] : []),
    ...(hasSkos ? ["skos"] : []),
  ];
  results.push({
    name: "Standard prefixes declared",
    description: "owl, rdf, rdfs, skos namespace prefixes present",
    expected: ["owl", "rdf", "rdfs", "skos"],
    actual: foundPrefixes,
    passed: hasOwl && hasRdf && hasRdfs && hasSkos,
  });

  // 2. Has owl:Ontology declaration
  const hasOntologyDecl = /a\s+owl:Ontology/.test(turtle);
  results.push({
    name: "Ontology declaration",
    description: "Contains owl:Ontology header with metadata",
    expected: ["owl:Ontology"],
    actual: hasOntologyDecl ? ["owl:Ontology"] : [],
    passed: hasOntologyDecl,
  });

  // 3. Has at least one owl:Class
  const classMatches = turtle.match(/a\s+owl:Class/g) ?? [];
  results.push({
    name: "Classes defined",
    description: `At least 1 owl:Class defined (found ${classMatches.length})`,
    expected: ["≥1 owl:Class"],
    actual: classMatches.length > 0 ? [`${classMatches.length} classes`] : [],
    passed: classMatches.length > 0,
  });

  // 4. Has at least one property (object or data)
  const objPropMatches = turtle.match(/a\s+owl:ObjectProperty/g) ?? [];
  const dataPropMatches = turtle.match(/a\s+owl:DatatypeProperty/g) ?? [];
  const totalProps = objPropMatches.length + dataPropMatches.length;
  results.push({
    name: "Properties defined",
    description: `At least 1 property defined (found ${objPropMatches.length} object, ${dataPropMatches.length} data)`,
    expected: ["≥1 property"],
    actual: totalProps > 0 ? [`${totalProps} properties`] : [],
    passed: totalProps > 0,
  });

  // 5. SKOS annotations present
  const hasPrefLabel = /skos:prefLabel/.test(turtle);
  const hasDefinition = /skos:definition/.test(turtle);
  const foundAnnotations = [
    ...(hasPrefLabel ? ["skos:prefLabel"] : []),
    ...(hasDefinition ? ["skos:definition"] : []),
  ];
  results.push({
    name: "SKOS annotations",
    description: "Classes/properties have skos:prefLabel and skos:definition",
    expected: ["skos:prefLabel", "skos:definition"],
    actual: foundAnnotations,
    passed: hasPrefLabel && hasDefinition,
  });

  // 6. rdfs:subClassOf hierarchy
  const subClassMatches = turtle.match(/rdfs:subClassOf/g) ?? [];
  results.push({
    name: "Class hierarchy",
    description: `Classes linked via rdfs:subClassOf (found ${subClassMatches.length} declarations)`,
    expected: ["≥1 rdfs:subClassOf"],
    actual: subClassMatches.length > 0 ? [`${subClassMatches.length} subClassOf`] : [],
    passed: subClassMatches.length > 0,
  });

  // 7. Domain and range declarations on properties
  const hasDomain = /rdfs:domain/.test(turtle);
  const hasRange = /rdfs:range/.test(turtle);
  const foundDomainRange = [
    ...(hasDomain ? ["rdfs:domain"] : []),
    ...(hasRange ? ["rdfs:range"] : []),
  ];
  results.push({
    name: "Domain & range",
    description: "Properties specify rdfs:domain and rdfs:range",
    expected: ["rdfs:domain", "rdfs:range"],
    actual: foundDomainRange,
    passed: hasDomain && hasRange,
  });

  return results;
}
