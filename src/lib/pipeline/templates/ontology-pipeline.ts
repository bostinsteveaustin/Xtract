import type { PipelineTemplate } from "@/types/pipeline";

export const ONTOLOGY_PIPELINE: PipelineTemplate = {
  templateId: "ontology-v1",
  name: "Ontology Pipeline",
  version: "1.0.0",
  description:
    "Generate a version-one OWL ontology from structured API documentation and SME tacit knowledge using Xtract methodology and .ctx context layer.",
  defaultMode: "guided",
  steps: [
    {
      stepId: "configuration",
      stepNumber: 1,
      label: "Step 1 of 5",
      title: "Configuration",
      description:
        "Upload structured input documents and SME transcript. Configure pipeline parameters.",
      interactionTypes: ["file-drop-zone", "pipeline-config"],
      config: {
        fileInputs: [
          {
            id: "structured-input",
            label: "Structured Input (OpenAPI JSON)",
            accept: ".json",
            required: true,
          },
          {
            id: "sme-transcript",
            label: "SME Transcript",
            accept: ".txt,.md",
            required: true,
          },
        ],
        configFields: [
          {
            key: "upperOntology",
            label: "Upper Ontology",
            type: "select",
            options: [
              { value: "gist-core", label: "GIST Core (default)" },
              { value: "bfo", label: "BFO" },
              { value: "dolce", label: "DOLCE" },
            ],
            defaultValue: "gist-core",
          },
          {
            key: "namespace",
            label: "Namespace IRI",
            type: "text",
            placeholder:
              "https://ontology.nationalhighways.co.uk/ctrack#",
          },
          {
            key: "ontologyTitle",
            label: "Ontology Title",
            type: "text",
            placeholder: "C-Track Fleet Management Ontology",
          },
        ],
      },
    },
    {
      stepId: "ingest-parse",
      stepNumber: 2,
      label: "Step 2 of 5",
      title: "Ingest & Parse",
      description:
        "Extract candidate ontology structure from structured input documents.",
      interactionTypes: ["pipeline-log", "metric-cards"],
      executionEndpoint: "/api/ontology/parse",
      config: {
        metrics: [
          { key: "classes", label: "Classes" },
          { key: "objectProperties", label: "Object Properties" },
          { key: "dataProperties", label: "Data Properties" },
          { key: "inferred", label: "Inferred", highlight: true },
        ],
      },
    },
    {
      stepId: "ctx-production",
      stepNumber: 3,
      label: "Step 3 of 5",
      title: "CTX Production",
      description:
        "Extract tacit knowledge from SME transcript and build context file.",
      interactionTypes: ["pipeline-log", "context-chat"],
      executionEndpoint: "/api/ontology/ctx",
      config: {
        chatPlaceholder: "Add additional context or corrections...",
        downloadLabel: "Download .ctx file",
      },
    },
    {
      stepId: "ontology-generation",
      stepNumber: 4,
      label: "Step 4 of 5",
      title: "Ontology Generation & Flag Review",
      description:
        "Generate Turtle file aligned to upper ontology. Review ambiguity flags.",
      interactionTypes: ["pipeline-log", "flag-review"],
      executionEndpoint: "/api/ontology/generate",
      config: {
        requireAllFlagsResolved: true,
      },
    },
    {
      stepId: "export-validate",
      stepNumber: 5,
      label: "Step 5 of 5",
      title: "Export & Validate",
      description:
        "Download outputs and confirm benchmark query validation.",
      interactionTypes: ["metric-cards", "validation-table", "download-grid"],
      executionEndpoint: "/api/ontology/export",
      config: {
        metrics: [
          { key: "classes", label: "Classes" },
          { key: "triples", label: "Triples" },
          { key: "flagsRaised", label: "Flags Raised" },
          { key: "queriesPassing", label: "Queries Passing", highlight: true },
        ],
        downloads: [
          { key: "ontology", name: "ontology.ttl", format: "ttl" },
          { key: "glossary", name: "glossary.csv", format: "csv" },
          { key: "classes", name: "classes.csv", format: "csv" },
          { key: "objectProps", name: "object_properties.csv", format: "csv" },
          { key: "dataProps", name: "data_properties.csv", format: "csv" },
          { key: "runSummary", name: "run_summary.json", format: "json" },
        ],
      },
    },
  ],
};
